import { Scene } from '../engine/types'

export function drawPitch(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: Scene,
) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#0b6b3a'
  ctx.fillRect(0, 0, w, h)

  // subtle stripes
  ctx.globalAlpha = 0.12
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000'
    ctx.fillRect((w / 10) * i, 0, w / 10, h)
  }
  ctx.globalAlpha = 1

  if (scene.pitch.showGrid) {
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    const step = 40
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // pitch lines
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.95

  const pad = 30
  const x0 = pad,
    y0 = pad
  const pw = w - pad * 2
  const ph = h - pad * 2

  // presets: for now, just crop the drawn lines (simple)
  // Future: draw true half/quarter markings; keeping simple for POC.
  ctx.strokeRect(x0, y0, pw, ph)

  // halfway
  if (scene.pitch.type === 'full') {
    ctx.beginPath()
    ctx.moveTo(x0 + pw / 2, y0)
    ctx.lineTo(x0 + pw / 2, y0 + ph)
    ctx.stroke()
  }

  // center circle (full only)
  if (scene.pitch.type === 'full') {
    ctx.beginPath()
    ctx.arc(x0 + pw / 2, y0 + ph / 2, Math.min(pw, ph) * 0.12, 0, Math.PI * 2)
    ctx.stroke()
  }

  // boxes (always)
  const boxW = pw * 0.16
  const boxH = ph * 0.52
  const sixW = pw * 0.06
  const sixH = ph * 0.26

  ctx.strokeRect(x0, y0 + (ph - boxH) / 2, boxW, boxH)
  ctx.strokeRect(x0, y0 + (ph - sixH) / 2, sixW, sixH)

  ctx.strokeRect(x0 + pw - boxW, y0 + (ph - boxH) / 2, boxW, boxH)
  ctx.strokeRect(x0 + pw - sixW, y0 + (ph - sixH) / 2, sixW, sixH)

  ctx.globalAlpha = 1
}
