"""
Inventory master data (from inventory.csv) + fake sales simulation + the
deterministic rule engine that decides which products need a discount or
a restock.

inventory.csv is the source of truth for: category, unit, supplier, cost
price, selling price, baseline stock, manufacturing date, and expiry date.
It does NOT contain sales velocity — a single YOLO scan is a snapshot, not
a history — so daily sales are still simulated per product (deterministic,
seeded) until real sales tracking exists. See _SIMULATED_SALES_PROFILE.

Live YOLO counts (from the Home page's detection run, passed in as
`live_counts`) override a product's current_stock at read time — the CSV
itself is never modified by a scan.
"""

import hashlib
import random
from datetime import date, datetime

import pandas as pd

DEFAULT_CSV_PATH = "inventory.csv"

# Hand-tuned so the demo always shows a mix of: discount candidates, restock
# candidates, and "all good" products — deterministic (fixed seed) so it
# looks the same every run. Keyed by the model's real class names (note:
# the trained model has some duplicate/near-duplicate classes from labeling
# inconsistency, e.g. "Lays"/"lays", "Corn falkes"/"Corn flakes" — kept as
# separate SKUs here per a deliberate choice not to merge them in code).
_SIMULATED_SALES_PROFILE = {
    "Corn falkes":  dict(base_sales=5,  trend=1.0),    # near expiry -> discount
    "Corn flakes":  dict(base_sales=6,  trend=1.0),    # baseline
    "Dettol":       dict(base_sales=7,  trend=0.95),   # near expiry -> discount
    "Dove":         dict(base_sales=10, trend=1.5),    # trending up hard -> restock
    "Dove soap":    dict(base_sales=3,  trend=0.9),    # near expiry -> discount
    "Lays":         dict(base_sales=13, trend=1.55),   # trending up hard -> restock
    "Maggi":        dict(base_sales=10, trend=1.05),   # baseline
    "Mountain Dew": dict(base_sales=8,  trend=1.1),    # low stock -> restock
    "Nescafe":      dict(base_sales=5,  trend=1.0),    # baseline
    "colgate":      dict(base_sales=12, trend=1.55),   # trending up hard -> restock
    "lays":         dict(base_sales=6,  trend=1.0),    # low stock -> restock
    "nescafe":      dict(base_sales=4,  trend=1.0),    # baseline
}


def _derive_profile(product_name: str) -> dict:
    """
    Deterministic fallback for products in inventory.csv that aren't in the
    hand-tuned profile above (e.g. a new SKU someone adds to the CSV later).
    Seeds off the product name so it's stable across runs, not random noise.
    """
    seed = int(hashlib.md5(product_name.encode()).hexdigest(), 16) % (2**32)
    rng = random.Random(seed)
    return {
        "base_sales": rng.randint(5, 18),
        "trend": round(rng.uniform(0.85, 1.35), 2),
    }


def load_inventory_master(csv_path: str = DEFAULT_CSV_PATH) -> dict:
    """
    Reads inventory.csv into {product_name: {category, unit, supplier,
    cost_price, selling_price, current_stock, manufacturing_date,
    expiry_date, days_until_expiry}}.

    days_until_expiry is computed fresh against today's date every time
    this is called, so it stays accurate as real time passes rather than
    being frozen at whatever it was when the CSV was written.
    """
    df = pd.read_csv(csv_path)
    required_cols = {"product_name", "category", "unit", "supplier", "cost_price",
                      "selling_price", "current_stock", "manufacturing_date", "expiry_date"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"inventory.csv is missing required column(s): {sorted(missing)}")

    today = date.today()
    master = {}
    for _, row in df.iterrows():
        expiry = datetime.strptime(str(row["expiry_date"]), "%Y-%m-%d").date()
        mfg = datetime.strptime(str(row["manufacturing_date"]), "%Y-%m-%d").date()
        master[row["product_name"]] = {
            "category": row["category"],
            "unit": row["unit"],
            "supplier": row["supplier"],
            "cost_price": float(row["cost_price"]),
            "selling_price": float(row["selling_price"]),
            "current_stock": int(row["current_stock"]),
            "manufacturing_date": mfg.isoformat(),
            "expiry_date": expiry.isoformat(),
            "days_until_expiry": (expiry - today).days,
        }
    return master


def generate_sales_history(inventory_master: dict, live_counts: dict = None,
                            product_filter=None, days: int = 30, seed: int = 42) -> dict:
    """
    Returns {product: {"daily_sales": [int]*days, "current_stock": int,
                        "days_until_expiry": int, "expiry_date": str,
                        "category", "unit", "supplier", "cost_price", "selling_price"}}

    live_counts: optional {product: count} from a YOLO scan (Home page's
    st.session_state.inventory, minus "grand_total") — overrides CSV's
    baseline current_stock for products present in it.

    product_filter: optional iterable restricting which products to
    include (used to show only YOLO-detected products once a scan exists).
    If None, every product in inventory_master is included.
    """
    rng_master_seed = seed
    products = list(product_filter) if product_filter is not None else list(inventory_master.keys())

    history = {}
    for product in products:
        if product not in inventory_master:
            continue  # detected class has no master data (price/expiry) — skip, can't price it
        master = inventory_master[product]
        profile = _SIMULATED_SALES_PROFILE.get(product) or _derive_profile(product)
        base = profile["base_sales"]
        trend = profile["trend"]

        rng = random.Random(hash((rng_master_seed, product)) % (2**32))
        daily_sales = []
        for day_idx in range(days):
            progress = day_idx / max(days - 1, 1)
            mean_today = base * (1 + (trend - 1) * progress)
            noise = rng.gauss(0, max(1.0, mean_today * 0.18))
            daily_sales.append(max(0, round(mean_today + noise)))

        stock = live_counts[product] if (live_counts and product in live_counts) else master["current_stock"]

        history[product] = {
            "daily_sales": daily_sales,
            "current_stock": stock,
            "days_until_expiry": master["days_until_expiry"],
            "expiry_date": master["expiry_date"],
            "category": master["category"],
            "unit": master["unit"],
            "supplier": master["supplier"],
            "cost_price": master["cost_price"],
            "selling_price": master["selling_price"],
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