import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { Layout } from './components/Layout'
import Dashboard from './pages/Dashboard'
import InventoryMonitoring from './pages/InventoryMonitoring'
import SalesPrediction from './pages/SalesPrediction'
import CompetitorAnalysis from './pages/CompetitorAnalysis'
import AISalesAssistant from './pages/AISalesAssistant'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<InventoryMonitoring />} />
          <Route path="sales" element={<SalesPrediction />} />
          <Route path="competitor" element={<CompetitorAnalysis />} />
          <Route path="assistant" element={<AISalesAssistant />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
