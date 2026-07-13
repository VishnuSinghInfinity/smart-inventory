from email.mime import text

from ultralytics import YOLO
from collections import defaultdict
from tools.tools import search_restock, scrape_url
from agents.comparing import comparing_agent

def run_tracking():
    model = YOLO("final_best.pt")
    unique_objects = defaultdict(set)

    results = model.track(
        source="test.mp4",
        tracker="bytetrack.yaml",
        persist=True,
        stream=True,
        save=True,
        conf=0.75  
    )

    for result in results:
        if result.boxes.id is None:
            continue
        ids = result.boxes.id.cpu().numpy().astype(int)
        classes = result.boxes.cls.cpu().numpy().astype(int)
        for obj_id, cls in zip(ids, classes):
            unique_objects[model.names[cls]].add(obj_id)

    return unique_objects


def inventory_count(unique_objects):
    grand_total = 0
    inventory = {}
    for cls_name, ids in unique_objects.items():
        inventory[cls_name] = len(ids)
        grand_total += len(ids)
    inventory["grand_total"] = grand_total  # lowercase, matches tools.py filter
    return inventory

import re

def extract_price(text: str) -> str:
    """Extract the most likely price from scraped page text."""
    if "contact seller for price" in text.lower():
        return "Contact seller for price"
 
    # ₹ symbol (with optional non-breaking space), plus common textual
    # variants ("Rs.", "Rs", "INR") some sites use instead of the symbol.
    patterns = [
        r'₹\s?[\d,]+(?:\.\d{1,2})?',
        r'(?:Rs\.?|INR)\s?[\d,]+(?:\.\d{1,2})?',
    ]
    prices = []
    for pattern in patterns:
        prices.extend(re.findall(pattern, text, re.IGNORECASE))
    if not prices:
        return "Price not found"
    unique_prices = list(dict.fromkeys(prices))[:3]
    return ", ".join(unique_prices)
def extract_delivery(text: str) -> str:
    """Extract delivery date/timeframe from scraped page text."""
    patterns = [
        r'(?:FREE delivery|Delivery by|Get it by|Get by|Arrives by|Estimated delivery:?)\s+'
        r'([A-Za-z]+,?\s*\d{0,2}\s*[A-Za-z]*)',
        r'(?:FREE delivery|Delivery by|Get it by|Get by|Arrives by)\s+(Tomorrow|Today)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0)
    return "Delivery info not found"

if __name__ == "__main__":
    unique_objects = run_tracking()
    inventory = inventory_count(unique_objects)

    print("=" * 40)
    print("TOTAL PRODUCTS")
    print("=" * 40)
    print(inventory)

    tool1_output = search_restock.invoke({"stock": inventory, "threshold": 70})
    result_for_agent = []
    if tool1_output:
        print("\n" + "="*50)
        print("RESTOCK PRICE COMPARISON")
        print("="*50)
        for item in tool1_output:
            scraped = scrape_url.invoke({"url": item["url"]})
            print(f"\n--- RAW SCRAPED TEXT for {item['url']} ---")
            print(scraped[:500])  # just first 500 chars to eyeball
            print("--- END ---\n")
            price = extract_price(scraped)
            delivery_date = extract_delivery(scraped)
            site = item["url"].split("/")[2]  # extracts domain e.g. www.flipkart.com
            result_for_agent.append({
                "product": item["product"],
                "site": site,
                "price": price,
                "delivery": delivery_date,
                "url": item["url"]
            })
        output_from_agent = comparing_agent(result_for_agent)
        print(output_from_agent)
else:
    print("No low-stock products found below the threshold for restock search.")

        