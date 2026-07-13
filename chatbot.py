"""
ShelfSense chatbot brain — used only by the Sales Intelligence page's
floating chat widget.

Design: the LLM is given a fresh snapshot of the store's current data
(inventory, sales metrics, triggers, recommendations, rule thresholds) on
every turn, and asked to reply in plain English AND optionally emit a
structured "action" the page can execute (regenerate recommendations,
change a threshold, or jump to the Home page). The LLM never invents
numbers — it only sees and talks about what's already been computed by
sales_data.py / apply_rules().

Note: this bot lives on the Sales Intelligence page, which has no access to
an uploaded video, so it cannot trigger YOLO detection — it can only offer
to send the user to the Home page for that.
"""

import json
import os

from langchain_groq import ChatGroq

VALID_ACTIONS = {"regenerate_recommendations", "set_thresholds", "navigate_home"}


def build_context(inventory, metrics, triggers, recommendations, thresholds) -> str:
    """Serialize current store state into a compact block for the prompt."""
    inv_summary = (
        {k: v for k, v in inventory.items()} if inventory else "No shelf video/inventory loaded yet on the Home page."
    )

    metrics_summary = [
        {
            "product": p,
            "current_stock": m["current_stock"],
            "avg_daily_sales_7d": m["avg_daily_sales_7d"],
            "trend_pct": m["trend_pct"],
            "days_of_stock_left": m["days_of_stock_left"],
            "days_until_expiry": m["days_until_expiry"],
        }
        for p, m in metrics.items()
    ]

    triggers_summary = [
        {"product": t["product"], "action": t["action"], "urgency": t["urgency"],
         "suggested_value": t["suggested_value"]}
        for t in triggers
    ]

    recs_summary = recommendations if recommendations else "Not generated yet — user hasn't clicked the button."

    return json.dumps({
        "inventory_from_home_page": inv_summary,
        "sales_metrics": metrics_summary,
        "flagged_actions": triggers_summary,
        "ai_recommendations": recs_summary,
        "current_rule_thresholds": thresholds,
    }, indent=2, default=str)


SYSTEM_PROMPT = """You are ShelfSense's store assistant, embedded as a chat widget on the \
Sales Intelligence page of a retail inventory dashboard. Store managers ask you things like \
"how much stock of X do we have", "what's selling fast", "what should I discount", etc.

Answer naturally and concisely, like a sharp retail analyst — a sentence or two unless more \
detail is clearly needed. Only use the numbers given to you in the DATA block below; never \
invent stock counts, prices, or trends.

You can also trigger actions when the user clearly asks for one, by setting "action" in your \
JSON response:
- {"type": "regenerate_recommendations"} — re-run the AI recommendation generator
- {"type": "set_thresholds", "near_expiry_days": <int>, "low_stock_days": <int>, "trend_up_pct": <int>}
  — change one or more rule thresholds (only include the keys the user actually asked to change)
- {"type": "navigate_home"} — send the user to the main Restock Pipeline page

You CANNOT run YOLO detection or scrape suppliers from this page (no video is available here) — \
if asked, explain that and offer to navigate them to the Home page instead.

If no action applies, set "action" to null.

Respond with ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:
{"reply": "<your answer>", "action": null or {...}}
"""


def ask_shelfsense(user_message: str, chat_history: list, context: str) -> dict:
    """
    chat_history: list of {"role": "user"|"assistant", "content": str}, most
    recent last. Returns {"reply": str, "action": dict|None}.
    """
    model = ChatGroq(
        model="openai/gpt-oss-120b",
        temperature=0.4,
        api_key=os.getenv("GROQ_API_KEY"),
        max_tokens=500,
    )

    history_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in chat_history[-6:]
    )

    prompt = f"""{SYSTEM_PROMPT}

DATA:
{context}

RECENT CONVERSATION:
{history_text if history_text else "(none yet)"}

USER: {user_message}
"""

    response = model.invoke(prompt)
    text = response.content.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{"):text.rfind("}") + 1]

    try:
        parsed = json.loads(text)
        reply = parsed.get("reply", text)
        action = parsed.get("action")
        if isinstance(action, dict) and action.get("type") not in VALID_ACTIONS:
            action = None
        return {"reply": reply, "action": action}
    except (json.JSONDecodeError, AttributeError):
        # Model didn't follow the JSON format — still show something useful
        # rather than failing the whole chat turn.
        return {"reply": text, "action": None}