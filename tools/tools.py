from langchain.tools import tool
import requests
import os
from playwright.sync_api import sync_playwright
from tavily import TavilyClient
from dotenv import load_dotenv
from rich import print
from bs4 import BeautifulSoup

load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


@tool
def search_restock(stock: dict, threshold: int = 70) -> list[dict]:
    """
    Search for bulk restock suppliers for low-stock products, 
    limited to trusted e-commerce domains.
    Returns a list of dicts with 'product', 'count', 'title', 'url'.
    """
    trusted_domains = ["amazon.in", "flipkart.com", "snapdeal.com","blinkit.com", "indiamart.com", "tradeindia.com", "wholesalebox.in"]
    
    low_stock = {
        product: count
        for product, count in stock.items()
        if product != "grand_total" and count < threshold
    }

    if not low_stock:
        return []

    all_results = []
    for product, count in low_stock.items():
        response = tavily.search(
            query=f"{product} bulk pack price",
            max_results=3,
            include_domains=trusted_domains
        )
        for r in response.get("results", []):
            all_results.append({
                "product": product,
                "count": count,
                "title": r["title"],
                "url": r["url"]
            })

    return all_results

@tool
def scrape_url(url: str) -> str:
    """
    Visit a product page using a real browser and return
    product information including price and delivery date.
    """

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"]
            )

            page = browser.new_page(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            )

            page.goto(url, timeout=60000)

            page.wait_for_load_state("networkidle")
           
            html = page.content()

            browser.close()

        soup = BeautifulSoup(html, "html.parser")

        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        text = soup.get_text(" ", strip=True)

        return text

    except Exception as e:
        return f"Error scraping: {e}"