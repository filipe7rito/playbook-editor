import { Scene } from '../engine/types'
import type { Viewport } from '../engine/viewport'
import { getFieldDimensions } from '../engine/viewport'

// Standard soccer field dimensions (for half field calculations)
const FULL_FIELD_WIDTH = 105 // meters
const FULL_FIELD_HEIGHT = 68 // meters

export function drawPitch(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  scene: Scene,
) {
  // Clear entire canvas
  ctx.clearRect(0, 0, viewport.canvasWidth, viewport.canvasHeight)

  // Fill green area with rounded corners
  const greenCornerRadius =
    Math.min(viewport.greenWidth, viewport.greenHeight) * 0.02
  ctx.fillStyle = '#0b6b3a'
  ctx.beginPath()
  ctx.roundRect(
    viewport.greenX,
    viewport.greenY,
    viewport.greenWidth,
    viewport.greenHeight,
    greenCornerRadius,
  )
  ctx.fill()

  // Subtle stripes within green area (with rounded corners clipping)
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(
    viewport.greenX,
    viewport.greenY,
    viewport.greenWidth,
    viewport.greenHeight,
    greenCornerRadius,
  )
  ctx.clip()

  ctx.globalAlpha = 0.12
  const stripeCount = 10
  const isHalfPitch = scene.pitch.type === 'half'
  
  if (isHalfPitch) {
    // Horizontal stripes for half pitch
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000'
      ctx.fillRect(
        viewport.greenX,
        viewport.greenY + (viewport.greenHeight / stripeCount) * i,
        viewport.greenWidth,
        viewport.greenHeight / stripeCount,
      )
    }
  } else {
    // Vertical stripes for full and free pitch
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000'
      ctx.fillRect(
        viewport.greenX + (viewport.greenWidth / stripeCount) * i,
        viewport.greenY,
        viewport.greenWidth / stripeCount,
        viewport.greenHeight,
      )
    }
  }
  ctx.restore()
  ctx.globalAlpha = 1

  // Grid (if enabled)
  if (scene.pitch.showGrid) {
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    const gridFieldType =
      scene.pitch.type === 'free'
        ? 'full' // Use full field dimensions for grid on free field
        : scene.pitch.type === 'half'
          ? 'full' // Use full field dimensions for grid on half field
          : scene.pitch.type
    const fieldDims = getFieldDimensions(
      gridFieldType as 'full' | 'half' | 'quarter',
    )

    for (let x = 0; x <= fieldDims.width; x += 5) {
      const px = viewport.greenX + x * viewport.scale
      ctx.beginPath()
      ctx.moveTo(px, viewport.greenY)
      ctx.lineTo(px, viewport.greenY + viewport.greenHeight)
      ctx.stroke()
    }
    for (let y = 0; y <= fieldDims.height; y += 5) {
      const py = viewport.greenY + y * viewport.scale
      ctx.beginPath()
      ctx.moveTo(viewport.greenX, py)
      ctx.lineTo(viewport.greenX + viewport.greenWidth, py)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // Pitch lines - draw within green area
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.95

  // Determine field type for calculations and actual type
  const actualFieldType = scene.pitch.type

  // Free field: no lines, just green area
  if (actualFieldType === 'free') {
    // Don't draw any pitch lines, just the green area with stripes
    ctx.globalAlpha = 1
    return
  }

  if (actualFieldType === 'full') {
    // Full field: horizontal, fills the green area with padding
    // Add padding inside green area (increased for more space around pitch)
    const padding = Math.min(viewport.greenWidth, viewport.greenHeight) * 0.04 // 4% padding
    const w = viewport.greenWidth - padding * 2
    const h = viewport.greenHeight - padding * 2
    const x0 = viewport.greenX + padding
    const y0 = viewport.greenY + padding

    // Outer boundary (straight lines, green area already has rounded corners)
    ctx.strokeRect(x0, y0, w, h)

    // Halfway line
    ctx.beginPath()
    ctx.moveTo(x0 + w / 2, y0)
    ctx.lineTo(x0 + w / 2, y0 + h)
    ctx.stroke()

    // Center circle
    const centerX = x0 + w / 2
    const centerY = y0 + h / 2
    const radius = h * 0.12
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()

    // Penalty boxes (proportional to field dimensions)
    const boxW = w * 0.16
    const boxH = h * 0.52
    const sixW = w * 0.06
    const sixH = h * 0.26

    // Left side boxes
    ctx.strokeRect(x0, y0 + (h - boxH) / 2, boxW, boxH)
    ctx.strokeRect(x0, y0 + (h - sixH) / 2, sixW, sixH)

    // Right side boxes
    ctx.strokeRect(x0 + w - boxW, y0 + (h - boxH) / 2, boxW, boxH)
    ctx.strokeRect(x0 + w - sixW, y0 + (h - sixH) / 2, sixW, sixH)

    // Penalty arcs (half ellipses) at the outer edge of penalty boxes
    // Penalty spot is at center of field vertically, arc extends from outer edge of penalty box
    const arcRadius = w * 0.06 // Reduced from 0.087 to make smaller
    const penaltySpotY = y0 + h / 2 // Center of field vertically

    // Left penalty arc - curves inward toward center
    ctx.beginPath()
    ctx.ellipse(
      x0 + boxW, // Center at the outer edge of left penalty box
      penaltySpotY,
      arcRadius,
      arcRadius * 1.3, // Slightly flattened vertically
      0,
      -Math.PI / 2, // Start from bottom (-90 degrees)
      Math.PI / 2, // End at top (90 degrees)
      false, // Counter-clockwise
    )
    ctx.stroke()

    // Right penalty arc - curves inward toward center
    ctx.beginPath()
    ctx.ellipse(
      x0 + w - boxW, // Center at the outer edge of right penalty box
      penaltySpotY,
      arcRadius,
      arcRadius * 1.3, // Slightly flattened vertically
      0,
      -Math.PI / 2, // Start from bottom (-90 degrees)
      Math.PI / 2, // End at top (90 degrees)
      true, // Clockwise
    )
    ctx.stroke()

    // Corner markers at all four corners
    const cornerRadius = w * 0.015
    // Top-left corner
    ctx.beginPath()
    ctx.arc(x0, y0, cornerRadius, 0, Math.PI / 2, false)
    ctx.stroke()
    // Top-right corner
    ctx.beginPath()
    ctx.arc(x0 + w, y0, cornerRadius, Math.PI / 2, Math.PI, false)
    ctx.stroke()
    // Bottom-left corner
    ctx.beginPath()
    ctx.arc(x0, y0 + h, cornerRadius, -Math.PI / 2, 0, false)
    ctx.stroke()
    // Bottom-right corner
    ctx.beginPath()
    ctx.arc(x0 + w, y0 + h, cornerRadius, Math.PI, -Math.PI / 2, false)
    ctx.stroke()
  } else if (actualFieldType === 'half') {
    // Half field: show zoomed-in half pitch VERTICALLY in the same green area
    // Items stay in same position, only lines change
    // Bottom boundary = halfway line (middle of full field)
    // Top boundary = goal line (where net/keeper stands)
    const padding = Math.min(viewport.greenWidth, viewport.greenHeight) * 0.04 // 4% padding
    const w = viewport.greenWidth - padding * 2
    const h = viewport.greenHeight - padding * 2
    const x0 = viewport.greenX + padding
    const y0 = viewport.greenY + padding

    // Outer boundary (straight lines, green area already has rounded corners)
    ctx.strokeRect(x0, y0, w, h)

    // Corner markers only at the top (goal line)
    const cornerRadius = w * 0.015
    // Top-left corner
    ctx.beginPath()
    ctx.arc(x0, y0, cornerRadius, 0, Math.PI / 2, false)
    ctx.stroke()
    // Top-right corner
    ctx.beginPath()
    ctx.arc(x0 + w, y0, cornerRadius, Math.PI / 2, Math.PI, false)
    ctx.stroke()

    // Determine which half to show (offensive = goal at top, defensive = goal at bottom)
    const halfSide = scene.pitch.halfSide || 'offensive'
    const isOffensive = halfSide === 'offensive'

    // For half field: width = 105m (full width), height = 34m (half of 68m)
    // Goal line is at the top (y0) for offensive, or bottom (y0 + h) for defensive
    // Halfway line is at the bottom (y0 + h) for offensive, or top (y0) for defensive

    // Penalty box dimensions (proportional)
    // Real dimensions: 16.5m wide, 16.5m deep
    // Stretched horizontally but keeping proportional relationship
    const boxW = w * 0.65 // A bit more width (was 0.55)
    const boxH = h * 0.4 // Proportional to width (real: 16.5/34 = 0.485, but adjusted for balance)

    // Goal area (6-yard box): 5.5m wide, 10m deep
    // Stretched horizontally but keeping proportional relationship
    const sixW = w * 0.28 // A bit more width (was 0.2)
    const sixH = h * 0.17 // A bit more height (was 0.15)

    if (isOffensive) {
      // Goal line at top (y0), halfway line at bottom (y0 + h)
      // Penalty box extends downward from goal line
      ctx.strokeRect(x0 + (w - boxW) / 2, y0, boxW, boxH)
      // Goal area (6-yard box) - inside penalty box, at goal line
      ctx.strokeRect(x0 + (w - sixW) / 2, y0, sixW, sixH)
    } else {
      // Goal line at bottom (y0 + h), halfway line at top (y0)
      // Penalty box extends upward from goal line
      ctx.strokeRect(x0 + (w - boxW) / 2, y0 + h - boxH, boxW, boxH)
      // Goal area (6-yard box) - inside penalty box, at goal line
      ctx.strokeRect(x0 + (w - sixW) / 2, y0 + h - sixH, sixW, sixH)
    }

    // Penalty spot (11m from goal line)
    const penaltySpotX = x0 + w / 2
    const penaltySpotDistance = h * 0.324 // 11m / 34m
    const penaltySpotY = isOffensive
      ? y0 + penaltySpotDistance
      : y0 + h - penaltySpotDistance
    ctx.beginPath()
    ctx.arc(penaltySpotX, penaltySpotY, 3, 0, Math.PI * 2)
    ctx.fill()

    // Penalty arc (9.15m radius) - half ellipse at bottom of penalty box
    const arcRadius = w * 0.12 // Increased from 0.087 to make larger
    const penaltyBoxBottomY = isOffensive ? y0 + boxH : y0 + h - boxH

    ctx.beginPath()
    if (isOffensive) {
      // Half ellipse at bottom of penalty box, curving upward (into the penalty box)
      ctx.ellipse(
        penaltySpotX,
        penaltyBoxBottomY,
        arcRadius,
        arcRadius * 0.6, // Slightly flattened vertically
        0,
        0, // Start from right (0 degrees)
        Math.PI, // End at left (180 degrees)
        false, // Counter-clockwise
      )
    } else {
      // Half ellipse at bottom of penalty box, curving downward (into the penalty box)
      ctx.ellipse(
        penaltySpotX,
        penaltyBoxBottomY,
        arcRadius,
        arcRadius * 0.6, // Slightly flattened vertically
        0,
        Math.PI, // Start from left (180 degrees)
        0, // End at right (0 degrees)
        false, // Counter-clockwise
      )
    }
    ctx.stroke()

    // Center circle arc at the halfway line (showing it's half the field)
    // Halfway line is at the bottom for offensive, top for defensive
    // Real radius: 9.15m, stretched horizontally but proportional
    const centerCircleRadius = w * 0.12 // Stretched from real 9.15/105 = 0.087
    const halfwayLineY = isOffensive ? y0 + h : y0
    ctx.beginPath()
    if (isOffensive) {
      // Half ellipse at bottom (halfway line), curving downward
      ctx.ellipse(
        x0 + w / 2,
        halfwayLineY,
        centerCircleRadius,
        centerCircleRadius * 0.7, // Slightly flattened vertically
        0,
        Math.PI, // Start from left (180 degrees)
        0, // End at right (0 degrees)
        false, // Counter-clockwise
      )
    } else {
      // Half ellipse at top (halfway line), curving upward
      ctx.ellipse(
        x0 + w / 2,
        halfwayLineY,
        centerCircleRadius,
        centerCircleRadius * 0.6, // Slightly flattened vertically
        0,
        0, // Start from right (0 degrees)
        Math.PI, // End at left (180 degrees)
        false, // Counter-clockwise
      )
    }
    ctx.stroke()
  }

  ctx.globalAlpha = 1
}
