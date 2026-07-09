from ultralytics import YOLO
from collections import defaultdict
from tools.tools import search_restock, scrape_url


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
    
    prices = re.findall(r'₹\s?[\d,]+(?:\.\d{1,2})?', text)
    if not prices:
        return "Price not found"
    
    unique_prices = list(dict.fromkeys(prices))[:3]
    return ", ".join(unique_prices)
if __name__ == "__main__":
    unique_objects = run_tracking()
    inventory = inventory_count(unique_objects)

    print("=" * 40)
    print("TOTAL PRODUCTS")
    print("=" * 40)
    print(inventory)

tool1_output = search_restock.invoke({"stock": inventory, "threshold": 70})

if tool1_output:
    print("\n" + "="*50)
    print("RESTOCK PRICE COMPARISON")
    print("="*50)
    for item in tool1_output:
        scraped = scrape_url.invoke({"url": item["url"]})
        price = extract_price(scraped)
        site = item["url"].split("/")[2]  # extracts domain e.g. www.flipkart.com
        print(f"{item['product']} | {site} | {price} | {item['url']}")
else:
    print("No low-stock suppliers to scrape.")