from langchain.tools import tool
import json
import re
import requests
import os
import asyncio
# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
# pyrefly: ignore [missing-import]
from playwright.async_api import async_playwright, BrowserContext
# pyrefly: ignore [missing-import]
from tavily import TavilyClient, AsyncTavilyClient
from dotenv import load_dotenv
from rich import print
# pyrefly: ignore [missing-import]
from bs4 import BeautifulSoup

load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
async_tavily = AsyncTavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


REALISTIC_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

CONTACT_SELLER_PHRASES = [
    "get latest price", "ask for price", "contact seller", "request a quote",
    "contact for price", "call for price", "price on request",
]


@tool
def search_restock(stock: dict, threshold: int = 70) -> list[dict]:
    """
    Search for bulk restock suppliers for low-stock products, 
    limited to trusted e-commerce domains.
    Returns a list of dicts with 'product', 'count', 'title', 'url'.
    """
    trusted_domains = ["amazon.in", "flipkart.com", "snapdeal.com","blinkit.com", "indiamart.com"]
    
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


def _extract_jsonld_signals(html: str) -> dict:
    """
    Pull price/currency/availability out of schema.org JSON-LD blocks, if
    present. This is server-rendered structured data meant for search
    engines, so it's present even when the visible page relies on JS
    widgets that are harder to scrape reliably.
    """
    soup = BeautifulSoup(html, "html.parser")
    signals = {}
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        candidates = data if isinstance(data, list) else [data]
        for item in candidates:
            if not isinstance(item, dict):
                continue
            # Product schema: offers can be a dict or a list of dicts
            offers = item.get("offers")
            if isinstance(offers, list):
                offers = offers[0] if offers else None
            if isinstance(offers, dict):
                price = offers.get("price") or offers.get("lowPrice")
                currency = offers.get("priceCurrency", "INR")
                if price:
                    signals["price"] = price
                    signals["currency"] = currency
                    signals["availability"] = offers.get("availability", "")
                if "delivery" in item:
                    signals["delivery"] = item.get("delivery")
            if "price" in signals:
                return signals
    return signals


def _detect_contact_seller(text: str) -> bool:
    lowered = text.lower()
    return any(phrase in lowered for phrase in CONTACT_SELLER_PHRASES)


def _parse_scraped_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    # ---- Primary: JSON-LD structured data (most reliable) ----
    jsonld = _extract_jsonld_signals(html)

    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text(" ", strip=True)

    sentinel_lines = []
    if jsonld.get("price"):
        sentinel_lines.append(f"₹{jsonld['price']}")
    if jsonld.get("delivery"):
        sentinel_lines.append(f"Delivery by {jsonld['delivery']}")

    if _detect_contact_seller(text):
        sentinel_lines.append("Contact seller for price")

    # Sentinel lines go first so extract_price()/extract_delivery()'s regex
    # (which just scans left-to-right for the first match) prefers the
    # clean structured signal over anything noisy found later in the page.
    if sentinel_lines:
        text = " | ".join(sentinel_lines) + " || " + text

    return text


@tool
def scrape_url(url: str) -> str:
    """
    Visit a product page using a real browser and return
    product information including price and delivery date.
    """
    html = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                ],
            )
            context = browser.new_context(
                user_agent=REALISTIC_UA,
                viewport={"width": 1366, "height": 900},
                locale="en-IN",
                extra_http_headers={"Accept-Language": "en-IN,en;q=0.9"},
            )
            page = context.new_page()
            page.goto(url, timeout=45000)

            # networkidle can hang indefinitely on pages with persistent
            # background requests (chat widgets, analytics beacons) — that
            # used to bubble up as a silent "Error scraping" failure. Fall
            # back to whatever DOM we have rather than losing the page.
            try:
                page.wait_for_load_state("networkidle", timeout=12000)
            except PlaywrightTimeoutError:
                page.wait_for_timeout(2000)  # give it a bit more time anyway

            html = page.content()
            browser.close()

    except Exception as e:
        return f"Error scraping: {e}"

    return _parse_scraped_html(html)


async def async_scrape_url(url: str, context: BrowserContext, timeout_ms: int = 15000) -> str:
    """
    Asynchronously scrape a URL using an existing browser context.
    """
    page = None
    try:
        page = await context.new_page()
        
        # Abort requests for images, media, stylesheets and fonts for optimal speed
        async def route_handler(route):
            if route.request.resource_type in ["image", "media", "font", "stylesheet"]:
                await route.abort()
            else:
                await route.continue_()
        await page.route("**/*", route_handler)
        
        await page.goto(url, timeout=timeout_ms)
        try:
            # Short wait for network idle to allow dynamic JS to load
            await page.wait_for_load_state("networkidle", timeout=min(4000, timeout_ms))
        except PlaywrightTimeoutError:
            pass
            
        html = await page.content()
        return _parse_scraped_html(html)
    except Exception as e:
        return f"Error scraping: {e}"
    finally:
        if page:
            await page.close()


async def async_search_product(product: str, count: int, trusted_domains: list[str]) -> list[dict]:
    """
    Asynchronously search for a product using AsyncTavilyClient.
    """
    try:
        response = await async_tavily.search(
            query=f"{product} bulk pack price",
            max_results=3,
            include_domains=trusted_domains
        )
        results = []
        for r in response.get("results", []):
            results.append({
                "product": product,
                "count": count,
                "title": r["title"],
                "url": r["url"]
            })
        return results
    except Exception as e:
        print(f"Tavily async search failed for {product}: {e}")
        return []


async def async_run_restock_pipeline(
    stock: dict,
    threshold: int = 70,
    concurrency_limit: int = 5,
    timeout_ms: int = 15000,
    progress_callback = None
) -> tuple[list[dict], list[dict]]:
    """
    Run the restock pipeline asynchronously:
    1. Search low-stock products concurrently using Tavily.
    2. Start scraping each site's URL as soon as Tavily returns them,
       using a shared browser context and a concurrency semaphore.
    """
    low_stock = {
        product: count
        for product, count in stock.items()
        if product != "grand_total" and count < threshold
    }

    if not low_stock:
        return [], []

    trusted_domains = ["amazon.in", "flipkart.com", "snapdeal.com", "blinkit.com", "indiamart.com"]
    sem = asyncio.Semaphore(concurrency_limit)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
            ],
        )
        context = await browser.new_context(
            user_agent=REALISTIC_UA,
            viewport={"width": 1366, "height": 900},
            locale="en-IN",
            extra_http_headers={"Accept-Language": "en-IN,en;q=0.9"},
        )

        all_search_results = []
        all_verified_results = []

        async def call_callback(event_type: str, data: dict):
            if progress_callback:
                try:
                    if asyncio.iscoroutinefunction(progress_callback):
                        await progress_callback(event_type, data)
                    else:
                        progress_callback(event_type, data)
                except Exception as e:
                    print(f"Callback error: {e}")

        async def scrape_and_verify(item: dict) -> dict:
            url = item["url"]
            site = url.split("/")[2] if "://" in url else url
            await call_callback("scrape_start", item)
            
            async with sem:
                try:
                    scraped = await async_scrape_url(url, context, timeout_ms)
                    from model import extract_price, extract_delivery
                    price = extract_price(scraped)
                    delivery = extract_delivery(scraped)
                except Exception as e:
                    price, delivery = "Error", str(e)

            verified_item = {
                "product": item["product"],
                "site": site,
                "price": price,
                "delivery": delivery,
                "url": url,
            }
            all_verified_results.append(verified_item)
            await call_callback("scrape_complete", verified_item)
            return verified_item

        async def search_and_trigger_scrape(product: str, count: int):
            results = await async_search_product(product, count, trusted_domains)
            all_search_results.extend(results)
            await call_callback("search_complete", {"product": product, "results": results})
            
            # Start scraping these results immediately
            scrape_tasks = [asyncio.create_task(scrape_and_verify(item)) for item in results]
            if scrape_tasks:
                await asyncio.gather(*scrape_tasks)

        # Launch search for all products concurrently
        search_tasks = [
            asyncio.create_task(search_and_trigger_scrape(product, count))
            for product, count in low_stock.items()
        ]
        await asyncio.gather(*search_tasks)

    # Sort results to keep output deterministic
    all_search_results.sort(key=lambda x: (x["product"], x["url"]))
    all_verified_results.sort(key=lambda x: (x["product"], x["site"], x["url"]))

    return all_search_results, all_verified_results