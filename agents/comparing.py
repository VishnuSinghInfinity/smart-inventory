from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os
load_dotenv()
model = ChatGroq(
    model = "openai/gpt-oss-120b",
    temperature = 0.7,
    api_key = os.getenv("GROQ_API_KEY"),
    max_tokens=3000
)
from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os

load_dotenv()

model = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0.7,
    api_key=os.getenv("GROQ_API_KEY"),
    max_tokens=3000
)

def comparing_agent(results: list[dict]):
    """
    results: list of dicts, each with keys:
        'product', 'site', 'price', 'delivery', 'url'
    """
    formatted_data = "\n".join(
        f"- Product: {r['product']}, Site: {r['site']}, Price: {r['price']}, "
        f"Delivery: {r['delivery']}, URL: {r['url']}"
        for r in results
    )

    prompt = f"""
You are a retail inventory management assistant.
You are given price and delivery information for low-stock products scraped from multiple trusted e-commerce platforms:

{formatted_data}

Your task is to compare prices across platforms for each product and identify the best deal.
Return the output as a markdown table with these exact columns:
Product Name | E-commerce Platform | Price | Delivery Date | Product URL

If price or delivery info says "not found", search for the price of the product from the provided URLs.
"""
    response = model.invoke(prompt)
    return response.content