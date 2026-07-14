"""
ShelfSense — live shelf inventory + autonomous restock agent dashboard.

Pipeline:  Scan (YOLO+ByteTrack) -> Search (Tavily) -> Verify (Playwright scrape)
           -> Decide (Groq comparison agent)

Run with:  streamlit run app.py
"""

import json
import os
import re
import tempfile

import streamlit as st
from dotenv import load_dotenv

from theme import inject_global_css, processing_banner
from detection import run_tracking, inventory_count, get_video_frame_count
from model import extract_price, extract_delivery
from tools.tools import search_restock, scrape_url
from agents.comparing import comparing_agent

load_dotenv()

st.set_page_config(
    page_title="ShelfSense — Restock Agent",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# GLOBAL_CSS / inject_global_css / processing_banner now live in theme.py so
# every page in pages/ shares the exact same visual system. See theme.py.
# The block that used to be here has moved there verbatim.
def render_stepper(active_index: int):
    """active_index: -1 = none started, 0..3 = which stage is currently active, 4 = all done."""
    labels = ["Scan", "Search", "Verify", "Decide"]
    parts = []
    for i, label in enumerate(labels):
        state = "done" if i < active_index else ("active" if i == active_index else "")
        parts.append(
            f'<div class="step {state}"><div class="step-dot">{i+1}</div>'
            f'<div class="step-label">{label}</div></div>'
        )
        if i < len(labels) - 1:
            parts.append('<div class="step-line"></div>')
    st.markdown(f'<div class="stepper">{"".join(parts)}</div>', unsafe_allow_html=True)


def render_shelf_grid(inventory: dict, threshold: int):
    items = {k: v for k, v in inventory.items() if k != "grand_total"}
    if not items:
        st.markdown('<div class="empty-state">No inventory data yet.</div>', unsafe_allow_html=True)
        return
    max_count = max(items.values()) or 1
    tiles = []
    for name, count in sorted(items.items(), key=lambda x: x[1]):
        pct = max(6, int((count / max_count) * 100))
        if count < threshold * 0.5:
            status_class, status_text = "critical", "CRITICAL"
        elif count < threshold:
            status_class, status_text = "low", "LOW STOCK"
        else:
            status_class, status_text = "ok", "IN STOCK"
        tiles.append(
            f'<div class="shelf-tile {status_class}">'
            f'<div class="tile-label">{name.replace("_"," ")}</div>'
            f'<div class="tile-count">{count}</div>'
            f'<div class="tile-bar"><div class="tile-fill" style="width:{pct}%"></div></div>'
            f'<div class="tile-status">{status_text}</div></div>'
        )
    st.markdown(f'<div class="shelf-grid">{"".join(tiles)}</div>', unsafe_allow_html=True)


def parse_price_value(price_str: str):
    if not price_str:
        return None
    match = re.search(r'₹\s?([\d,]+(?:\.\d{1,2})?)', price_str)
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", ""))
    except ValueError:
        return None


def parse_markdown_table(md_text: str):
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


def render_tickets(rows: list):
    if not rows:
        return
    best_per_product = {}
    for r in rows:
        product = r.get("Product Name", "unknown")
        price_val = parse_price_value(r.get("Price", ""))
        if price_val is None:
            continue
        if product not in best_per_product or price_val < best_per_product[product]:
            best_per_product[product] = price_val

    cols = st.columns(min(3, max(1, len(rows))))
    for i, r in enumerate(rows):
        product = r.get("Product Name", "—")
        platform = r.get("E-commerce Platform", "—")
        price = r.get("Price", "—")
        delivery = r.get("Delivery Date", "—")
        url = r.get("Product URL", "")
        price_val = parse_price_value(price)
        is_best = price_val is not None and best_per_product.get(product) == price_val
        badge = '<div class="ticket-badge">🏆 BEST DEAL</div>' if is_best else ""
        link = f'<a class="ticket-link" href="{url}" target="_blank">View listing →</a>' if url else ""
        with cols[i % len(cols)]:
            st.markdown(
                f'<div class="ticket {"best" if is_best else ""}">{badge}'
                f'<div class="ticket-product">{product}</div>'
                f'<div class="ticket-platform">{platform}</div>'
                f'<div class="ticket-divider"></div>'
                f'<div class="ticket-row"><span>Price</span><span>{price}</span></div>'
                f'<div class="ticket-row"><span>Delivery</span><span>{delivery}</span></div>'
                f'{link}</div>',
                unsafe_allow_html=True,
            )


# --------------------------------------------------------------------------
# APP
# --------------------------------------------------------------------------

inject_global_css()

st.markdown(
    '<div class="ss-header"><span class="ss-bolt">⚡</span><h1 class="ss-title">ShelfSense</h1>'
    '<span class="ss-tag">AUTONOMOUS RESTOCK AGENT</span></div>'
    '<div class="ss-sub">YOLO + ByteTrack shelf counts, low-stock detection, and an agent '
    'that finds &amp; compares restock options across trusted suppliers — end to end.</div>',
    unsafe_allow_html=True,
)

for key, default in [("inventory", None), ("stage", -1), ("final_rows", []), ("raw_output", "")]:
    if key not in st.session_state:
        st.session_state[key] = default

# ---------------- Sidebar ----------------
with st.sidebar:
    st.markdown('<h3 class="display-font">1. Shelf Video</h3>', unsafe_allow_html=True)
    video_file = st.file_uploader("Shelf video", type=["mp4", "mov", "avi", "mkv"], label_visibility="collapsed")
    weights_path = st.text_input("YOLO weights path", value="final_best.pt",
                                  help="Path to your trained .pt file, must be on this machine.")
    conf = st.slider("Detection confidence", 0.1, 0.95, 0.75, step=0.05)
    run_detection = st.button("▶ Run Detection", use_container_width=True, disabled=video_file is None)

    st.divider()
    st.markdown('<h3 class="display-font">2. Or Skip Detection</h3>', unsafe_allow_html=True)
    st.caption("Load pre-computed counts instead of running YOLO.")
    alt_source = st.radio(
        "alt source", ["None", "Sample data (demo)", "Upload inventory JSON"],
        label_visibility="collapsed",
    )
    if alt_source == "Upload inventory JSON":
        uploaded = st.file_uploader("Inventory JSON", type=["json"], label_visibility="collapsed", key="inv_json")
        if uploaded:
            try:
                st.session_state.inventory = json.load(uploaded)
                st.session_state.stage = 1
            except json.JSONDecodeError:
                st.error("That file isn't valid JSON.")
    elif alt_source == "Sample data (demo)":
        with open("sample_inventory.json") as f:
            st.session_state.inventory = json.load(f)
        st.session_state.stage = 1

    st.divider()
    st.markdown('<h3 class="display-font">Settings</h3>', unsafe_allow_html=True)
    threshold = st.slider("Low-stock threshold", 10, 150, 70, step=5)

    st.divider()
    st.markdown('<h3 class="display-font">Agent Status</h3>', unsafe_allow_html=True)
    groq_ok = bool(os.getenv("GROQ_API_KEY"))
    tavily_ok = bool(os.getenv("TAVILY_API_KEY"))
    st.markdown(f"{'🟢' if groq_ok else '🔴'} GROQ_API_KEY")
    st.markdown(f"{'🟢' if tavily_ok else '🔴'} TAVILY_API_KEY")
    if not (groq_ok and tavily_ok):
        st.caption("Missing keys will make the pipeline fail at that stage — add them to your .env file.")

# ---------------- Run YOLO detection ----------------
if run_detection and video_file is not None:
    st.session_state.stage = 0
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(video_file.name)[1]) as tmp:
        tmp.write(video_file.read())
        video_path = tmp.name

    total_frames = get_video_frame_count(video_path)
    detect_placeholder = st.empty()
    with detect_placeholder.container():
        st.markdown(
            processing_banner(
                "📦", "Scanning the shelf...",
                ["Counting every can & carton", "Teaching pixels to count stock",
                 "Chasing SKUs frame by frame", "Almost got your shelf mapped"],
            ),
            unsafe_allow_html=True,
        )
        progress_bar = st.progress(0, text="Starting detection...")

    def update_progress(frame_idx):
        if total_frames:
            pct = min(1.0, frame_idx / total_frames)
            progress_bar.progress(pct, text=f"Processing frame {frame_idx}/{total_frames}")
        else:
            progress_bar.progress(0, text=f"Processing frame {frame_idx}")

    try:
        unique_objects = run_tracking(video_path, weights_path=weights_path, conf=conf,
                                       progress_callback=update_progress)
        st.session_state.inventory = inventory_count(unique_objects)
        st.session_state.stage = 1
    except Exception as e:
        st.error(f"Detection failed: {e}")
    finally:
        detect_placeholder.empty()
        os.unlink(video_path)

render_stepper(st.session_state.stage)

if st.session_state.inventory is None:
    st.markdown(
        '<div class="empty-state">🎥 Upload a shelf video and hit <b>Run Detection</b>, '
        'or load sample/JSON data from the sidebar to get started.</div>',
        unsafe_allow_html=True,
    )
    st.stop()

inventory = st.session_state.inventory

# ---------------- Shelf overview ----------------
st.markdown('<h3 class="display-font">📊 Shelf Overview</h3>', unsafe_allow_html=True)
m1, m2, m3 = st.columns(3)
low_stock = {k: v for k, v in inventory.items() if k != "grand_total" and v < threshold}
m1.metric("Total units on shelf", inventory.get("grand_total", sum(v for k, v in inventory.items() if k != "grand_total")))
m2.metric("SKUs tracked", len([k for k in inventory if k != "grand_total"]))
m3.metric("Low-stock SKUs", len(low_stock))

render_shelf_grid(inventory, threshold)

st.markdown("<br>", unsafe_allow_html=True)

# ---------------- Restock pipeline ----------------
st.markdown('<h3 class="display-font">🤖 Restock Pipeline</h3>', unsafe_allow_html=True)

if not low_stock:
    st.markdown(
        '<div class="empty-state">✅ All SKUs are above the threshold — nothing to restock right now.</div>',
        unsafe_allow_html=True,
    )
    st.stop()

st.caption(f"{len(low_stock)} product(s) below threshold: " + ", ".join(k.replace("_", " ") for k in low_stock))

run_pipeline = st.button("▶ Run Restock Pipeline", use_container_width=False)

if run_pipeline:
    st.session_state.final_rows = []
    st.session_state.raw_output = ""

    # ---- Stage 1: SEARCH ----
    st.session_state.stage = 1
    render_stepper(st.session_state.stage)

    with st.status("🔍 Searching trusted suppliers (Tavily)...", expanded=True) as status:
        st.markdown(
            processing_banner("🛰️", "Scouting the internet for restock deals...",
                               ["Pinging trusted suppliers", "Sniffing out bulk deals",
                                "Cross-checking marketplaces", "Filtering the noise out"]),
            unsafe_allow_html=True,
        )
        try:
            search_results = search_restock.invoke({"stock": inventory, "threshold": threshold})
        except Exception as e:
            status.update(label=f"Search failed: {e}", state="error")
            st.stop()
        if not search_results:
            status.update(label="No supplier listings found.", state="error")
            st.stop()
        st.write(f"Found {len(search_results)} listing(s) across trusted domains.")
        for r in search_results:
            st.write(f"— **{r['product'].replace('_',' ')}**: {r['title']}")
        status.update(label=f"✅ Search complete — {len(search_results)} listings found", state="complete")

    # ---- Stage 2: VERIFY (scrape + extract, live per item) ----
    st.session_state.stage = 2
    render_stepper(st.session_state.stage)

    result_for_agent = []
    for item in search_results:
        site = item["url"].split("/")[2] if "://" in item["url"] else item["url"]
        with st.status(f"🌐 Verifying **{item['product'].replace('_',' ')}** @ {site}", expanded=False) as s:
            st.markdown(
                processing_banner("🕵️", f"Opening a real browser on {site}...",
                                   ["Loading the product page", "Reading the price tag",
                                    "Checking delivery estimate", "Double-checking the numbers"]),
                unsafe_allow_html=True,
            )
            try:
                scraped = scrape_url.invoke({"url": item["url"]})
            except Exception as e:
                s.update(label=f"Failed to scrape {site}: {e}", state="error")
                continue
            price = extract_price(scraped)
            delivery = extract_delivery(scraped)
            st.write(f"Price: `{price}`")
            st.write(f"Delivery: `{delivery}`")
            s.update(label=f"✅ {site} — {price}", state="complete")
        result_for_agent.append({
            "product": item["product"],
            "site": site,
            "price": price,
            "delivery": delivery,
            "url": item["url"],
        })

    # ---- Stage 3: DECIDE (comparing agent) ----
    st.session_state.stage = 3
    render_stepper(st.session_state.stage)

    with st.status("🧠 Comparing options across suppliers...", expanded=True) as status:
        st.markdown(
            processing_banner("🧠", "AI agent is weighing the options...",
                               ["Comparing prices side by side", "Factoring in delivery time",
                                "Ranking the best deals", "Writing up the verdict"]),
            unsafe_allow_html=True,
        )
        try:
            output = comparing_agent(result_for_agent)
        except Exception as e:
            status.update(label=f"Comparison agent failed: {e}", state="error")
            st.stop()
        status.update(label="✅ Comparison complete", state="complete")

    st.session_state.stage = 4
    st.session_state.raw_output = output
    st.session_state.final_rows = parse_markdown_table(output)
    render_stepper(st.session_state.stage)

# ---------------- Results ----------------
if st.session_state.final_rows or st.session_state.raw_output:
    st.markdown(
        '<div class="celebrate"><span class="spark">✨</span> Restock plan ready '
        '<span class="spark">✨</span> <span class="spark">🎉</span></div>',
        unsafe_allow_html=True,
    )
    st.markdown('<h3 class="display-font">🏆 Restock Recommendations</h3>', unsafe_allow_html=True)
    if st.session_state.final_rows:
        render_tickets(st.session_state.final_rows)
        with st.expander("Raw agent output"):
            st.markdown(st.session_state.raw_output)
    else:
        st.markdown(st.session_state.raw_output)