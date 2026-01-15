import type { Scene } from './types'
import { deepClone } from './utils'

export type SavedItemType = 'training' | 'tactics'

export type SavedItem = {
  id: string
  title: string
  type: SavedItemType
  scene: Scene
  preview?: string // Base64 data URL for thumbnail
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'tactics-editor-saved-items'

/**
 * Get all saved items from localStorage
 */
export function getSavedItems(): SavedItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Save an item to localStorage
 */
export function saveItem(item: Omit<SavedItem, 'id' | 'createdAt' | 'updatedAt'>): SavedItem {
  const items = getSavedItems()
  const newItem: SavedItem = {
    ...item,
    id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  items.push(newItem)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  return newItem
}

/**
 * Update an existing item
 */
export function updateItem(
  id: string,
  updates: Partial<Omit<SavedItem, 'id' | 'createdAt'>>,
): SavedItem | null {
  const items = getSavedItems()
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return null

  items[index] = {
    ...items[index],
    ...updates,
    updatedAt: Date.now(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  return items[index]
}

/**
 * Delete an item
 */
export function deleteItem(id: string): boolean {
  const items = getSavedItems()
  const filtered = items.filter((item) => item.id !== id)
  if (filtered.length === items.length) return false
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return true
}

/**
 * Generate a preview thumbnail from a scene
 */
export async function generatePreview(
  scene: Scene,
  width: number = 200,
  height: number = 120,
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      resolve('')
      return
    }

    // Import render functions dynamically to avoid circular dependencies
    import('../render/renderScene').then(({ renderScene }) => {
      import('../engine/viewport').then(({ calculateViewport }) => {
        const fieldType = scene.pitch.type === 'free' ? 'full' : scene.pitch.type
        const viewport = calculateViewport(width, height, fieldType, 'horizontal')
        renderScene(ctx, viewport, scene)
        resolve(canvas.toDataURL('image/png'))
      })
    })
  })
}
