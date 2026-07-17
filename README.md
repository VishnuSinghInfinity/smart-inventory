# ShelfSense: Real-Time Shelf Intelligence & Autonomous Retail Agent

ShelfSense is an enterprise-grade retail inventory optimization and autonomous procurement platform. It bridges the gap between physical retail shelves and digital supply chain workflows by combining **Computer Vision (YOLOv8 + ByteTrack)**, **Predictive Rule Engines**, **Autonomous Web Scraping Agents**, and **Generative LLMs** into a unified dark-themed dashboard.

The application is built to optimize FMCG (Fast-Moving Consumer Goods) operations, minimize stockouts, reduce near-expiry waste, and automatically source replenishment deals from Indian wholesale e-commerce platforms.

---

## 🏗️ System Architecture & Data Flow

ShelfSense is divided into a high-performance Python backend and a modern React dashboard. The workflow operates in a closed loop:

```
[Shelf Video] ──> (YOLOv8 + ByteTrack) ──> [Live SKU Counts]
                                                  │
                                                  ▼
[Groq LLM Copy] <── (Rule-Based Triggers) <── [Sales Forecasting]
        │                                         │
        ▼                                         ▼
[Marketing Promo]                         (Tavily + Playwright)
                                                  │
                                                  ▼
                                          [Competitor Deals]
                                          (Amazon / Flipkart / Blinkit)
```

1. **Computer Vision Ingestion**: A store associate uploads a video of the supermarket shelves. The backend runs YOLOv8 and ByteTrack frame-by-frame to accurately count products, identify layout shortages, and update the live inventory.
2. **Predictive Analytics & Thresholding**: The system forecasts the days-of-stock-left by processing historical sales data against rule-engine parameters (low stock limit, near-expiry days, week-over-week trends).
3. **Autonomous Procurement & Scraping**: When a product crosses below the safety stock limit, the system spawns an autonomous agent. The agent uses Tavily to find product listings and Playwright to scrape real-time prices across Amazon India, Flipkart, and Blinkit, compiling the cheapest sourcing options.
4. **AI Synthesis & Copilot**: For items near expiry, the system uses Groq to instantly generate targeted clearance marketing copy. For items running low, it synthesizes automated purchase drafts and suggests optimal replenishment quantities.

---

## 🛠️ Tech Stack

### Frontend (Dashboard)
- **Framework**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS v4
- **Charts**: Recharts (with custom dark-glass thematic skins)
- **Icons**: Lucide React
- **Design System**: Customized dark-glassmorphism theme (`#0A0D14` base, transparent panels, emerald indicators, responsive viewport grids)

### Backend (API & AI Pipelines)
- **API Framework**: FastAPI, Uvicorn (Server-Sent Events for live CV stream updates)
- **Computer Vision**: OpenCV, Ultralytics YOLOv8, ByteTrack object tracking
- **AI Agents & LLM**: Groq (Llama-3-120B / Mixtral / Gemma engines)
- **Web Scraping & Search**: Playwright (headless browser automation), BeautifulSoup4, Tavily Search API

---

## 🚦 Core Modules

### 1. Dashboard Overview
Provides a bird's-eye view of store operations: SKU health indicators, real-time alert logs (indicating whether discount or restock triggers are tripped), and a 30-day sales velocity line chart representing leading products.

### 2. YOLO + ByteTrack Inventory Scan
Handles shelf monitoring. Users upload a raw video file, select confidence thresholds, and run the pipeline. The UI logs progress frame-by-frame and plots the live status (In Stock, Low Stock, or Critical) on a visual shelf-layout card grid.

### 3. Sales Forecasting & Rule Engine
Simulates 30-day velocity profiles. Features interactive slider inputs allowing operators to calibrate the rule engine: adjusting the "Near Expiry" window, setting the "Low Stock" day threshold, and configuring "Trending Up" percentage definitions.

### 4. Competitor Sourcing Agent
Triggers the web scraper pipeline. Spawns browser automation to search, verify, and compare wholesale prices from regional Indian distributors, sorting listings automatically to identify the single lowest price option.

### 5. AI Sales Copilot
Uses LLMs to automate tasks. Generates marketing discount text and bulk orders based on the rules triggered, complete with estimated daily sale stats, weekly trends, and target pricing.

### 6. Interactive Store Catalog
A clean, premium product showcase focusing on Indian retail compliance:
- Accurate pricing denominated in **Indian Rupees (₹)**.
- Full retail documentation: Country of Origin, Parent Manufacturers, HSN codes, and GST slabs.
- Detailed nutrition values for food SKUs and structural specifications.
- Quick **Amazon India**, **Flipkart**, and **Blinkit** search routing.

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Playwright dependencies

### 1. Setup Backend API
1. Navigate to the root directory.
2. Create a `.env` file containing:
   ```env
   GROQ_API_KEY=your_groq_api_key
   TAVILY_API_KEY=your_tavily_api_key
   ```
3. Create and activate a python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   playwright install
   ```
5. Spin up the FastAPI server:
   ```bash
   uvicorn api:app --reload --host 127.0.0.1 --port 8000
   ```

### 2. Setup Frontend Dashboard
1. Navigate to the `dashboard` directory:
   ```bash
   cd dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the dashboard at `http://localhost:5173` (or the port indicated in the terminal).
