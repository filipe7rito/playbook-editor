import { LayerId, Point, Scene } from '../engine/types'
import type { Viewport } from '../engine/viewport'
import { fieldToCanvas } from '../engine/viewport'
import { drawPitch } from './drawPitch'
import { loadIcon, getIcon } from './iconLoader'

// Element scaling constraints
// Elements should scale with the pitch but stay within reasonable bounds
// These values clamp the element scale to prevent elements from becoming too large or too small
const MIN_ELEMENT_SCALE = 0.3 // Minimum scale multiplier (30% of base)
const MAX_ELEMENT_SCALE = 1.2 // Maximum scale multiplier (120% of base)
const BASE_CANVAS_WIDTH = 1440 // Reference canvas width for normalization

/**
 * Get clamped element scale that prevents elements from becoming too large or too small
 * Elements scale proportionally with the pitch: smaller screens = smaller elements
 */
function getElementScale(viewport: Viewport): number {
  // Calculate what the scale would be at the base canvas width
  // The viewport.scale is proportional to canvas size, so we normalize it
  // by comparing to what it would be at BASE_CANVAS_WIDTH
  // Smaller screens have smaller viewport.scale, so elements scale down appropriately

  // Estimate base scale: at 1440px width, with typical field dimensions
  // greenWidth ≈ 1440 * 0.97 = ~1397px, field width = 105m
  // base scale ≈ 1397 / 105 ≈ 13.3
  // But we want to normalize so elements scale proportionally with viewport
  // So we use: viewport.scale * (viewport.canvasWidth / BASE_CANVAS_WIDTH)
  // This makes elements smaller on smaller screens and larger on larger screens

  const normalizedScale =
    viewport.scale * (viewport.canvasWidth / BASE_CANVAS_WIDTH)
  return Math.max(
    MIN_ELEMENT_SCALE,
    Math.min(MAX_ELEMENT_SCALE, normalizedScale),
  )
}

function drawText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  scale: number = 1,
) {
  const fontSize = 14 * scale
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui`
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 4 * scale
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  scale: number = 1,
) {
  const headLen = 14 * scale
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(
    to.x - headLen * Math.cos(angle - Math.PI / 6),
    to.y - headLen * Math.sin(angle - Math.PI / 6),
  )
  ctx.lineTo(
    to.x - headLen * Math.cos(angle + Math.PI / 6),
    to.y - headLen * Math.sin(angle + Math.PI / 6),
  )
  ctx.closePath()
  ctx.fill()
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  scene: Scene,
  selectedId?: string,
  hoverId?: string,
) {
  drawPitch(ctx, viewport, scene)

  // For rendering, use 'full' for 'free' type (same coordinate system)
  const fieldType = scene.pitch.type === 'free' ? 'full' : scene.pitch.type
  // Get clamped element scale to prevent elements from becoming too large or too small
  const elementScale = getElementScale(viewport)
  const layerOrder: LayerId[] = ['base', 'drills', 'tactics']
  for (const layerId of layerOrder) {
    const layer = scene.layers[layerId]
    if (!layer.visible) continue

    const els = scene.elements.filter((e) => e.layer === layerId && !e.hidden)

    for (const el of els) {
      const isSel = el.id === selectedId
      const isHover = el.id === hoverId

      ctx.save()
      ctx.globalAlpha = el.locked ? 0.65 : 1

      if (el.kind === 'token') {
        const pos = fieldToCanvas({ x: el.x, y: el.y }, viewport, fieldType)
        // Scale token size with clamped element scale
        const radius = el.r * elementScale
        const size = radius * 2

        // Try to use SVG icon for specific token types
        let iconPath: string | null = null
        if (el.tokenType === 'cone') {
          iconPath = '/icons/training/cone.svg'
        } else if (el.tokenType === 'flag') {
          iconPath = '/icons/training/flag.svg'
        } else if (el.tokenType === 'ball') {
          iconPath = '/icons/training/ball.svg'
        } else if (el.tokenType === 'disc') {
          iconPath = '/icons/training/disc.svg'
        }

        const iconImg = iconPath ? getIcon(iconPath) : null

        if (iconImg && iconImg.complete) {
          // Draw SVG icon
          ctx.save()
          ctx.translate(pos.x, pos.y)
          ctx.drawImage(iconImg, -size / 2, -size / 2, size, size)
          ctx.restore()
        } else {
          // Fallback to simple shape
          const fill =
            el.tokenType === 'cone'
              ? 'rgba(255,198,0,0.95)'
              : el.tokenType === 'ball'
                ? 'rgba(255,255,255,0.95)'
                : el.tokenType === 'opponent'
                  ? 'rgba(255,80,80,0.95)'
                  : el.tokenType === 'flag'
                    ? 'rgba(255,100,100,0.95)'
                    : el.tokenType === 'disc'
                      ? 'rgba(100,200,100,0.95)'
                      : 'rgba(120,200,255,0.95)'

          ctx.fillStyle = fill
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'
          ctx.lineWidth = (isSel ? 4 : 3) * elementScale
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }

        // Draw number on top (works for both icon and fallback)
        if (typeof el.number === 'number') {
          const fontSize = 14 * elementScale
          ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui`
          ctx.fillStyle = 'rgba(0,0,0,0.8)'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(el.number), pos.x, pos.y)
          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'
        }

        // Load icon if not already loaded
        if (iconPath && !getIcon(iconPath)) {
          loadIcon(iconPath).catch(() => {
            // Silently fail - will use fallback shape
          })
        }

        // Draw number for icon (already handled in icon branch above)
        // Draw label for both icon and fallback
        if (el.label) {
          const fontSize = 14 * elementScale
          ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui`
          ctx.fillStyle = 'rgba(0,0,0,0.8)'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(el.number), pos.x, pos.y)
          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'
        }

        if (el.label) {
          const labelOffset = 6 * elementScale
          drawText(
            ctx,
            pos.x + radius + labelOffset,
            pos.y - radius - labelOffset,
            el.label,
            elementScale,
          )
        }

        if (isHover && !isSel) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 2 * elementScale
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, radius + 6 * elementScale, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      if (el.kind === 'zone') {
        // Skip rendering if zone has zero or negative size (during initial drawing)
        if (el.w <= 0 || el.h <= 0) {
          // Still show a small indicator at the start point
          const pos = fieldToCanvas({ x: el.x, y: el.y }, viewport, fieldType)
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'
          ctx.lineWidth = 2 * elementScale
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, 4 * elementScale, 0, Math.PI * 2)
          ctx.stroke()
          continue
        }
        
        const pos = fieldToCanvas({ x: el.x, y: el.y }, viewport, fieldType)
        const size = { w: el.w * viewport.scale, h: el.h * viewport.scale }

        const fillMap: Record<string, string> = {
          press: 'rgba(255, 80, 80, 0.25)',
          build: 'rgba(120, 200, 255, 0.22)',
          danger: 'rgba(255, 198, 0, 0.24)',
          custom: 'rgba(255,255,255,0.18)',
        }
        ctx.fillStyle = fillMap[el.fill ?? 'custom']
        ctx.globalAlpha = (el.opacity ?? 1) * (el.locked ? 0.65 : 1)
        ctx.fillRect(pos.x, pos.y, size.w, size.h)
        ctx.globalAlpha = el.locked ? 0.65 : 1
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'
        ctx.setLineDash([8 * elementScale, 6 * elementScale])
        ctx.strokeRect(pos.x, pos.y, size.w, size.h)
        ctx.setLineDash([])
        if (el.label)
          drawText(
            ctx,
            pos.x + 8 * elementScale,
            pos.y + 20 * elementScale,
            el.label,
            elementScale,
          )

        if (isHover && !isSel) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 2 * elementScale
          const hoverPadding = 2 * elementScale
          ctx.strokeRect(
            pos.x - hoverPadding,
            pos.y - hoverPadding,
            size.w + hoverPadding * 2,
            size.h + hoverPadding * 2,
          )
        }
      }

      if (el.kind === 'goal') {
        // Skip rendering if goal has zero or negative size (during initial drawing)
        if (el.w <= 0 || el.h <= 0) {
          // Still show a small indicator at the start point
          const pos = fieldToCanvas({ x: el.x, y: el.y }, viewport, fieldType)
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'
          ctx.lineWidth = 2 * elementScale
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, 4 * elementScale, 0, Math.PI * 2)
          ctx.stroke()
          continue
        }
        
        const pos = fieldToCanvas({ x: el.x, y: el.y }, viewport, fieldType)
        const size = { w: el.w * viewport.scale, h: el.h * viewport.scale }
        const rotation = el.rotation ?? 0

        // Try to use SVG icon (try top-view first, fallback to side view)
        let iconPath = '/icons/training/goal-topview.svg'
        let iconImg = getIcon(iconPath)
        // Fallback to side-view goal if top-view not available
        if (!iconImg || !iconImg.complete) {
          iconPath = '/icons/training/goal.svg'
          iconImg = getIcon(iconPath)
        }

        ctx.save()
        // Apply rotation if specified
        if (rotation !== 0) {
          ctx.translate(pos.x + size.w / 2, pos.y + size.h / 2)
          ctx.rotate((rotation * Math.PI) / 180)
          ctx.translate(-(pos.x + size.w / 2), -(pos.y + size.h / 2))
        }

        if (iconImg && iconImg.complete) {
          // Draw SVG icon
          ctx.drawImage(iconImg, pos.x, pos.y, size.w, size.h)
        } else {
          // Fallback to drawn goal posts
          // Draw goal posts (rectangular frame)
          ctx.strokeStyle = 'rgba(255,255,255,0.95)'
          ctx.lineWidth = (isSel ? 5 : 4) * elementScale
          ctx.strokeRect(pos.x, pos.y, size.w, size.h)

          // Draw net pattern (diagonal mesh)
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'
          ctx.lineWidth = 1 * elementScale
          const netSpacing = 6 * elementScale
          // Horizontal lines
          for (let y = pos.y + netSpacing; y < pos.y + size.h; y += netSpacing) {
            ctx.beginPath()
            ctx.moveTo(pos.x, y)
            ctx.lineTo(pos.x + size.w, y)
            ctx.stroke()
          }
          // Vertical lines
          for (let x = pos.x + netSpacing; x < pos.x + size.w; x += netSpacing) {
            ctx.beginPath()
            ctx.moveTo(x, pos.y)
            ctx.lineTo(x, pos.y + size.h)
            ctx.stroke()
          }
          // Diagonal lines for net effect
          ctx.strokeStyle = 'rgba(255,255,255,0.25)'
          const diagonalSpacing = 8 * elementScale
          for (let i = -size.h; i < size.w; i += diagonalSpacing) {
            ctx.beginPath()
            ctx.moveTo(pos.x + i, pos.y)
            ctx.lineTo(pos.x + i + size.h, pos.y + size.h)
            ctx.stroke()
          }
          for (let i = size.w; i > -size.h; i -= diagonalSpacing) {
            ctx.beginPath()
            ctx.moveTo(pos.x + i, pos.y)
            ctx.lineTo(pos.x + i - size.h, pos.y + size.h)
            ctx.stroke()
          }
        }

        // Load icon if not already loaded
        if (!getIcon(iconPath)) {
          loadIcon(iconPath).catch(() => {
            // Silently fail - will use fallback drawing
          })
        }

        ctx.restore()

        if (el.label) {
          drawText(
            ctx,
            pos.x + 8 * elementScale,
            pos.y + 20 * elementScale,
            el.label,
            elementScale,
          )
        }

        if (isHover && !isSel) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 2 * elementScale
          const hoverPadding = 2 * elementScale
          ctx.strokeRect(
            pos.x - hoverPadding,
            pos.y - hoverPadding,
            size.w + hoverPadding * 2,
            size.h + hoverPadding * 2,
          )
        }
      }

      if (el.kind === 'line') {
        const from = fieldToCanvas(el.from, viewport, fieldType)
        const to = fieldToCanvas(el.to, viewport, fieldType)
        ctx.strokeStyle = 'rgba(255,255,255,0.92)'
        ctx.lineWidth = (isSel ? 4 : 3) * elementScale
        if (el.dashed) ctx.setLineDash([10 * elementScale, 8 * elementScale])
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
        ctx.setLineDash([])
      }

      if (el.kind === 'arrow') {
        const from = fieldToCanvas(el.from, viewport, fieldType)
        const to = fieldToCanvas(el.to, viewport, fieldType)
        ctx.strokeStyle = 'rgba(255,255,255,0.92)'
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.lineWidth = (isSel ? 4 : 3) * elementScale
        if (el.dashed) ctx.setLineDash([10 * elementScale, 8 * elementScale])
        drawArrow(ctx, from, to, elementScale)
        ctx.setLineDash([])
        if (el.label)
          drawText(
            ctx,
            (from.x + to.x) / 2 + 8 * elementScale,
            (from.y + to.y) / 2 - 8 * elementScale,
            el.label,
            elementScale,
          )
      }

      if (el.kind === 'path') {
        if (el.points.length >= 2) {
          const canvasPoints = el.points.map((p) =>
            fieldToCanvas(p, viewport, fieldType),
          )
          ctx.strokeStyle = 'rgba(255,255,255,0.92)'
          ctx.lineWidth = (isSel ? 4 : 3) * elementScale
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          if (el.dashed) ctx.setLineDash([10 * elementScale, 8 * elementScale])

          ctx.beginPath()
          ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y)

          // Draw smooth curves connecting all points
          // With many points, we can draw smooth curves through them
          if (canvasPoints.length === 2) {
            // For 2 points, draw a simple line
            ctx.lineTo(canvasPoints[1].x, canvasPoints[1].y)
          } else {
            // For 3+ points, draw ultra-smooth curves
            // With many points created consistently, use simple lines for maximum smoothness
            for (let i = 0; i < canvasPoints.length - 1; i++) {
              const p1 = canvasPoints[i + 1]
              // With many close points, simple lines create perfectly smooth curves
              ctx.lineTo(p1.x, p1.y)
            }
          }

          ctx.stroke()
          ctx.setLineDash([])
          if (el.label) {
            const mid = canvasPoints[Math.floor(canvasPoints.length / 2)]
            drawText(
              ctx,
              mid.x + 8 * elementScale,
              mid.y - 8 * elementScale,
              el.label,
              elementScale,
            )
          }
        }
      }

      if (el.kind === 'text') {
        const pos = fieldToCanvas({ x: el.x, y: el.y }, viewport, fieldType)
        drawText(ctx, pos.x, pos.y, el.text, elementScale)
      }

      ctx.restore()
    }

    const sel = scene.elements.find((e) => e.id === selectedId)
    if (sel) {
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])

      const handle = (x: number, y: number) => {
        ctx.setLineDash([])
        // Larger, more visible handles with better contrast
        ctx.fillStyle = 'rgba(255, 255, 255, 1)'
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)' // Blue border for better visibility
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(x, y, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        // Inner dot for better visibility
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.setLineDash([6, 6])
      }

      if (sel.kind === 'token') {
        const pos = fieldToCanvas({ x: sel.x, y: sel.y }, viewport, fieldType)
        // Scale token size with clamped element scale
        const radius = sel.r * elementScale
        const selectionPadding = 10 * elementScale
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, radius + selectionPadding, 0, Math.PI * 2)
        ctx.stroke()
        handle(pos.x + radius + selectionPadding, pos.y)
      } else if (sel.kind === 'zone') {
        const pos = fieldToCanvas({ x: sel.x, y: sel.y }, viewport, fieldType)
        const size = { w: sel.w * viewport.scale, h: sel.h * viewport.scale }
        const pad = 6 * elementScale

        // Selection background (subtle overlay)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.fillRect(
          pos.x - pad,
          pos.y - pad,
          size.w + pad * 2,
          size.h + pad * 2,
        )

        // Selection border (cleaner, more visible)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.lineWidth = 2 * elementScale
        ctx.setLineDash([8 * elementScale, 4 * elementScale])
        ctx.strokeRect(
          pos.x - pad,
          pos.y - pad,
          size.w + pad * 2,
          size.h + pad * 2,
        )
        ctx.setLineDash([])

        // Corner handles
        handle(pos.x, pos.y)
        handle(pos.x + size.w, pos.y)
        handle(pos.x, pos.y + size.h)
        handle(pos.x + size.w, pos.y + size.h)

        // Edge handles for one-directional resize (circular, softer handles)
        const edgeHandle = (x: number, y: number) => {
          ctx.setLineDash([])
          ctx.fillStyle = 'rgba(255, 255, 255, 1)'
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)'
          ctx.lineWidth = 2 * elementScale
          const radius = 5 * elementScale
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          // Inner dot for better visibility
          ctx.fillStyle = 'rgba(59, 130, 246, 0.8)'
          ctx.beginPath()
          ctx.arc(x, y, 2.5 * elementScale, 0, Math.PI * 2)
          ctx.fill()
          ctx.setLineDash([6 * elementScale, 6 * elementScale])
        }

        edgeHandle(pos.x + size.w / 2, pos.y) // top
        edgeHandle(pos.x + size.w / 2, pos.y + size.h) // bottom
        edgeHandle(pos.x, pos.y + size.h / 2) // left
        edgeHandle(pos.x + size.w, pos.y + size.h / 2) // right
      } else if (sel.kind === 'goal') {
        const pos = fieldToCanvas({ x: sel.x, y: sel.y }, viewport, fieldType)
        const size = { w: sel.w * viewport.scale, h: sel.h * viewport.scale }
        const pad = 6 * elementScale

        // Selection background (subtle overlay)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.fillRect(
          pos.x - pad,
          pos.y - pad,
          size.w + pad * 2,
          size.h + pad * 2,
        )

        // Selection border (cleaner, more visible)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.lineWidth = 2 * elementScale
        ctx.setLineDash([8 * elementScale, 4 * elementScale])
        ctx.strokeRect(
          pos.x - pad,
          pos.y - pad,
          size.w + pad * 2,
          size.h + pad * 2,
        )
        ctx.setLineDash([])

        // Corner handles
        handle(pos.x, pos.y)
        handle(pos.x + size.w, pos.y)
        handle(pos.x, pos.y + size.h)
        handle(pos.x + size.w, pos.y + size.h)

        // Edge handles for one-directional resize
        const edgeHandle = (x: number, y: number) => {
          ctx.setLineDash([])
          ctx.fillStyle = 'rgba(255, 255, 255, 1)'
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)'
          ctx.lineWidth = 2 * elementScale
          const radius = 5 * elementScale
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          // Inner dot for better visibility
          ctx.fillStyle = 'rgba(59, 130, 246, 0.8)'
          ctx.beginPath()
          ctx.arc(x, y, 2.5 * elementScale, 0, Math.PI * 2)
          ctx.fill()
          ctx.setLineDash([6 * elementScale, 6 * elementScale])
        }

        edgeHandle(pos.x + size.w / 2, pos.y) // top
        edgeHandle(pos.x + size.w / 2, pos.y + size.h) // bottom
        edgeHandle(pos.x, pos.y + size.h / 2) // left
        edgeHandle(pos.x + size.w, pos.y + size.h / 2) // right
      } else if (sel.kind === 'text') {
        const pos = fieldToCanvas({ x: sel.x, y: sel.y }, viewport, fieldType)
        const textWidth = 240 * elementScale
        const textHeight = 26 * elementScale
        const textPadding = 6 * elementScale
        ctx.strokeRect(
          pos.x - textPadding,
          pos.y - 18 * elementScale,
          textWidth,
          textHeight,
        )
        handle(pos.x - textPadding, pos.y - 18 * elementScale)
        handle(pos.x + textWidth, pos.y + 8 * elementScale)
      } else if (sel.kind === 'arrow' || sel.kind === 'line') {
        const from = fieldToCanvas(sel.from, viewport, fieldType)
        const to = fieldToCanvas(sel.to, viewport, fieldType)
        const mid = fieldToCanvas(
          { x: (sel.from.x + sel.to.x) / 2, y: (sel.from.y + sel.to.y) / 2 },
          viewport,
          fieldType,
        )

        // Endpoint handles
        handle(from.x, from.y)
        handle(to.x, to.y)

        // Middle handle for moving entire line (circular, softer handle)
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(255, 255, 255, 1)'
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)'
        ctx.lineWidth = 2 * elementScale
        const radius = 5 * elementScale
        ctx.beginPath()
        ctx.arc(mid.x, mid.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        // Inner dot for better visibility
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)'
        ctx.beginPath()
        ctx.arc(mid.x, mid.y, 2.5 * elementScale, 0, Math.PI * 2)
        ctx.fill()
        ctx.setLineDash([6 * elementScale, 6 * elementScale])
      } else if (sel.kind === 'path') {
        if (sel.points.length) {
          // Show only first and last points for cleaner editing
          const first = fieldToCanvas(sel.points[0], viewport, fieldType)
          const last = fieldToCanvas(
            sel.points[sel.points.length - 1],
            viewport,
            fieldType,
          )
          handle(first.x, first.y)
          handle(last.x, last.y)

          // Optionally show middle points if there are only a few
          if (sel.points.length <= 4) {
            for (let i = 1; i < sel.points.length - 1; i++) {
              const point = fieldToCanvas(sel.points[i], viewport, fieldType)
              // Smaller handles for middle points
              ctx.setLineDash([])
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
              ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'
              ctx.lineWidth = 2 * elementScale
              const radius = 4 * elementScale
              ctx.beginPath()
              ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
              ctx.fill()
              ctx.stroke()
              ctx.setLineDash([6 * elementScale, 6 * elementScale])
            }
          }
        }
      }

      ctx.restore()
    }
  }

  ctx.save()
  ctx.globalAlpha = 0.2
  ctx.fillStyle = '#fff'
  ctx.font = '600 12px ui-sans-serif, system-ui'
  ctx.fillText('Tactics Editor POC', 14, viewport.canvasHeight - 14)
  ctx.restore()
}
