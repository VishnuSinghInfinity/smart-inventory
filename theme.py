"""
Shared visual system for ShelfSense — used by app.py (Home) and every page
under pages/. Keeping this in one place means every page looks consistent
and there's a single spot to tweak the design.

inject_global_css() writes CSS straight into the top-level document's
<head> via a small script rather than through st.markdown() text, because
st.markdown() runs raw HTML through a markdown-to-HTML pass first, which
can mangle a large <style> block. Going straight into the DOM via JS
sidesteps that entirely.
"""

import json
import textwrap

import streamlit as st
import streamlit.components.v1 as components

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

/* ---------- Sidebar page nav ---------- */
div[data-testid="stSidebarNav"] a{ font-family:'Space Grotesk', sans-serif !important; font-weight:700 !important; }

/* ---------- Sales intelligence: action cards ---------- */
.action-card{ background:#fff; border:2px solid var(--line); border-radius:20px; padding:20px 22px;
               position:relative; margin-bottom:16px; transition:transform .18s ease, box-shadow .18s ease;
               border-left:8px solid var(--line); }
.action-card:hover{ transform:translateY(-4px); box-shadow:0 14px 30px rgba(139,92,246,0.16); }
.action-card.discount{ border-left-color:var(--orange); }
.action-card.restock{ border-left-color:var(--violet); }
.action-pill{ display:inline-flex; align-items:center; gap:4px; font-family:'IBM Plex Mono', monospace;
              font-size:0.68rem; font-weight:700; letter-spacing:0.05em; padding:4px 10px; border-radius:20px;
              margin-bottom:10px; }
.action-card.discount .action-pill{ color:#9A3B00; background:#FFEBD6; }
.action-card.restock .action-pill{ color:#4C1D95; background:#EDE4FF; }
.action-headline{ font-family:'Space Grotesk', sans-serif; font-weight:700; font-size:1.1rem; color:var(--ink); margin-bottom:6px; }
.action-detail{ font-size:0.92rem; color:var(--muted); font-weight:500; line-height:1.5; margin-bottom:12px; }
.action-value{ display:inline-block; font-family:'IBM Plex Mono', monospace; font-weight:800; font-size:1.15rem;
               padding:6px 14px; border-radius:12px; }
.action-card.discount .action-value{ color:#9A3B00; background:#FFF3E5; }
.action-card.restock .action-value{ color:#4C1D95; background:#F4EEFF; }
.action-meta{ margin-top:12px; font-size:0.78rem; color:var(--muted); font-family:'IBM Plex Mono', monospace; }

.no-action-card{ background:var(--glass); backdrop-filter:blur(8px); border:2px dashed var(--line); border-radius:16px;
                  padding:14px 18px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
.no-action-name{ font-weight:700; color:var(--ink); text-transform:capitalize; }
.no-action-tag{ font-family:'IBM Plex Mono', monospace; font-size:0.7rem; color:#3F7D0A; background:#EEFBD8;
                padding:3px 10px; border-radius:20px; font-weight:700; }

/* ---------- Floating chat (Sales Intelligence page) ---------- */
/* Best-effort reposition of the popover trigger to float bottom-right;
   if Streamlit's internal test-id ever changes this silently no-ops and
   the button just renders inline instead — never breaks the page. */
div[data-testid="stPopover"]{ position:fixed; bottom:26px; right:26px; z-index:9999; }
div[data-testid="stPopover"] > div > button{
    border-radius:50% !important; width:60px; height:60px; font-size:1.5rem;
    background:linear-gradient(135deg, var(--violet), var(--hot)) !important; color:#fff !important;
    border:none !important; box-shadow:0 10px 28px rgba(139,92,246,0.45) !important;
    animation:floaty 2.6s ease-in-out infinite;
}
div[data-testid="stPopoverBody"]{ width:360px !important; max-height:70vh; overflow-y:auto;
    border-radius:18px !important; border:2px solid var(--line) !important; }
.chat-bubble-user{ background:var(--violet-2); color:#fff; border-radius:16px 16px 4px 16px;
                    padding:10px 14px; margin:6px 0; font-size:0.88rem; max-width:85%; margin-left:auto; }
.chat-bubble-bot{ background:#F4F2FB; color:var(--ink); border-radius:16px 16px 16px 4px;
                   padding:10px 14px; margin:6px 0; font-size:0.88rem; max-width:85%; }

.ss-chat-btn{

position:fixed;

bottom:30px;

right:28px;

width:72px;

height:72px;

border-radius:50%;

background:linear-gradient(135deg,#5b7cff,#7c4dff);

display:flex;

align-items:center;

justify-content:center;

font-size:34px;

cursor:pointer;

z-index:999999;

box-shadow:
0 12px 35px rgba(0,0,0,.28);

transition:.3s;
}

.ss-chat-btn:hover{

transform:scale(1.08);

box-shadow:
0 20px 45px rgba(91,124,255,.45);

}

.ss-chat-btn:active{

transform:scale(.95);

}
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