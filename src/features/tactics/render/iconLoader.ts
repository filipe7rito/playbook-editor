/**
 * Icon loader utility for caching and loading SVG icons
 */

const iconCache = new Map<string, HTMLImageElement>()
const loadingPromises = new Map<string, Promise<HTMLImageElement>>()

export function loadIcon(src: string): Promise<HTMLImageElement> {
  // Return cached image if available
  const cached = iconCache.get(src)
  if (cached) {
    return Promise.resolve(cached)
  }

  // Return existing promise if already loading
  const existingPromise = loadingPromises.get(src)
  if (existingPromise) {
    return existingPromise
  }

  // Create new loading promise
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      iconCache.set(src, img)
      loadingPromises.delete(src)
      resolve(img)
    }
    img.onerror = () => {
      loadingPromises.delete(src)
      reject(new Error(`Failed to load icon: ${src}`))
    }
    img.src = src
  })

  loadingPromises.set(src, promise)
  return promise
}

// Export cache for direct access (used by renderScene)
export function getIcon(src: string): HTMLImageElement | undefined {
  return iconCache.get(src)
}

// Preload all training icons
export function preloadIcons(): Promise<void> {
  const icons = [
    '/icons/training/cone.svg',
    '/icons/training/flag.svg',
    '/icons/training/ball.svg',
    '/icons/training/disc.svg',
    '/icons/training/goal-topview.svg',
    '/icons/training/goal.svg', // Fallback
  ]

  return Promise.all(icons.map(loadIcon))
    .then(() => {})
    .catch(() => {
      // Silently fail - icons will load on demand
    })
}
