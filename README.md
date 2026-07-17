🛒 ShelfSense — Real-Time Shelf Intelligence & Autonomous Retail Agent

«"A shelf that can see, think, and recommend restocking automatically."»

ShelfSense is an AI-powered retail intelligence platform that continuously monitors store shelves using computer vision, identifies low-stock and slow-moving products, and autonomously recommends the best suppliers for replenishment.

Built for Inhacks hackathon of cpbyte, ShelfSense combines Computer Vision, Agentic AI, Web Intelligence, and Large Language Models into one intelligent retail ecosystem.

---

📌 Problem Statement

Retail stores and supermarkets often face two major challenges:

🚫 Stockouts

Products become unavailable before store managers notice.

Impact

- Lost sales opportunities
- Unsatisfied customers
- Reduced customer loyalty

---

🗑️ Inventory Waste

Products remain on shelves for too long and may expire.

Impact

- Financial losses
- Increased wastage
- Poor inventory planning

---

👨‍💼 Manual Shelf Monitoring

Employees must manually inspect shelves and inventory.

Impact

- Time-consuming
- Human errors
- Difficult to scale

---

💡 Our Solution

ShelfSense automates the complete inventory monitoring process.

The system:

✅ Watches shelves using cameras
✅ Detects and counts products in real time
✅ Predicts low-stock situations
✅ Searches suppliers automatically
✅ Compares prices and delivery options
✅ Generates AI-powered recommendations

---

🚀 Key Features

📷 Real-Time Shelf Monitoring

Continuously monitors shelves through live camera feeds.

🧠 AI Product Detection

Uses YOLO to identify products and estimate inventory levels.

🔄 Multi-Object Tracking

Tracks products across frames using ByteTrack to avoid double counting.

⚠️ Smart Restocking Alerts

Automatically identifies products that need replenishment.

🤖 Autonomous Procurement Agent

Searches online wholesale suppliers and compares deals.

📊 Intelligent Dashboard

Displays inventory status, alerts, and supplier recommendations.

📝 LLM-Powered Recommendations

Provides easy-to-understand procurement suggestions.

---

🏗️ System Architecture

                    📷 Camera Feed
                            │
                            ▼
        ┌────────────────────────────────┐
        │      Product Detection          │
        │        (YOLOv8/YOLO11)          │
        └────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────────────────┐
        │       Product Tracking          │
        │          (ByteTrack)            │
        └────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────────────────┐
        │      Shelf Intelligence         │
        │  Product Count + Dwell Time     │
        └────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────────────────┐
        │      Predictive Rule Engine     │
        │   Low Stock & Expiry Detection  │
        └────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────────────────┐
        │   Autonomous Sourcing Agent     │
        │  Search + Scrape Suppliers      │
        └────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────────────────┐
        │      LLM Recommendation         │
        │   Price & Vendor Comparison     │
        └────────────────────────────────┘
                            │
                            ▼
                    📊 Dashboard

---

🔄 How ShelfSense Works

Step 1: Shelf Monitoring

A camera continuously captures shelf images.

The system answers:

- Which products are present?
- How many units remain?
- Which products are selling fast?
- Which products need replenishment?

---

Step 2: Product Detection

Using YOLOv8/YOLO11, products are detected with bounding boxes.

Example:

Product| Quantity
Maggi| 10
Coca-Cola| 5
Parle-G| 2

---

Step 3: Product Tracking

Using ByteTrack, ShelfSense tracks products across frames.

This helps:

- Handle occlusions
- Avoid double counting
- Maintain accurate inventory estimates

---

Step 4: Inventory Intelligence

The system stores shelf information:

{
  "Product": "Maggi",
  "Quantity": 3,
  "Threshold": 5,
  "ShelfDays": 20
}

Rules:

if quantity < threshold:
    trigger_restock()

if shelf_days > expiry_limit:
    generate_alert()

---

Step 5: Autonomous Procurement

When stock becomes low:

1. Product is identified.
2. AI agent searches suppliers.
3. Prices are scraped.
4. Deals are compared.
5. Recommendation is generated.

---

Step 6: Supplier Comparison

The system collects:

- Price
- Delivery time
- Ratings
- Minimum order quantity
- Discounts

Example:

Supplier| Price| Delivery
Supplier A| ₹420| 1 Day
Supplier B| ₹390| 3 Days
Supplier C| ₹405| Same Day

---

Step 7: AI Recommendation

Instead of displaying raw data, the LLM generates simple recommendations.

Example:

«Supplier B provides the lowest price, while Supplier C offers same-day delivery and may be preferable for urgent restocking.»

---

📊 Dashboard Features

🟢 Live Shelf Status

Real-time inventory overview.

🔴 Low Stock Alerts

Immediate notification when products fall below threshold.

🟡 Near Expiry Alerts

Highlights products that may soon expire.

📈 Sales Intelligence

Shows fast-moving and slow-moving items.

🤖 Supplier Recommendations

Displays best vendors for replenishment.

---

🛠️ Technology Stack

Layer| Technology
Object Detection| YOLOv8 / YOLO11
Object Tracking| ByteTrack
Backend| Python
AI Agent Framework| LangChain
Search Engine| Tavily API
Web Scraping| Playwright
LLM| Groq
Frontend| React
Dataset Annotation| Roboflow
Database| SQLite / PostgreSQL

---

📂 Project Structure

ShelfSense/
│
├── backend/
│   ├── detection/
│   ├── tracking/
│   ├── inventory_engine/
│   ├── agents/
│   ├── scraping/
│   └── api/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   └── dashboard/
│
├── datasets/
├── models/
├── docs/
├── requirements.txt
├── package.json
└── README.md

---

Database link: https://drive.google.com/drive/folders/1HXqqo1ish-tchX1AVGgflIvPox4apT_J?usp=sharing 

🚀 Installation

Clone Repository

git clone https://github.com/your-username/ShelfSense.git
cd ShelfSense

---

Install Backend Dependencies

pip install -r requirements.txt

---

Install Frontend Dependencies

cd frontend
npm install

---

Run Backend

python main.py

---

Run Frontend

npm run dev

---

🎯 Example Workflow

Customer buys products
            ↓
Shelf quantity decreases
            ↓
AI detects low stock
            ↓
Restock alert generated
            ↓
Agent searches suppliers
            ↓
Prices are compared
            ↓
LLM recommends best supplier
            ↓
Dashboard displays action

---

🌍 Applications

- Supermarkets
- Kirana Stores
- Smart Retail Stores
- Warehouses
- Pharmacies
- FMCG Distribution Centers
- Automated Stores

---

🔮 Future Scope

📈 Demand Forecasting

Predict future product demand.

🧾 Automatic Purchase Orders

Generate purchase orders automatically.

🛰️ Multi-Store Monitoring

Manage multiple stores from one dashboard.

🎤 Voice Assistant

Query inventory using natural language.

📱 Mobile Application

Remote inventory monitoring and alerts.

---

🏆 Why ShelfSense?

ShelfSense transforms traditional shelves into intelligent retail systems that can:

👀 See products
🧠 Understand inventory status
⚡ Predict stock shortages
🛒 Recommend replenishment actions

Ultimately helping retailers reduce losses, improve efficiency, and create smarter stores.

---

👥 Team

Built with ❤️ for inhacks hackathon of cpbyte.

---
LinkedIn url of developers:
Member 1:https://www.linkedin.com/in/ali-shahir
Member 2:https://www.linkedin.com/in/vishnu-singh-1b7334381?utm_source=share_via&utm_content=profile&utm_medium=member_android
Member 3:https://www.linkedin.com/in/vivek-kumar-538295358?utm_source=share_via&utm_content=profile&utm_medium=member_android
