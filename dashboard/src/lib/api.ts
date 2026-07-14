import axios from 'axios'

const http = axios.create({ baseURL: '/api' })

export interface HealthStatus {
  status: string
  groq_api_key: boolean
  tavily_api_key: boolean
}

export interface InventoryData {
  [product: string]: number
}

export interface ProductMaster {
  category: string
  unit: string
  supplier: string
  cost_price: number
  selling_price: number
  current_stock: number
  manufacturing_date: string
  expiry_date: string
  days_until_expiry: number
}

export interface ProductMetric {
  current_stock: number
  daily_sales: number[]
  days_until_expiry: number
  expiry_date: string
  category: string
  unit: string
  supplier: string
  cost_price: number
  selling_price: number
  avg_daily_sales_7d: number
  avg_daily_sales_prior7d: number
  trend_pct: number
  days_of_stock_left: number
}

export interface Trigger {
  product: string
  action: 'discount' | 'restock'
  urgency: 'urgent' | 'high' | 'moderate'
  suggested_value: string
  expiry_days: number
  avg_daily_sales_7d: number
  trend_pct: number
  current_stock: number
  days_of_stock_left: number
}

export interface Recommendation extends Trigger {
  headline: string
  detail: string
}

export interface SalesMetricsResponse {
  metrics: Record<string, ProductMetric>
  history: Record<string, number[]>
  triggers: Trigger[]
  discount_triggers: Trigger[]
  restock_triggers: Trigger[]
  baseline_products: string[]
  thresholds: {
    near_expiry_days: number
    low_stock_days: number
    trend_up_pct: number
  }
}

export interface RestockRow {
  'Product Name': string
  'E-commerce Platform': string
  'Price': string
  'Delivery Date': string
  'Product URL': string
}

export interface PipelineEvent {
  stage: number
  status: 'running' | 'progress' | 'complete' | 'error' | 'done'
  message: string
  data?: RestockRow[] | object[]
  raw?: string
}

export interface ChatResponse {
  reply: string
  action?: { type: string; [k: string]: unknown } | null
  chat_history: { role: string; content: string }[]
}

export interface ThresholdUpdate {
  near_expiry_days?: number
  low_stock_days?: number
  trend_up_pct?: number
}

export type DetectionProgressEvent =
  | { type: 'start';    total_frames: number }
  | { type: 'progress'; frame: number; total: number; pct: number }
  | { type: 'done';     inventory: InventoryData }
  | { type: 'error';    detail: string }

// ── API METHODS ────────────────────────────────────────────────────────────
export const api = {
  health: (): Promise<HealthStatus> => http.get('/health').then(r => r.data),

  loadSample: (): Promise<{ inventory: InventoryData }> =>
    http.post('/detect/sample').then(r => r.data),

  uploadInventoryJson: (file: File): Promise<{ inventory: InventoryData }> => {
    const fd = new FormData(); fd.append('file', file)
    return http.post('/detect/upload-json', fd).then(r => r.data)
  },

  detectVideo: (file: File, conf = 0.75, weightsPath = 'final_best.pt'): Promise<{ inventory: InventoryData }> => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('conf', String(conf))
    fd.append('weights_path', weightsPath)
    return http.post('/detect/video', fd).then(r => r.data)
  },

  /**
   * Streams YOLO detection progress via SSE.
   * Calls onEvent for every frame-progress event.
   * Calls onDone(inventory) when complete.
   * Calls onError(detail) on failure.
   */
  detectVideoStream(
    file: File,
    conf: number,
    weightsPath: string,
    onEvent: (e: DetectionProgressEvent) => void,
    onDone: (inventory: InventoryData) => void,
    onError: (detail: string) => void
  ): AbortController {
    const controller = new AbortController()
    const fd = new FormData()
    fd.append('file', file)
    fd.append('conf', String(conf))
    fd.append('weights_path', weightsPath)

    fetch('/api/detect/video/stream', {
      method: 'POST',
      body: fd,
      signal: controller.signal,
    }).then(async res => {
      if (!res.ok || !res.body) {
        onError(`HTTP ${res.status}: ${res.statusText}`)
        return
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const event: DetectionProgressEvent = JSON.parse(line.slice(6))
            onEvent(event)
            if (event.type === 'done') onDone(event.inventory)
            if (event.type === 'error') onError(event.detail)
          } catch {}
        }
      }
    }).catch(err => {
      if (err.name !== 'AbortError') onError(err.message ?? 'Stream error')
    })

    return controller
  },

  getInventory: (): Promise<{ inventory: InventoryData | null }> =>
    http.get('/inventory').then(r => r.data),

  getInventoryMaster: (): Promise<{ master: Record<string, ProductMaster> }> =>
    http.get('/inventory/master').then(r => r.data),

  getSalesMetrics: (): Promise<SalesMetricsResponse> =>
    http.get('/sales/metrics').then(r => r.data),

  updateThresholds: (body: ThresholdUpdate): Promise<ThresholdUpdate> =>
    http.patch('/sales/thresholds', body).then(r => r.data),

  generateRecommendations: (triggers: Trigger[]): Promise<{ recommendations: Recommendation[]; warning?: string }> =>
    http.post('/sales/recommendations', { triggers }).then(r => r.data),

  chat: (message: string): Promise<ChatResponse> =>
    http.post('/chat', { message }).then(r => r.data),

  clearChat: (): Promise<{ status: string }> =>
    http.delete('/chat').then(r => r.data),

  /** Returns an EventSource URL for SSE — caller manages the stream */
  pipelineUrl: (threshold = 70): string => `/api/restock/pipeline?threshold=${threshold}`,
}
