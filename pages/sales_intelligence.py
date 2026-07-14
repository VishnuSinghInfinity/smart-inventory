"""
Sales Intelligence — tracks fake sales history + expiry per product, applies
deterministic rules to flag discount/restock candidates, then asks Groq to
write a short, punchy explanation for each flagged product.

The LLM never decides WHAT to do — sales_data.apply_rules() does that with
plain arithmetic. The LLM only writes the human-readable copy, so the
numbers you see are always trustworthy even if the AI phrasing is generic.

Also hosts the floating "Ask ShelfSense" chatbot (see chatbot.py) — a
store-data-aware assistant that can answer questions and trigger a few
safe actions (regenerate recommendations, change thresholds, jump Home).
"""

import json
import os

import pandas as pd
import streamlit as st
from dotenv import load_dotenv
from langchain_groq import ChatGroq

from theme import inject_global_css, processing_banner
from sales import generate_sales_history, compute_metrics, apply_rules
from chatbot import ask_shelfsense, build_context

load_dotenv()

st.set_page_config(
    page_title="Sales Intelligence — ShelfSense",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

inject_global_css()

st.markdown(
    '<div class="ss-header"><span class="ss-bolt">📈</span>'
    '<h1 class="ss-title">Sales Intelligence</h1>'
    '<span class="ss-tag">DISCOUNT + RESTOCK ADVISOR</span></div>'
    '<div class="ss-sub">Tracks sales velocity and expiry per product, flags what needs a discount '
    'or a restock, and has an AI agent explain why — in plain English.</div>',
    unsafe_allow_html=True,
)

st.caption("Using a demo sales data ")

# --------------------------------------------------------------------------
# Session state — thresholds are keyed so both the sliders AND the chatbot
# can drive them (chatbot sets st.session_state[key] then reruns; slider
# reads/writes the same key automatically because we pass key= below).
# --------------------------------------------------------------------------
st.session_state.setdefault("near_expiry_days", 14)
st.session_state.setdefault("low_stock_days", 5)
st.session_state.setdefault("trend_up_pct", 25)
st.session_state.setdefault("sales_recommendations", None)
st.session_state.setdefault("chat_history", [])

# --------------------------------------------------------------------------
# Sidebar — rule tuning
# --------------------------------------------------------------------------
with st.sidebar:
    st.markdown('<h3 class="display-font">Rule Thresholds</h3>', unsafe_allow_html=True)
    st.slider("Flag as \"near expiry\" within (days)", 3, 30, key="near_expiry_days")
    st.slider("Flag as \"low stock\" if under (days of stock left)", 1, 14, key="low_stock_days")
    st.slider("Flag as \"trending up\" if sales grew by (%)", 5, 100, key="trend_up_pct")

    st.divider()
    st.markdown('<h3 class="display-font">AI Agent</h3>', unsafe_allow_html=True)
    groq_ok = bool(os.getenv("GROQ_API_KEY"))
    st.markdown(f"{'🟢' if groq_ok else '🔴'} GROQ_API_KEY")
    generate_clicked = st.button("✨ Generate AI Recommendations", use_container_width=True, disabled=not groq_ok)

near_expiry_days = st.session_state.near_expiry_days
low_stock_days = st.session_state.low_stock_days
trend_up_pct = st.session_state.trend_up_pct

# --------------------------------------------------------------------------
# Data + rules (always computed — cheap, no API calls)
# --------------------------------------------------------------------------
history = generate_sales_history()
metrics = compute_metrics(history)
triggers = apply_rules(metrics, near_expiry_days=near_expiry_days,
                        low_stock_days=low_stock_days, trend_up_pct=trend_up_pct)

triggered_products = {t["product"] for t in triggers}
discount_triggers = [t for t in triggers if t["action"] == "discount"]
restock_triggers = [t for t in triggers if t["action"] == "restock"]
baseline_products = [p for p in metrics if p not in triggered_products]

# --------------------------------------------------------------------------
# Overview
# --------------------------------------------------------------------------
st.markdown('<h3 class="display-font">📊 Overview</h3>', unsafe_allow_html=True)
c1, c2, c3, c4 = st.columns(4)
c1.metric("Products tracked", len(metrics))
c2.metric("Discount candidates", len(discount_triggers))
c3.metric("Restock candidates", len(restock_triggers))
c4.metric("Business as usual", len(baseline_products))

st.markdown("<br>", unsafe_allow_html=True)

# --------------------------------------------------------------------------
# Sales trend chart
# --------------------------------------------------------------------------
st.markdown('<h3 class="display-font">📉 30-Day Sales Trend</h3>', unsafe_allow_html=True)
chart_df = pd.DataFrame({p.replace("_", " "): d["daily_sales"] for p, d in history.items()})
chart_df.index.name = "day"
st.line_chart(chart_df, height=320)

st.markdown("<br>", unsafe_allow_html=True)

# --------------------------------------------------------------------------
# AI recommendation generation (Groq) — runs on button press OR when the
# chatbot triggers a "regenerate_recommendations" action.
# --------------------------------------------------------------------------

def fallback_copy(trigger: dict) -> dict:
    """Deterministic plain-English copy used before the AI button is pressed."""
    name = trigger["product"].replace("_", " ").title()
    if trigger["action"] == "discount":
        headline = f"Discount {name}"
        detail = (f"Expires in {trigger['expiry_days']} days, selling ~{trigger['avg_daily_sales_7d']}/day. "
                  f"Suggested: {trigger['suggested_value']}.")
    else:
        headline = f"Restock {name}"
        detail = (f"Only {trigger['days_of_stock_left']} days of stock left at ~{trigger['avg_daily_sales_7d']}/day "
                  f"({trigger['trend_pct']:+.1f}% vs last week). Suggested: {trigger['suggested_value']}.")
    return {**trigger, "headline": headline, "detail": detail}


def generate_ai_copy(triggers: list) -> list:
    """One batched Groq call that writes headline + detail for every trigger."""
    model = ChatGroq(
        model="openai/gpt-oss-120b",
        temperature=0.6,
        api_key=os.getenv("GROQ_API_KEY"),
        max_tokens=1200,
    )
    payload = json.dumps([
        {
            "product": t["product"].replace("_", " "),
            "action": t["action"],
            "urgency": t["urgency"],
            "suggested_value": t["suggested_value"],
            "expiry_days": t["expiry_days"],
            "avg_daily_sales_7d": t["avg_daily_sales_7d"],
            "trend_pct": t["trend_pct"],
            "current_stock": t["current_stock"],
            "days_of_stock_left": t["days_of_stock_left"],
        }
        for t in triggers
    ], indent=2)

    prompt = f"""You are a sharp, concise retail inventory assistant talking to a store manager.
For each product below, write a punchy one-line headline and a single-sentence explanation
of why this action is recommended, using the numbers given (don't invent new numbers).

Input:
{payload}

Respond with ONLY a JSON array (no markdown fences, no preamble), one object per product, each with
exactly these keys: "product", "headline" (max 6 words), "detail" (max 25 words, one sentence).
"""
    response = model.invoke(prompt)
    text = response.content.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("["):text.rfind("]") + 1]
    parsed = json.loads(text)
    by_product = {item["product"]: item for item in parsed}

    enriched = []
    for t in triggers:
        name = t["product"].replace("_", " ")
        copy = by_product.get(name)
        if copy:
            enriched.append({**t, "headline": copy.get("headline", ""), "detail": copy.get("detail", "")})
        else:
            enriched.append(fallback_copy(t))
    return enriched


def run_recommendation_generation():
    placeholder = st.empty()
    with placeholder.container():
        st.markdown(
            processing_banner("🧠", "AI agent is writing recommendations...",
                               ["Reading sales velocity", "Checking expiry windows",
                                "Weighing discount vs restock", "Drafting manager-friendly copy"]),
            unsafe_allow_html=True,
        )
    try:
        st.session_state.sales_recommendations = generate_ai_copy(triggers)
    except Exception as e:
        st.error(f"AI recommendation generation failed, showing rule-based copy instead: {e}")
        st.session_state.sales_recommendations = [fallback_copy(t) for t in triggers]
    finally:
        placeholder.empty()


if generate_clicked and triggers:
    run_recommendation_generation()

# --------------------------------------------------------------------------
# Results
# --------------------------------------------------------------------------
st.markdown('<h3 class="display-font">🎯 Recommended Actions</h3>', unsafe_allow_html=True)

if not triggers:
    st.markdown(
        '<div class="empty-state">✅ Nothing needs action right now — every product is comfortably '
        'stocked and far from expiry.</div>',
        unsafe_allow_html=True,
    )
else:
    display_items = st.session_state.sales_recommendations or [fallback_copy(t) for t in triggers]
    if st.session_state.sales_recommendations is None:
        st.caption("Showing rule-based summaries — hit **✨ Generate AI Recommendations** in the sidebar "
                   "(or ask the chat assistant) for AI-written copy.")

    cols = st.columns(min(2, max(1, len(display_items))))
    for i, item in enumerate(display_items):
        urgency_emoji = "🔥" if item["urgency"] == "urgent" else ("⚠️" if item["urgency"] == "high" else "💡")
        pill_text = f'{urgency_emoji} {"DISCOUNT" if item["action"] == "discount" else "RESTOCK"} · {item["urgency"].upper()}'
        with cols[i % len(cols)]:
            st.markdown(
                f'<div class="action-card {item["action"]}">'
                f'<div class="action-pill">{pill_text}</div>'
                f'<div class="action-headline">{item["headline"]}</div>'
                f'<div class="action-detail">{item["detail"]}</div>'
                f'<div class="action-value">{item["suggested_value"]}</div>'
                f'<div class="action-meta">Stock: {item["current_stock"]} units · '
                f'{item["avg_daily_sales_7d"]}/day avg · {item["trend_pct"]:+.1f}% vs last week</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

st.markdown("<br>", unsafe_allow_html=True)

if baseline_products:
    st.markdown('<h3 class="display-font">✅ Business As Usual</h3>', unsafe_allow_html=True)
    for p in baseline_products:
        m = metrics[p]
        st.markdown(
            f'<div class="no-action-card"><span class="no-action-name">{p.replace("_"," ")}</span>'
            f'<span class="no-action-tag">HEALTHY · {m["days_of_stock_left"]}d stock · expires in {m["days_until_expiry"]}d</span></div>',
            unsafe_allow_html=True,
        )

# --------------------------------------------------------------------------
# Floating chatbot — "Ask ShelfSense"
# --------------------------------------------------------------------------
# ===============================
# Floating Chat
# ===============================

chat = st.container(border=True)

with chat:

    st.markdown("""
    <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:15px;
    ">
        <div>
            <h3 style="margin:0;">🤖 ShelfSense AI</h3>
            <span style="color:green;font-size:13px;">● Online</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    if len(st.session_state.chat_history)==0:

        st.info(
            "👋 Hi! Ask me about inventory, expiry, sales, discounts or restocking."
        )

    for msg in st.session_state.chat_history:

        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    user_msg = st.chat_input(
        "Ask ShelfSense..."
    )

    if user_msg:

        st.session_state.chat_history.append(
            {
                "role":"user",
                "content":user_msg
            }
        )

        with st.chat_message("user"):
            st.markdown(user_msg)

        context = build_context(
            inventory=st.session_state.get("inventory"),
            metrics=metrics,
            triggers=triggers,
            recommendations=st.session_state.sales_recommendations,
            thresholds={
                "near_expiry_days":near_expiry_days,
                "low_stock_days":low_stock_days,
                "trend_up_pct":trend_up_pct
            }
        )

        try:
            result=ask_shelfsense(
                user_msg,
                st.session_state.chat_history[:-1],
                context
            )

        except Exception as e:

            result={
                "reply":str(e),
                "action":None
            }

        with st.chat_message("assistant"):
            st.markdown(result["reply"])

        st.session_state.chat_history.append(
            {
                "role":"assistant",
                "content":result["reply"]
            }
        )

        action=result.get("action")

        if action:

            action_type=action.get("type")

            if action_type=="regenerate_recommendations" and triggers:

                run_recommendation_generation()

            elif action_type=="set_thresholds":

                for k in (
                    "near_expiry_days",
                    "low_stock_days",
                    "trend_up_pct"
                ):

                    if k in action and action[k] is not None:

                        st.session_state[k]=int(action[k])

            elif action_type=="navigate_home":

                st.switch_page("app.py")

        st.rerun()