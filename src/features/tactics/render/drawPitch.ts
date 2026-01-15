import { Scene } from '../engine/types'
import type { Viewport } from '../engine/viewport'
import { getFieldDimensions } from '../engine/viewport'

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
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000'
    ctx.fillRect(
      viewport.greenX + (viewport.greenWidth / stripeCount) * i,
      viewport.greenY,
      viewport.greenWidth / stripeCount,
      viewport.greenHeight,
    )
  }
  ctx.restore()
  ctx.globalAlpha = 1

  // Grid (if enabled)
  if (scene.pitch.showGrid) {
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    const fieldDims = getFieldDimensions(
      scene.pitch.type === 'smallSided' ? 'quarter' : scene.pitch.type,
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

  const fieldType =
    scene.pitch.type === 'smallSided' ? 'quarter' : scene.pitch.type
  const fieldDims = getFieldDimensions(fieldType)

  if (fieldType === 'full') {
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
  } else {
    // Half/Quarter field: vertical, drawn within the same green area
    // Field is drawn vertically with goal at the top
    const fieldWidth = fieldDims.width * viewport.scale
    const fieldHeight = fieldDims.height * viewport.scale

    // Center the field within the green area
    const fieldX = viewport.greenX + (viewport.greenWidth - fieldHeight) / 2
    const fieldY = viewport.greenY + (viewport.greenHeight - fieldWidth) / 2

    // Outer boundary (vertical field) - straight lines, green area already has rounded corners
    ctx.strokeRect(fieldX, fieldY, fieldHeight, fieldWidth)

    // Goal line at the top (this is the end line with goal)
    ctx.beginPath()
    ctx.moveTo(fieldX, fieldY)
    ctx.lineTo(fieldX + fieldHeight, fieldY)
    ctx.stroke()

    // Penalty box dimensions (standard soccer proportions)
    // When vertical: width is along goal line (fieldHeight), depth extends down (fieldWidth)
    const boxW = fieldHeight * 0.243 // ~24.3% (16.5m / 68m) - penalty box width
    const boxH = fieldWidth * 0.593 // ~59.3% (40.32m / 68m) - penalty box depth (full height)
    const sixW = fieldHeight * 0.081 // ~8.1% (5.5m / 68m) - goal area width
    const sixH = fieldWidth * 0.147 // ~14.7% (10m / 68m) - goal area depth

    // Penalty box - extends from goal line downward, centered horizontally
    const boxX = fieldX + (fieldHeight - boxW) / 2
    ctx.strokeRect(boxX, fieldY, boxW, boxH)

    // Goal area (6-yard box) - inside penalty box, centered
    const sixX = fieldX + (fieldHeight - sixW) / 2
    ctx.strokeRect(sixX, fieldY, sixW, sixH)

    // Penalty arc (radius 9.15m from penalty spot)
    const penaltySpotX = fieldX + fieldHeight / 2
    const penaltySpotY = fieldY + boxH
    const arcRadius = fieldHeight * 0.135 // 9.15m / 68m
    ctx.beginPath()
    ctx.arc(
      penaltySpotX,
      penaltySpotY,
      arcRadius,
      -Math.PI / 2 - Math.acos(boxW / 2 / arcRadius),
      -Math.PI / 2 + Math.acos(boxW / 2 / arcRadius),
    )
    ctx.stroke()

    // Penalty spot (11m from goal line)
    if (fieldType === 'half') {
      const spotY = fieldY + fieldWidth * 0.162 // 11m / 68m
      ctx.beginPath()
      ctx.arc(penaltySpotX, spotY, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Corner arcs at top-left and top-right (radius 1m proportional)
    const cornerArcRadius = fieldHeight * 0.015
    // Top-left corner
    ctx.beginPath()
    ctx.arc(fieldX, fieldY, cornerArcRadius, 0, Math.PI / 2, false)
    ctx.stroke()
    // Top-right corner
    ctx.beginPath()
    ctx.arc(
      fieldX + fieldHeight,
      fieldY,
      cornerArcRadius,
      Math.PI / 2,
      Math.PI,
      false,
    )
    ctx.stroke()
  }

  ctx.globalAlpha = 1
}
