import { create } from 'zustand'
import type { InventoryData } from '../lib/api'

interface InventoryStore {
  inventory: InventoryData | null
  setInventory: (d: InventoryData | null) => void
}

export const useInventoryStore = create<InventoryStore>(set => ({
  inventory: null,
  setInventory: d => set({ inventory: d }),
}))
