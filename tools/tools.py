from langchain.tools import tool
import requests
import os

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
    trusted_domains = ["amazon.in", "flipkart.com", "snapdeal.com"]
    
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
    Scrape the content of a webpage given its URL.
    Return the text content in plain text, prioritizing product prices if present.
    """
    try:
        response = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)[:3000]
    except requests.exceptions.RequestException as e:
        return f"Error scraping the URL: {str(e)}"