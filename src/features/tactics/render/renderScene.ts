import { LayerId, Point, Scene } from '../engine/types'
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
  w: number,
  h: number,
  scene: Scene,
  selectedId?: string,
  hoverId?: string,
) {
  drawPitch(ctx, w, h, scene)

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
        ctx.arc(el.x, el.y, el.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        if (typeof el.number === 'number') {
          ctx.font = '700 14px ui-sans-serif, system-ui'
          ctx.fillStyle = 'rgba(0,0,0,0.8)'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(el.number), el.x, el.y)
          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'
        }

        if (el.label) drawText(ctx, el.x + el.r + 6, el.y - el.r - 6, el.label)

        if (isHover && !isSel) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(el.x, el.y, el.r + 6, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      if (el.kind === 'zone') {
        const fillMap: Record<string, string> = {
          press: 'rgba(255, 80, 80, 0.25)',
          build: 'rgba(120, 200, 255, 0.22)',
          danger: 'rgba(255, 198, 0, 0.24)',
          custom: 'rgba(255,255,255,0.18)',
        }
        ctx.fillStyle = fillMap[el.fill ?? 'custom']
        ctx.globalAlpha = (el.opacity ?? 1) * (el.locked ? 0.65 : 1)
        ctx.fillRect(el.x, el.y, el.w, el.h)
        ctx.globalAlpha = el.locked ? 0.65 : 1
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'
        ctx.setLineDash([8, 6])
        ctx.strokeRect(el.x, el.y, el.w, el.h)
        ctx.setLineDash([])
        if (el.label) drawText(ctx, el.x + 8, el.y + 20, el.label)

        if (isHover && !isSel) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 2
          ctx.strokeRect(el.x - 2, el.y - 2, el.w + 4, el.h + 4)
        }
      }

      if (el.kind === 'line') {
        ctx.strokeStyle = 'rgba(255,255,255,0.92)'
        ctx.lineWidth = isSel ? 4 : 3
        if (el.dashed) ctx.setLineDash([10, 8])
        ctx.beginPath()
        ctx.moveTo(el.from.x, el.from.y)
        ctx.lineTo(el.to.x, el.to.y)
        ctx.stroke()
        ctx.setLineDash([])
      }

      if (el.kind === 'arrow') {
        ctx.strokeStyle = 'rgba(255,255,255,0.92)'
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.lineWidth = isSel ? 4 : 3
        if (el.dashed) ctx.setLineDash([10, 8])
        drawArrow(ctx, el.from, el.to)
        ctx.setLineDash([])
        if (el.label)
          drawText(
            ctx,
            (el.from.x + el.to.x) / 2 + 8,
            (el.from.y + el.to.y) / 2 - 8,
            el.label,
          )
      }

      if (el.kind === 'path') {
        if (el.points.length >= 2) {
          ctx.strokeStyle = 'rgba(255,255,255,0.92)'
          ctx.lineWidth = isSel ? 4 : 3
          if (el.dashed) ctx.setLineDash([10, 8])
          ctx.beginPath()
          ctx.moveTo(el.points[0].x, el.points[0].y)
          for (let i = 1; i < el.points.length; i++)
            ctx.lineTo(el.points[i].x, el.points[i].y)
          ctx.stroke()
          ctx.setLineDash([])
          if (el.label) {
            const mid = el.points[Math.floor(el.points.length / 2)]
            drawText(ctx, mid.x + 8, mid.y - 8, el.label)
          }
        }
      }

      if (el.kind === 'text') {
        drawText(ctx, el.x, el.y, el.text)
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
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.setLineDash([6, 6])
      }

      if (sel.kind === 'token') {
        ctx.beginPath()
        ctx.arc(sel.x, sel.y, sel.r + 10, 0, Math.PI * 2)
        ctx.stroke()
        handle(sel.x + sel.r + 10, sel.y) // “handle” simples (opcional)
      } else if (sel.kind === 'zone') {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 6])
        ctx.strokeRect(sel.x - 4, sel.y - 4, sel.w + 8, sel.h + 8)
        ctx.setLineDash([])

        // handles (cantos)
        handle(sel.x, sel.y)
        handle(sel.x + sel.w, sel.y)
        handle(sel.x, sel.y + sel.h)
        handle(sel.x + sel.w, sel.y + sel.h)
      } else if (sel.kind === 'text') {
        ctx.strokeRect(sel.x - 6, sel.y - 18, 240, 26)
        handle(sel.x - 6, sel.y - 18)
        handle(sel.x + 240, sel.y + 8)
      } else if (sel.kind === 'arrow' || sel.kind === 'line') {
        handle(sel.from.x, sel.from.y)
        handle(sel.to.x, sel.to.y)
      } else if (sel.kind === 'path') {
        if (sel.points.length) {
          const first = sel.points[0]
          const last = sel.points[sel.points.length - 1]
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
  ctx.fillText('Tactics Editor POC', 14, h - 14)
  ctx.restore()
}
