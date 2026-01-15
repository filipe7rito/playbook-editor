import { LayerId, Point, Scene } from '../engine/types'
import type { Viewport } from '../engine/viewport'
import { fieldToCanvas } from '../engine/viewport'
import { drawPitch } from './drawPitch'

function drawText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
) {
  ctx.font = '600 14px ui-sans-serif, system-ui'
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 4
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
}

function drawArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  const headLen = 14
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

  const fieldType =
    scene.pitch.type === 'smallSided' ? 'quarter' : scene.pitch.type
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
        // Use fixed pixel size - original sizes were in pixels, not scaled
        // Keep original sizes but they represent pixels, not field units
        const radius = el.r

        const fill =
          el.tokenType === 'cone'
            ? 'rgba(255,198,0,0.95)'
            : el.tokenType === 'ball'
              ? 'rgba(255,255,255,0.95)'
              : el.tokenType === 'opponent'
                ? 'rgba(255,80,80,0.95)'
                : 'rgba(120,200,255,0.95)'

        ctx.fillStyle = fill
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = isSel ? 4 : 3
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        if (typeof el.number === 'number') {
          ctx.font = '700 14px ui-sans-serif, system-ui'
          ctx.fillStyle = 'rgba(0,0,0,0.8)'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(el.number), pos.x, pos.y)
          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'
        }

        if (el.label)
          drawText(ctx, pos.x + radius + 6, pos.y - radius - 6, el.label)

        if (isHover && !isSel) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      if (el.kind === 'zone') {
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
        ctx.setLineDash([8, 6])
        ctx.strokeRect(pos.x, pos.y, size.w, size.h)
        ctx.setLineDash([])
        if (el.label) drawText(ctx, pos.x + 8, pos.y + 20, el.label)

        if (isHover && !isSel) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 2
          ctx.strokeRect(pos.x - 2, pos.y - 2, size.w + 4, size.h + 4)
        }
      }

      if (el.kind === 'line') {
        const from = fieldToCanvas(el.from, viewport, fieldType)
        const to = fieldToCanvas(el.to, viewport, fieldType)
        ctx.strokeStyle = 'rgba(255,255,255,0.92)'
        ctx.lineWidth = isSel ? 4 : 3
        if (el.dashed) ctx.setLineDash([10, 8])
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
        ctx.lineWidth = isSel ? 4 : 3
        if (el.dashed) ctx.setLineDash([10, 8])
        drawArrow(ctx, from, to)
        ctx.setLineDash([])
        if (el.label)
          drawText(
            ctx,
            (from.x + to.x) / 2 + 8,
            (from.y + to.y) / 2 - 8,
            el.label,
          )
      }

      if (el.kind === 'path') {
        if (el.points.length >= 2) {
          const canvasPoints = el.points.map((p) =>
            fieldToCanvas(p, viewport, fieldType),
          )
          ctx.strokeStyle = 'rgba(255,255,255,0.92)'
          ctx.lineWidth = isSel ? 4 : 3
          if (el.dashed) ctx.setLineDash([10, 8])
          ctx.beginPath()
          ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y)
          for (let i = 1; i < canvasPoints.length; i++)
            ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y)
          ctx.stroke()
          ctx.setLineDash([])
          if (el.label) {
            const mid = canvasPoints[Math.floor(canvasPoints.length / 2)]
            drawText(ctx, mid.x + 8, mid.y - 8, el.label)
          }
        }
      }

      if (el.kind === 'text') {
        const pos = fieldToCanvas({ x: el.x, y: el.y }, viewport, fieldType)
        drawText(ctx, pos.x, pos.y, el.text)
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
        // Use fixed pixel size, not scaled
        const radius = sel.r
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, radius + 10, 0, Math.PI * 2)
        ctx.stroke()
        handle(pos.x + radius + 10, pos.y)
      } else if (sel.kind === 'zone') {
        const pos = fieldToCanvas({ x: sel.x, y: sel.y }, viewport, fieldType)
        const size = { w: sel.w * viewport.scale, h: sel.h * viewport.scale }
        const pad = 6

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
        ctx.lineWidth = 2
        ctx.setLineDash([8, 4])
        ctx.strokeRect(
          pos.x - pad,
          pos.y - pad,
          size.w + pad * 2,
          size.h + pad * 2,
        )
        ctx.setLineDash([])

        // Corner handles (larger and more visible)
        handle(pos.x, pos.y)
        handle(pos.x + size.w, pos.y)
        handle(pos.x, pos.y + size.h)
        handle(pos.x + size.w, pos.y + size.h)
      } else if (sel.kind === 'text') {
        const pos = fieldToCanvas({ x: sel.x, y: sel.y }, viewport, fieldType)
        ctx.strokeRect(pos.x - 6, pos.y - 18, 240, 26)
        handle(pos.x - 6, pos.y - 18)
        handle(pos.x + 240, pos.y + 8)
      } else if (sel.kind === 'arrow' || sel.kind === 'line') {
        const from = fieldToCanvas(sel.from, viewport, fieldType)
        const to = fieldToCanvas(sel.to, viewport, fieldType)
        handle(from.x, from.y)
        handle(to.x, to.y)
      } else if (sel.kind === 'path') {
        if (sel.points.length) {
          const first = fieldToCanvas(sel.points[0], viewport, fieldType)
          const last = fieldToCanvas(
            sel.points[sel.points.length - 1],
            viewport,
            fieldType,
          )
          handle(first.x, first.y)
          handle(last.x, last.y)
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
