"""
Fake sales + expiry dataset for the Sales Intelligence page, plus the
rule-based trigger engine that decides WHICH products need a discount or a
restock. The LLM (in the page itself) only writes the explanation text —
all the actual numbers/decisions come from here, deterministically.
"""

import random
from datetime import date, timedelta

# Reuses the same 8 products as sample_inventory.json so both pages tell a
# consistent story about the same shelf.
PRODUCTS = [
    "maggi_noodles", "colgate_toothpaste", "parle_g_biscuits", "surf_excel_detergent",
    "amul_milk_packet", "lays_chips", "dettol_soap", "tata_salt",
]

# Hand-tuned so the demo always shows a mix of: discount candidates, restock
# candidates, and "all good" products — deterministic (fixed seed) so it
# looks the same every run of the demo.
_PRODUCT_PROFILES = {
    #                 stock  avg_daily  trend       days_until_expiry
    "maggi_noodles":        dict(stock=120, base_sales=10, trend=1.05, expiry_days=95),   # baseline, no action
    "colgate_toothpaste":   dict(stock=70,  base_sales=12, trend=1.55, expiry_days=210),  # trending up hard -> restock
    "parle_g_biscuits":     dict(stock=50,  base_sales=8,  trend=0.80, expiry_days=10),   # near expiry + slowing -> discount
    "surf_excel_detergent": dict(stock=100, base_sales=9,  trend=1.02, expiry_days=260),  # baseline, no action
    "amul_milk_packet":     dict(stock=25,  base_sales=14, trend=1.05, expiry_days=3),    # perishable, near expiry -> discount
    "lays_chips":           dict(stock=60,  base_sales=14, trend=1.55, expiry_days=60),   # trending up hard -> restock
    "dettol_soap":          dict(stock=80,  base_sales=7,  trend=0.95, expiry_days=6),    # near expiry -> discount
    "tata_salt":            dict(stock=200, base_sales=4,  trend=1.0,  expiry_days=300),  # baseline, no action
}


def generate_sales_history(days: int = 30, seed: int = 42) -> dict:
    """
    Returns {product: {"daily_sales": [int]*days, "current_stock": int,
                        "days_until_expiry": int}}
    daily_sales[-1] is "today". Trend is baked in by ramping the mean sales
    rate up/down slightly across the window.
    """
    rng = random.Random(seed)
    history = {}
    for product in PRODUCTS:
        profile = _PRODUCT_PROFILES[product]
        base = profile["base_sales"]
        trend = profile["trend"]
        daily_sales = []
        for day_idx in range(days):
            # ramp the mean linearly from base/trend up to base*trend across the window
            progress = day_idx / max(days - 1, 1)
            mean_today = base * (1 + (trend - 1) * progress)
            noise = rng.gauss(0, max(1.0, mean_today * 0.18))
            daily_sales.append(max(0, round(mean_today + noise)))
        history[product] = {
            "daily_sales": daily_sales,
            "current_stock": profile["stock"],
            "days_until_expiry": profile["expiry_days"],
            "expiry_date": (date.today() + timedelta(days=profile["expiry_days"])).isoformat(),
        }
    return history


def compute_metrics(history: dict) -> dict:
    """Derive avg sales (7d/prior-7d), trend %, and days-of-stock-left per product."""
    metrics = {}
    for product, data in history.items():
        sales = data["daily_sales"]
        last7 = sales[-7:]
        prior7 = sales[-14:-7] if len(sales) >= 14 else sales[:7]
        avg_last7 = sum(last7) / len(last7) if last7 else 0
        avg_prior7 = sum(prior7) / len(prior7) if prior7 else 0.001
        trend_pct = ((avg_last7 - avg_prior7) / avg_prior7) * 100 if avg_prior7 else 0
        days_of_stock_left = (data["current_stock"] / avg_last7) if avg_last7 > 0 else float("inf")
        metrics[product] = {
            **data,
            "avg_daily_sales_7d": round(avg_last7, 1),
            "avg_daily_sales_prior7d": round(avg_prior7, 1),
            "trend_pct": round(trend_pct, 1),
            "days_of_stock_left": round(days_of_stock_left, 1) if days_of_stock_left != float("inf") else 999,
        }
    return metrics


def apply_rules(metrics: dict, near_expiry_days: int = 14, low_stock_days: int = 5, trend_up_pct: float = 25.0) -> list:
    """
    Deterministic trigger engine. Returns a list of trigger dicts, each with
    a suggested_value already computed (discount % or reorder qty) — the
    LLM's only job later is to phrase this nicely, not to decide it.
    """
    triggers = []
    for product, m in metrics.items():
        expiry_days = m["days_until_expiry"]
        stock_days_left = m["days_of_stock_left"]
        trend = m["trend_pct"]

        # --- Discount trigger: near expiry, scaled by urgency ---
        if expiry_days <= 3:
            discount_pct = 45
            urgency = "urgent"
        elif expiry_days <= near_expiry_days * 0.5:
            discount_pct = 30
            urgency = "high"
        elif expiry_days <= near_expiry_days:
            discount_pct = 15
            urgency = "moderate"
        else:
            discount_pct = None
            urgency = None

        if discount_pct is not None:
            # sell faster than expiry allows? then less discount needed
            if stock_days_left < expiry_days:
                discount_pct = max(5, discount_pct - 10)
            triggers.append({
                "product": product,
                "action": "discount",
                "urgency": urgency,
                "suggested_value": f"{discount_pct}% off",
                "expiry_days": expiry_days,
                "avg_daily_sales_7d": m["avg_daily_sales_7d"],
                "trend_pct": trend,
                "current_stock": m["current_stock"],
                "days_of_stock_left": stock_days_left,
            })
            continue  # a product gets at most one action for clarity

        # --- Restock trigger: running low and/or trending up hard ---
        if stock_days_left <= low_stock_days or trend >= trend_up_pct:
            reorder_qty = max(10, round(m["avg_daily_sales_7d"] * 14 - m["current_stock"]))
            if reorder_qty <= 0:
                continue
            urgency = "urgent" if stock_days_left <= low_stock_days * 0.6 else "moderate"
            triggers.append({
                "product": product,
                "action": "restock",
                "urgency": urgency,
                "suggested_value": f"Reorder {reorder_qty} units",
                "expiry_days": expiry_days,
                "avg_daily_sales_7d": m["avg_daily_sales_7d"],
                "trend_pct": trend,
                "current_stock": m["current_stock"],
                "days_of_stock_left": stock_days_left,
            })

    return triggers