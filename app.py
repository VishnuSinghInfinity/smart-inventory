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
import textwrap

import streamlit as st
import streamlit.components.v1 as components
from dotenv import load_dotenv

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

# --------------------------------------------------------------------------
# GLOBAL CSS — injected directly into the parent document <head> via a tiny
# script instead of through st.markdown(). st.markdown() runs raw HTML
# through a markdown-to-HTML pass first, which can mangle a large <style>
# block; going straight into the DOM via JS sidesteps that entirely and
# works regardless of Streamlit version / how markdown parses things.
# --------------------------------------------------------------------------

GLOBAL_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&family=Fredoka:wght@600;700&display=swap');

:root{
    --ink:#15131F; --muted:#6B6580; --line:#ECE7FB; --card:#FFFFFF;
    --violet:#8B5CF6; --violet-2:#A78BFA; --pink:#F472B6; --hot:#FB4D8B;
    --orange:#FB923C; --cyan:#22D3EE; --lime:#A3E635; --red:#F43F5E; --amber:#F59E0B;
    --glass:rgba(255,255,255,0.72);
}

html, body, [class*="css"]{ font-family:'Inter', sans-serif !important; }

.stApp{
    background:
        radial-gradient(1200px 600px at -10% -10%, #EDE4FF 0%, transparent 55%),
        radial-gradient(1000px 700px at 110% 0%, #FFE3F0 0%, transparent 50%),
        radial-gradient(900px 700px at 50% 120%, #E0FBFF 0%, transparent 55%),
        #FFFFFF;
    background-attachment: fixed;
}

section[data-testid="stSidebar"]{
    background: linear-gradient(180deg, #FBF8FF 0%, #FDF1F8 100%);
    border-right: 2px solid var(--line);
}
section[data-testid="stSidebar"] h3{ color:var(--ink) !important; }

h1,h2,h3,.display-font{ font-family:'Space Grotesk', sans-serif !important; letter-spacing:-0.02em; color:var(--ink); }
.mono{ font-family:'IBM Plex Mono', monospace !important; }
.sticker{ font-family:'Fredoka', sans-serif !important; }

/* ---------- Header ---------- */
.ss-header{ display:flex; align-items:center; gap:14px; margin-bottom:2px; }
.ss-bolt{ font-size:2.1rem; filter:drop-shadow(0 4px 10px rgba(139,92,246,0.35)); animation:tilt 2.4s ease-in-out infinite; }
.ss-title{ font-size:2.6rem; font-weight:800; margin:0; font-family:'Space Grotesk', sans-serif;
           background:linear-gradient(90deg, var(--violet) 0%, var(--hot) 55%, var(--cyan) 100%);
           background-size:200% auto; -webkit-background-clip:text; background-clip:text;
           -webkit-text-fill-color:transparent; animation:shine 6s linear infinite; }
.ss-tag{ font-family:'IBM Plex Mono', monospace; font-size:0.72rem; font-weight:700; color:#fff;
         background:linear-gradient(90deg, var(--violet), var(--hot)); padding:5px 12px; border-radius:20px;
         letter-spacing:0.06em; box-shadow:0 4px 14px rgba(244,77,139,0.35); }
.ss-sub{ color:var(--muted); font-size:1rem; margin-top:8px; margin-bottom:26px; font-weight:500; max-width:720px; }

@keyframes shine{ 0%{ background-position:0% center; } 100%{ background-position:200% center; } }
@keyframes tilt{ 0%,100%{ transform:rotate(-8deg); } 50%{ transform:rotate(8deg); } }

/* ---------- Pipeline stepper ---------- */
.stepper{ display:flex; align-items:center; margin-bottom:28px; background:var(--glass);
          backdrop-filter:blur(10px); border:2px solid var(--line); border-radius:20px; padding:16px 22px; }
.step{ display:flex; align-items:center; gap:10px; flex:1; }
.step-dot{ width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;
           font-family:'IBM Plex Mono', monospace; font-size:0.85rem; font-weight:700;
           border:2px solid var(--line); color:var(--muted); background:#fff; flex-shrink:0; transition:all .25s ease; }
.step-label{ font-family:'Space Grotesk', sans-serif; font-size:0.82rem; font-weight:700; color:var(--muted);
             text-transform:uppercase; letter-spacing:0.03em; }
.step-line{ flex:1; height:3px; background:var(--line); margin:0 6px; border-radius:2px; }
.step.done .step-dot{ background:linear-gradient(135deg, var(--lime), #65A30D); border-color:transparent; color:#fff; }
.step.done .step-label{ color:#5B8C0B; }
.step.active .step-dot{ background:linear-gradient(135deg, var(--pink), var(--violet)); border-color:transparent;
                         color:#fff; animation:pulse-glow 1.2s ease-in-out infinite; }
.step.active .step-label{ color:var(--hot); }
.step.done + .step-line, .step.active + .step-line{ background:linear-gradient(90deg, var(--lime), var(--hot)); }

@keyframes pulse-glow{
    0%,100%{ box-shadow:0 0 0 0 rgba(244,77,139,0.55); }
    50%{ box-shadow:0 0 0 12px rgba(244,77,139,0); }
}
@keyframes bounce{ 0%,100%{ transform:translateY(0) rotate(-4deg); } 50%{ transform:translateY(-10px) rotate(4deg); } }
@keyframes sweep{ 0%{ left:-45%; } 100%{ left:100%; } }
@keyframes capfade{
    0%{ opacity:0; transform:translateY(6px); } 6%{ opacity:1; transform:translateY(0); }
    22%{ opacity:1; } 28%{ opacity:0; transform:translateY(-6px); } 100%{ opacity:0; }
}
@keyframes wiggle{ 0%,100%{ transform:rotate(-6deg) scale(1); } 50%{ transform:rotate(6deg) scale(1.05); } }
@keyframes floaty{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-6px); } }
@keyframes sparkle{ 0%,100%{ opacity:0.3; transform:scale(0.8) rotate(0deg); } 50%{ opacity:1; transform:scale(1.2) rotate(25deg); } }

/* ---------- Processing banner ---------- */
.proc-banner{ position:relative; background:linear-gradient(120deg, #F3ECFF, #FDEAF3, #E6FBFF);
              background-size:220% 220%; animation:gradientdrift 6s ease infinite;
              border:2px solid transparent; border-radius:18px; padding:18px 22px;
              display:flex; align-items:center; gap:16px; margin:10px 0 18px 0;
              box-shadow:0 8px 24px rgba(139,92,246,0.14); }
@keyframes gradientdrift{ 0%{ background-position:0% 50%; } 50%{ background-position:100% 50%; } 100%{ background-position:0% 50%; } }
.proc-icon{ font-size:2.3rem; animation:bounce 1s ease-in-out infinite; flex-shrink:0; }
.proc-body{ flex:1; }
.proc-title{ font-family:'Space Grotesk', sans-serif; font-weight:700; font-size:1.05rem; color:var(--ink); }
.scan-box{ position:relative; height:8px; border-radius:5px; background:#fff; overflow:hidden; margin:11px 0 9px 0;
           border:1px solid var(--line); }
.scan-sweep{ position:absolute; top:0; left:-45%; height:100%; width:45%; border-radius:5px;
             background:linear-gradient(90deg, transparent, var(--violet), var(--hot), var(--cyan), transparent);
             animation:sweep 1.4s linear infinite; }
.caption-stack{ position:relative; height:20px; overflow:hidden; }
.caption-stack span{ position:absolute; left:0; top:0; opacity:0; font-size:0.84rem; color:var(--muted);
                      font-weight:600; animation:capfade 8s infinite; }
.caption-stack span:nth-child(1){ animation-delay:0s; }
.caption-stack span:nth-child(2){ animation-delay:2s; }
.caption-stack span:nth-child(3){ animation-delay:4s; }
.caption-stack span:nth-child(4){ animation-delay:6s; }

/* ---------- Stat cards ---------- */
div[data-testid="stMetric"]{ background:var(--glass); backdrop-filter:blur(10px); border:2px solid var(--line);
                              border-radius:16px; padding:14px 16px; box-shadow:0 6px 18px rgba(139,92,246,0.08); }
div[data-testid="stMetricValue"]{ font-family:'IBM Plex Mono', monospace !important; color:var(--ink) !important; font-weight:800 !important; }
div[data-testid="stMetricLabel"]{ color:var(--muted) !important; font-weight:600 !important; }

/* ---------- Shelf tiles ---------- */
.shelf-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:14px; margin-bottom:8px; }
.shelf-tile{ background:#fff; border:2px solid var(--line); border-top:6px solid var(--lime); border-radius:18px;
             padding:16px 16px 14px 16px; position:relative; overflow:hidden; transition:transform .18s ease, box-shadow .18s ease; }
.shelf-tile:hover{ transform:translateY(-5px) rotate(-0.5deg); box-shadow:0 14px 26px rgba(139,92,246,0.18); }
.shelf-tile.ok{ border-top-color:var(--lime); }
.shelf-tile.low{ border-top-color:var(--amber); }
.shelf-tile.critical{ border-top-color:var(--red); }
.tile-label{ font-size:0.82rem; color:var(--ink); font-weight:700; text-transform:capitalize; margin-bottom:6px;
             white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tile-count{ font-family:'IBM Plex Mono', monospace; font-size:1.8rem; font-weight:800; color:var(--ink); line-height:1; }
.tile-bar{ height:7px; background:#F4F2FB; border-radius:4px; margin:11px 0 9px 0; overflow:hidden; }
.tile-fill{ height:100%; border-radius:4px; background:linear-gradient(90deg, var(--lime), #65A30D); }
.shelf-tile.low .tile-fill{ background:linear-gradient(90deg, var(--amber), #EA580C); }
.shelf-tile.critical .tile-fill{ background:linear-gradient(90deg, var(--red), var(--hot)); }
.tile-status{ font-family:'IBM Plex Mono', monospace; font-size:0.68rem; font-weight:800; letter-spacing:0.06em;
              display:inline-block; padding:2px 8px; border-radius:10px; }
.shelf-tile.ok .tile-status{ color:#3F7D0A; background:#EEFBD8; }
.shelf-tile.low .tile-status{ color:#B45B00; background:#FFF1D6; }
.shelf-tile.critical .tile-status{ color:#B5123A; background:#FFE1E9; }

/* ---------- Restock ticket ---------- */
.ticket{ background:#fff; border:2px solid var(--line); border-radius:20px; padding:20px 22px; position:relative;
         margin-bottom:16px; transition:transform .18s ease, box-shadow .18s ease; overflow:visible; }
.ticket:hover{ transform:translateY(-5px) rotate(-0.4deg); box-shadow:0 16px 32px rgba(139,92,246,0.2); border-color:var(--violet); }
.ticket.best{ border-color:var(--lime); box-shadow:0 0 0 3px rgba(163,230,53,0.3), 0 16px 32px rgba(101,163,13,0.18); }
.ticket-badge{ position:absolute; top:-16px; right:14px; background:linear-gradient(120deg, var(--lime), #65A30D);
               color:#0f2c00; font-family:'Fredoka', sans-serif; font-size:0.74rem; font-weight:700;
               padding:6px 14px; border-radius:20px; letter-spacing:0.02em; box-shadow:0 6px 14px rgba(101,163,13,0.4);
               animation:wiggle 1.8s ease-in-out infinite; }
.ticket-product{ font-family:'Space Grotesk', sans-serif; font-weight:700; font-size:1.12rem; text-transform:capitalize;
                  margin-bottom:2px; color:var(--ink); }
.ticket-platform{ font-size:0.82rem; color:var(--muted); margin-bottom:12px; font-weight:600; }
.ticket-divider{ border-top:2px dashed var(--line); margin:10px 0; }
.ticket-row{ display:flex; justify-content:space-between; font-size:0.9rem; padding:4px 0; }
.ticket-row span:first-child{ color:var(--muted); font-weight:500; }
.ticket-row span:last-child{ font-family:'IBM Plex Mono', monospace; color:var(--ink); text-align:right; font-weight:700; }
.ticket-link{ display:inline-block; margin-top:12px; font-size:0.85rem; font-weight:700; color:#fff; text-decoration:none;
              background:linear-gradient(90deg, var(--violet), var(--hot)); padding:8px 16px; border-radius:20px;
              box-shadow:0 6px 16px rgba(139,92,246,0.35); }
.ticket-link:hover{ transform:scale(1.04); }

/* ---------- Celebration ---------- */
.celebrate{ display:flex; align-items:center; gap:10px; font-family:'Fredoka', sans-serif; font-weight:700;
            font-size:1.1rem; color:var(--ink); margin:6px 0 18px 0; }
.celebrate .spark{ display:inline-block; animation:sparkle 1.4s ease-in-out infinite; }
.celebrate .spark:nth-child(2){ animation-delay:0.3s; }
.celebrate .spark:nth-child(4){ animation-delay:0.6s; }

.empty-state{ text-align:center; padding:56px 22px; color:var(--muted); font-weight:600;
              border:2.5px dashed var(--violet-2); border-radius:20px; background:var(--glass);
              backdrop-filter:blur(8px); font-family:'Space Grotesk', sans-serif; font-size:1.02rem; }

/* ---------- Buttons & inputs ---------- */
.stButton>button{ background:linear-gradient(90deg, var(--violet), var(--hot)); color:#fff !important; font-weight:700;
                   border:none; font-family:'Space Grotesk', sans-serif; border-radius:14px; padding:0.65rem 1.8rem;
                   box-shadow:0 8px 20px rgba(139,92,246,0.35); transition:transform .15s ease, box-shadow .15s ease; }
.stButton>button:hover{ transform:translateY(-2px) scale(1.02); box-shadow:0 12px 26px rgba(244,77,139,0.4); color:#fff !important; }
.stButton>button:disabled{ background:var(--line); color:var(--muted) !important; box-shadow:none; }

div[data-testid="stFileUploader"] section{ border-radius:16px; border:2px dashed var(--violet-2); background:#fff; }
.stSlider [data-baseweb="slider"] div[role="slider"]{ background:var(--hot) !important; }

hr, [data-testid="stDivider"]{ border-color:var(--line) !important; }
"""


def inject_global_css():
    """
    Injects GLOBAL_CSS straight into the top-level document's <head> via a
    small script, instead of relying on st.markdown() text processing.
    Idempotent: safe to call on every rerun.
    """
    script = (
        "<script>\n"
        "(function(){\n"
        "  try{\n"
        "    var d = window.parent.document;\n"
        "    var existing = d.getElementById('shelfsense-style');\n"
        "    if (existing) { existing.remove(); }\n"
        "    var style = d.createElement('style');\n"
        "    style.id = 'shelfsense-style';\n"
        "    style.innerHTML = " + json.dumps(GLOBAL_CSS) + ";\n"
        "    d.head.appendChild(style);\n"
        "  } catch(e) {}\n"
        "})();\n"
        "</script>"
    )
    components.html(script, height=0, width=0)
    # Belt-and-braces fallback in case the script path is ever blocked.
    st.markdown(f"<style>{textwrap.dedent(GLOBAL_CSS)}</style>", unsafe_allow_html=True)


def processing_banner(icon: str, title: str, captions: list) -> str:
    caption_spans = "".join(f"<span>{c}</span>" for c in captions[:4])
    return (
        f'<div class="proc-banner"><div class="proc-icon">{icon}</div>'
        f'<div class="proc-body"><div class="proc-title">{title}</div>'
        f'<div class="scan-box"><div class="scan-sweep"></div></div>'
        f'<div class="caption-stack">{caption_spans}</div></div></div>'
    )


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