'use client'

import { useLayoutEffect } from 'react'
import type { Scene } from '../engine/types'
import { calculateViewport } from '../engine/viewport'
import { renderScene } from '../render/renderScene'

export function useCanvasRenderer(args: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  wrapRef: React.RefObject<HTMLDivElement | null>
  scene: Scene
  selectedId?: string
  hoverId?: string
}) {
  const { canvasRef, wrapRef, scene, selectedId, hoverId } = args

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const dpr = window.devicePixelRatio || 1

      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Calculate viewport for current field type (for free field, use full field dimensions)
      const fieldType = scene.pitch.type === 'free' ? 'full' : scene.pitch.type
      const viewport = calculateViewport(
        rect.width,
        rect.height,
        fieldType,
        'horizontal',
      )

      renderScene(ctx, viewport, scene, selectedId, hoverId)
    }

    const raf = requestAnimationFrame(resize)
    const ro = new ResizeObserver(() => requestAnimationFrame(resize))
    ro.observe(wrap)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [canvasRef, wrapRef, scene, selectedId, hoverId])
}
