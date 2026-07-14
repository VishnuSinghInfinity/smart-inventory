import { useState, useEffect } from 'react'
import { api, type HealthStatus } from '../lib/api'

export function useHealth() {
  const [data, setData] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = () => api.health().then(setData).catch(() => null).finally(() => setLoading(false))
    fetch()
    const id = setInterval(fetch, 30000)
    return () => clearInterval(id)
  }, [])

  return { data, loading }
}
