"""
ShelfSense FastAPI Backend
Wraps all existing Python modules (detection.py, sales.py, chatbot.py,
agents/comparing.py, tools/tools.py) without modifying any of them.

Run with:
    uvicorn api:app --reload --port 8000
"""

import asyncio
import json
import os
import tempfile
from typing import Optional

from pathlib import Path
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Load .env relative to this file to handle being run from subdirectories
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

# ── existing modules (untouched) ──────────────────────────────────────────────
from detection import run_tracking, inventory_count, get_video_frame_count
from model import extract_price, extract_delivery
from sales import load_inventory_master, generate_sales_history, compute_metrics, apply_rules
from chatbot import ask_shelfsense, build_context
from agents.comparing import comparing_agent
from tools.tools import search_restock, scrape_url, async_run_restock_pipeline
# pyrefly: ignore [missing-import]
from langchain_groq import ChatGroq

app = FastAPI(title="ShelfSense API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory store (replaces Streamlit session_state) ────────────────────────
_store: dict = {
    "inventory": None,
    "chat_history": [],
    "sales_recommendations": None,
    "near_expiry_days": 14,
    "low_stock_days": 5,
    "trend_up_pct": 25,
    "video_analyzed": False,
}


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "groq_api_key": bool(os.getenv("GROQ_API_KEY")),
        "tavily_api_key": bool(os.getenv("TAVILY_API_KEY")),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# INVENTORY — Detection / Upload
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/detect/sample")
def load_sample():
    """Load sample_inventory.json as the current inventory."""
    with open("sample_inventory.json") as f:
        _store["inventory"] = json.load(f)
    return {"inventory": _store["inventory"]}


@app.post("/api/detect/upload-json")
async def upload_inventory_json(file: UploadFile = File(...)):
    """Accept a JSON inventory file upload."""
    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file.")
    _store["inventory"] = data
    return {"inventory": _store["inventory"]}


@app.post("/api/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    conf: float = 0.75,
    weights_path: str = "final_best.pt",
):
    """
    Upload a shelf video, run YOLO + ByteTrack, return inventory counts.
    This is synchronous and can take a while — for long videos consider
    using the SSE streaming endpoint /api/detect/video/stream instead.
    """
    suffix = os.path.splitext(file.filename or ".mp4")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        video_path = tmp.name

    try:
        unique_objects = await asyncio.to_thread(
            run_tracking, video_path, weights_path, conf
        )
        inventory = inventory_count(unique_objects)
        _store["inventory"] = inventory
        _store["video_analyzed"] = True
        return {"inventory": inventory}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.unlink(video_path)
        except OSError:
            pass


@app.post("/api/detect/video/stream")
async def detect_video_stream(
    file: UploadFile = File(...),
    conf: float = 0.75,
    weights_path: str = "final_best.pt",
):
    """
    SSE endpoint: upload a shelf video and receive real-time frame-by-frame
    progress events.  Each event is a JSON object:
      {"type": "start",    "total_frames": N}
      {"type": "progress", "frame": N, "total": N, "pct": 0-100}
      {"type": "done",     "inventory": {...}}
      {"type": "error",    "detail": "..."}
    """
    suffix = os.path.splitext(file.filename or ".mp4")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        video_path = tmp.name

    # Count frames first (fast, uses cv2 header only)
    total_frames = await asyncio.to_thread(get_video_frame_count, video_path)

    # Queue bridges the sync progress_callback → async generator
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _progress(frame_idx: int):
        pct = round((frame_idx / total_frames * 100), 1) if total_frames > 0 else 0
        event = {"type": "progress", "frame": frame_idx, "total": total_frames, "pct": pct}
        loop.call_soon_threadsafe(queue.put_nowait, event)

    async def _run_detection():
        try:
            unique_objects = await asyncio.to_thread(
                run_tracking, video_path, weights_path, conf, _progress
            )
            inventory = inventory_count(unique_objects)
            _store["inventory"] = inventory
            _store["video_analyzed"] = True
            await queue.put({"type": "done", "inventory": inventory})
        except Exception as exc:
            await queue.put({"type": "error", "detail": str(exc)})
        finally:
            try:
                os.unlink(video_path)
            except OSError:
                pass

    async def _sse_generator():
        # Kick off detection in background
        detection_task = asyncio.create_task(_run_detection())

        # Emit start event
        yield f"data: {json.dumps({'type': 'start', 'total_frames': total_frames})}\n\n"

        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event["type"] in ("done", "error"):
                break

        await detection_task  # ensure any remaining cleanup completes

    return StreamingResponse(
        _sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )



@app.get("/api/inventory")
def get_inventory():
    """Return the current in-memory inventory."""
    if not _store.get("video_analyzed"):
        return {"inventory": None}
    return {"inventory": _store["inventory"]}


@app.get("/api/inventory/master")
def get_inventory_master():
    """Return the full contents of inventory.csv as JSON."""
    try:
        master = load_inventory_master()
        is_analyzed = _store.get("video_analyzed", False)
        live_inventory = _store.get("inventory") if is_analyzed else None
        for p in master:
            if live_inventory and p in live_inventory:
                master[p]["current_stock"] = live_inventory[p]
            else:
                master[p]["current_stock"] = 0
        return {"master": master}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# SALES / METRICS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/sales/metrics")
def get_sales_metrics():
    """
    Load inventory.csv, overlay live YOLO counts if available,
    compute 30-day simulated sales history + metrics + triggers.
    """
    try:
        master = load_inventory_master()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    is_analyzed = _store.get("video_analyzed", False)
    if not is_analyzed:
        return {
            "metrics": {},
            "history": {},
            "triggers": [],
            "discount_triggers": [],
            "restock_triggers": [],
            "baseline_products": [],
            "thresholds": {
                "near_expiry_days": _store["near_expiry_days"],
                "low_stock_days": _store["low_stock_days"],
                "trend_up_pct": _store["trend_up_pct"],
            },
        }

    live_inventory = _store.get("inventory")
    live_counts = None
    product_filter = []

    if live_inventory:
        detected = [p for p in live_inventory if p != "grand_total"]
        matched = [p for p in detected if p in master]
        if matched:
            live_counts = {p: live_inventory[p] for p in matched}
            product_filter = matched

    history = generate_sales_history(master, live_counts=live_counts, product_filter=product_filter)
    metrics = compute_metrics(history)
    triggers = apply_rules(
        metrics,
        near_expiry_days=_store["near_expiry_days"],
        low_stock_days=_store["low_stock_days"],
        trend_up_pct=_store["trend_up_pct"],
    )

    discount_triggers = [t for t in triggers if t["action"] == "discount"]
    restock_triggers = [t for t in triggers if t["action"] == "restock"]
    triggered_products = {t["product"] for t in triggers}
    baseline = [p for p in metrics if p not in triggered_products]

    return {
        "metrics": metrics,
        "history": {p: d["daily_sales"] for p, d in history.items()},
        "triggers": triggers,
        "discount_triggers": discount_triggers,
        "restock_triggers": restock_triggers,
        "baseline_products": baseline,
        "thresholds": {
            "near_expiry_days": _store["near_expiry_days"],
            "low_stock_days": _store["low_stock_days"],
            "trend_up_pct": _store["trend_up_pct"],
        },
    }


class ThresholdUpdate(BaseModel):
    near_expiry_days: Optional[int] = None
    low_stock_days: Optional[int] = None
    trend_up_pct: Optional[float] = None


@app.patch("/api/sales/thresholds")
def update_thresholds(body: ThresholdUpdate):
    """Update one or more rule thresholds."""
    if body.near_expiry_days is not None:
        _store["near_expiry_days"] = body.near_expiry_days
    if body.low_stock_days is not None:
        _store["low_stock_days"] = body.low_stock_days
    if body.trend_up_pct is not None:
        _store["trend_up_pct"] = body.trend_up_pct
    return {
        "near_expiry_days": _store["near_expiry_days"],
        "low_stock_days": _store["low_stock_days"],
        "trend_up_pct": _store["trend_up_pct"],
    }


class RecommendationRequest(BaseModel):
    triggers: list


@app.post("/api/sales/recommendations")
async def generate_recommendations(body: RecommendationRequest):
    """Call Groq to generate AI-written recommendation copy for each trigger."""
    if not body.triggers:
        return {"recommendations": []}

    def _fallback(t):
        name = t["product"].replace("_", " ").title()
        if t["action"] == "discount":
            return {**t, "headline": f"Discount {name}",
                    "detail": f"Expires in {t['expiry_days']}d, selling ~{t['avg_daily_sales_7d']}/day. {t['suggested_value']}."}
        return {**t, "headline": f"Restock {name}",
                "detail": f"Only {t['days_of_stock_left']}d of stock at ~{t['avg_daily_sales_7d']}/day ({t['trend_pct']:+.1f}%). {t['suggested_value']}."}

    model = ChatGroq(
        model="openai/gpt-oss-120b", temperature=0.6,
        api_key=os.getenv("GROQ_API_KEY"), max_tokens=1200,
    )
    payload = json.dumps([
        {"product": t["product"].replace("_", " "), "action": t["action"],
         "urgency": t["urgency"], "suggested_value": t["suggested_value"],
         "expiry_days": t["expiry_days"], "avg_daily_sales_7d": t["avg_daily_sales_7d"],
         "trend_pct": t["trend_pct"], "current_stock": t["current_stock"],
         "days_of_stock_left": t["days_of_stock_left"]}
        for t in body.triggers
    ], indent=2)

    prompt = (
        "You are a sharp, concise retail inventory assistant talking to a store manager.\n"
        "For each product write a punchy one-line headline and a single-sentence explanation.\n"
        "Input:\n" + payload + "\n"
        "Respond with ONLY a JSON array, one object per product, each with exactly these keys: "
        "\"product\", \"headline\" (max 6 words), \"detail\" (max 25 words)."
    )
    try:
        response = await asyncio.to_thread(model.invoke, prompt)
        text = response.content.strip()
        if text.startswith("```"):
            text = text.strip("`")
            text = text[text.find("["):text.rfind("]") + 1]
        parsed = json.loads(text)
        by_product = {item["product"]: item for item in parsed}
        enriched = []
        for t in body.triggers:
            name = t["product"].replace("_", " ")
            copy = by_product.get(name)
            if copy:
                enriched.append({**t, "headline": copy.get("headline", ""), "detail": copy.get("detail", "")})
            else:
                enriched.append(_fallback(t))
        _store["sales_recommendations"] = enriched
        return {"recommendations": enriched}
    except Exception as e:
        fallback = [_fallback(t) for t in body.triggers]
        _store["sales_recommendations"] = fallback
        return {"recommendations": fallback, "warning": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# CHATBOT
# ═══════════════════════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    message: str


@app.post("/api/chat")
async def chat(body: ChatRequest):
    """Send a message to the ShelfSense AI chatbot."""
    try:
        master = load_inventory_master()
    except Exception:
        master = {}

    is_analyzed = _store.get("video_analyzed", False)
    live = _store.get("inventory") if is_analyzed else None
    live_counts = None
    product_filter = []
    if live:
        detected = [p for p in live if p != "grand_total"]
        matched = [p for p in detected if p in master]
        if matched:
            live_counts = {p: live[p] for p in matched}
            product_filter = matched

    if not is_analyzed:
        history = {}
        metrics = {}
        triggers = []
    else:
        history = generate_sales_history(master, live_counts=live_counts, product_filter=product_filter)
        metrics = compute_metrics(history)
        triggers = apply_rules(
            metrics,
            near_expiry_days=_store["near_expiry_days"],
            low_stock_days=_store["low_stock_days"],
            trend_up_pct=_store["trend_up_pct"],
        )

    context = build_context(
        inventory=_store["inventory"] if is_analyzed else None,
        metrics=metrics,
        triggers=triggers,
        recommendations=_store["sales_recommendations"] if is_analyzed else [],
        thresholds={
            "near_expiry_days": _store["near_expiry_days"],
            "low_stock_days": _store["low_stock_days"],
            "trend_up_pct": _store["trend_up_pct"],
        },
    )

    _store["chat_history"].append({"role": "user", "content": body.message})

    try:
        result = await asyncio.to_thread(
            ask_shelfsense,
            body.message,
            _store["chat_history"][:-1],
            context,
        )
    except Exception as e:
        result = {"reply": f"Error: {e}", "action": None}

    _store["chat_history"].append({"role": "assistant", "content": result["reply"]})

    # Handle chatbot actions that affect store state
    action = result.get("action")
    if action:
        action_type = action.get("type")
        if action_type == "set_thresholds":
            for k in ("near_expiry_days", "low_stock_days", "trend_up_pct"):
                if k in action and action[k] is not None:
                    _store[k] = int(action[k])

    return {
        "reply": result["reply"],
        "action": result.get("action"),
        "chat_history": _store["chat_history"][-10:],
    }


@app.delete("/api/chat")
def clear_chat():
    _store["chat_history"] = []
    return {"status": "cleared"}


# ═══════════════════════════════════════════════════════════════════════════════
# RESTOCK PIPELINE (SSE streaming)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/restock/pipeline")
async def restock_pipeline(threshold: int = 70):
    """
    SSE stream that runs the full Restock Pipeline:
    Stage 1 (Search) → Stage 2 (Verify) → Stage 3 (Decide)
    Emits JSON events for each stage so the React UI can show live progress.
    """
    inventory = _store.get("inventory")
    if not inventory:
        raise HTTPException(status_code=400, detail="No inventory loaded. Run detection first.")

    async def event_stream():
        def emit(data: dict) -> str:
            return f"data: {json.dumps(data)}\n\n"

        # Queue to pass progress messages from callbacks to the SSE stream
        queue = asyncio.Queue()

        main_loop = asyncio.get_running_loop()

        def progress_callback(event_type: str, data: dict):
            if event_type == "scrape_start":
                url = data["url"]
                site = url.split("/")[2] if "://" in url else url
                product_display = data["product"].replace("_", " ")
                event = {
                    "stage": 2,
                    "status": "progress",
                    "message": f"Scraping {product_display} @ {site}"
                }
                main_loop.call_soon_threadsafe(queue.put_nowait, event)

        def thread_target():
            import sys
            if sys.platform == 'win32':
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            return asyncio.run(
                async_run_restock_pipeline(
                    stock=inventory,
                    threshold=threshold,
                    concurrency_limit=5,
                    timeout_ms=15000,
                    progress_callback=progress_callback
                )
            )

        # Start the pipeline task in a background thread executor
        pipeline_task = asyncio.create_task(asyncio.to_thread(thread_target))

        yield emit({"stage": 1, "status": "running", "message": "Searching trusted suppliers..."})
        yield emit({"stage": 2, "status": "running", "message": "Verifying prices with Playwright..."})

        # Stream progress events from the queue while the pipeline task runs
        while not pipeline_task.done() or not queue.empty():
            try:
                # Poll with timeout to avoid blocking indefinitely and check task status
                event = await asyncio.wait_for(queue.get(), timeout=0.1)
                yield emit(event)
                queue.task_done()
            except asyncio.TimeoutError:
                continue

        try:
            search_results, verified_results = await pipeline_task
        except Exception as e:
            yield emit({"stage": 1, "status": "error", "message": str(e)})
            return

        if not search_results:
            yield emit({"stage": 1, "status": "error", "message": "No supplier listings found."})
            return

        # Emit completion events for Stage 1 and Stage 2
        yield emit({
            "stage": 1,
            "status": "complete",
            "message": f"Found {len(search_results)} listing(s)",
            "data": search_results,
        })

        yield emit({
            "stage": 2,
            "status": "complete",
            "message": "All pages verified",
            "data": verified_results,
        })

        # ---- Stage 3: DECIDE ----
        yield emit({"stage": 3, "status": "running", "message": "AI comparing options..."})
        try:
            output = await asyncio.to_thread(comparing_agent, verified_results)
        except Exception as e:
            yield emit({"stage": 3, "status": "error", "message": str(e)})
            return

        # Parse the markdown table
        rows = _parse_md_table(output)
        yield emit({
            "stage": 3, "status": "complete",
            "message": "Comparison ready",
            "data": rows,
            "raw": output,
        })
        yield emit({"stage": 4, "status": "done", "message": "Pipeline complete"})

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                              headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


def _parse_md_table(md_text: str) -> list:
    lines = [l.strip() for l in md_text.splitlines() if l.strip().startswith("|")]
    if len(lines) < 2:
        return []
    header = [c.strip() for c in lines[0].strip("|").split("|")]
    rows = []
    for line in lines[1:]:
        if set(line.replace("|", "").strip()) <= {"-", " ", ":"}:
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) != len(header):
            continue
        rows.append(dict(zip(header, cells)))
    return rows


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
