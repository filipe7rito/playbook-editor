import type { Point } from './types'

/**
 * Viewport system that maintains a fixed green area and scales properly
 * All field types (full, half, quarter) fit within the same green area
 */

export type Viewport = {
  // Canvas dimensions (CSS pixels)
  canvasWidth: number
  canvasHeight: number

  // Green area dimensions (logical units - same for all field types)
  greenWidth: number
  greenHeight: number

  // Green area position (centered in canvas)
  greenX: number
  greenY: number

  // Scale factor from logical to canvas pixels
  scale: number
}

// Standard soccer field dimensions (logical units)
// These are the dimensions we use for calculations
const FULL_FIELD_WIDTH = 105 // meters (logical units)
const FULL_FIELD_HEIGHT = 68 // meters (logical units)

// Green area aspect ratio adjustment
// Options:
// - 1.0 = standard soccer field aspect ratio (105m x 68m = ~1.544)
// - 0.9 = 10% taller (more square-like)
// - 0.85 = 15% taller (even more square)
// - 0.8 = 20% taller (very square)
// - 1.1 = 10% wider (less tall)
// Adjust this value to change how tall the green area appears
const GREEN_AREA_HEIGHT_FACTOR = 0.9

// Aspect ratios for different field types
const FIELD_ASPECT_RATIOS = {
  full: FULL_FIELD_WIDTH / FULL_FIELD_HEIGHT, // ~1.544
  half: FULL_FIELD_WIDTH / 2 / FULL_FIELD_HEIGHT, // ~0.772
  quarter: FULL_FIELD_WIDTH / 2 / (FULL_FIELD_HEIGHT / 2), // ~1.544
} as const

/**
 * Calculate viewport for a given canvas size and field type
 * The green area is ALWAYS the same size regardless of field type
 * - Full field: horizontal, fills the green area
 * - Half/Quarter fields: vertical, drawn within the same green area
 */
export function calculateViewport(
  canvasWidth: number,
  canvasHeight: number,
  fieldType: 'full' | 'half' | 'quarter',
  orientation: 'horizontal' | 'vertical',
): Viewport {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return {
      canvasWidth: 0,
      canvasHeight: 0,
      greenWidth: 0,
      greenHeight: 0,
      greenX: 0,
      greenY: 0,
      scale: 1,
    }
  }

  // ALWAYS use FULL field aspect ratio to determine the fixed green area size
  // This ensures all field types use the exact same green rectangle
  // Adjust aspect ratio based on GREEN_AREA_HEIGHT_FACTOR to make field taller/shorter
  const fullFieldAspect = FIELD_ASPECT_RATIOS.full * GREEN_AREA_HEIGHT_FACTOR
  const canvasAspect = canvasWidth / canvasHeight

  let greenWidth: number
  let greenHeight: number

  // Always use full field aspect ratio for green area size (horizontal)
  // Add padding around the field (padding is a percentage of the smaller dimension)
  const padding = Math.min(canvasWidth, canvasHeight) * 0.01 // 1% padding (minimal padding for bigger pitch)
  const canvasUsage = 0.97 // Use 97% of canvas (bigger pitch)

  if (canvasAspect > fullFieldAspect) {
    // Canvas is wider than full field aspect - height is limiting
    greenHeight = canvasHeight * canvasUsage - padding * 2
    greenWidth = greenHeight * fullFieldAspect
  } else {
    // Canvas is taller than full field aspect - width is limiting
    greenWidth = canvasWidth * canvasUsage - padding * 2
    greenHeight = greenWidth / fullFieldAspect
  }

  // Center the green area in the canvas
  const greenX = (canvasWidth - greenWidth) / 2
  const greenY = (canvasHeight - greenHeight) / 2

  // Calculate scale based on field type
  // Full field: horizontal, uses full green area
  // Half/Quarter: vertical, fits within the same green area
  const fieldDims = getFieldDimensions(fieldType)

  if (fieldType === 'full') {
    // Full field: horizontal, fills the green area
    const scaleX = greenWidth / fieldDims.width
    const scaleY = greenHeight / fieldDims.height
    const scale = Math.min(scaleX, scaleY)
    return {
      canvasWidth,
      canvasHeight,
      greenWidth,
      greenHeight,
      greenX,
      greenY,
      scale,
    }
  } else {
    // Half field: items stay in same position, use full field scale
    // The pitch lines are drawn differently, but coordinate system stays the same
    // Use full field dimensions for scale calculation
    const fullFieldDims = getFieldDimensions('full')
    const scaleX = greenWidth / fullFieldDims.width
    const scaleY = greenHeight / fullFieldDims.height
    const scale = Math.min(scaleX, scaleY)
    return {
      canvasWidth,
      canvasHeight,
      greenWidth,
      greenHeight,
      greenX,
      greenY,
      scale,
    }
  }
}

/**
 * Convert canvas pixel coordinates to logical field coordinates
 * Handles rotation for half/quarter fields (vertical orientation)
 */
export function canvasToField(
  point: Point,
  viewport: Viewport,
  _fieldType: 'full' | 'half' | 'quarter' | 'free' = 'full',
): Point {
  // For half field, items stay in same position - use full field coordinates
  // Only the pitch lines change, not the coordinate system
  // Full field: horizontal, direct conversion
  const x = (point.x - viewport.greenX) / viewport.scale
  const y = (point.y - viewport.greenY) / viewport.scale
  return { x, y }
}

/**
 * Convert logical field coordinates to canvas pixel coordinates
 * Handles rotation for half/quarter fields (vertical orientation)
 */
export function fieldToCanvas(
  point: Point,
  viewport: Viewport,
  _fieldType: 'full' | 'half' | 'quarter' | 'free' = 'full',
): Point {
  // For half field, items stay in same position - use full field coordinates
  // Only the pitch lines change, not the coordinate system
  // Full field: horizontal, direct conversion
  const x = point.x * viewport.scale + viewport.greenX
  const y = point.y * viewport.scale + viewport.greenY
  return { x, y }
}

/**
 * Get the logical dimensions for a field type
 */
export function getFieldDimensions(fieldType: 'full' | 'half' | 'quarter') {
  return {
    width:
      fieldType === 'full'
        ? FULL_FIELD_WIDTH
        : fieldType === 'half'
          ? FULL_FIELD_WIDTH / 2
          : FULL_FIELD_WIDTH / 2,
    height:
      fieldType === 'full'
        ? FULL_FIELD_HEIGHT
        : fieldType === 'half'
          ? FULL_FIELD_HEIGHT
          : FULL_FIELD_HEIGHT / 2,
  }
}

/**
 * Clamp a point to stay within the field bounds
 */
export function clampToFieldBounds(
  point: Point,
  _viewport: Viewport,
  fieldType: 'full' | 'half' | 'quarter' | 'free',
): Point {
  // Always use full field dimensions for clamping
  // Coordinate system is always full field, regardless of pitch type
  const fieldDims = getFieldDimensions('full')
  return {
    x: Math.max(0, Math.min(fieldDims.width, point.x)),
    y: Math.max(0, Math.min(fieldDims.height, point.y)),
  }
}
