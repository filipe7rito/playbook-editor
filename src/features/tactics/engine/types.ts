export type Tool =
  | 'select'
  | 'player'
  | 'opponent'
  | 'cone'
  | 'ball'
  | 'arrow'
  | 'path'
  | 'line'
  | 'zone'
  | 'text'

export type LayerId = 'base' | 'drills' | 'tactics'

export type Point = { x: number; y: number }

export type ElementBase = {
  id: string
  layer: LayerId
  locked?: boolean
  hidden?: boolean
}

export type ShapeElement =
  | (ElementBase & {
      kind: 'token'
      tokenType: 'player' | 'opponent' | 'cone' | 'ball'
      x: number
      y: number
      r: number
      label?: string
      number?: number
    })
  | (ElementBase & {
      kind: 'arrow'
      from: Point
      to: Point
      dashed?: boolean
      label?: string
    })
  | (ElementBase & {
      kind: 'path'
      points: Point[]
      dashed?: boolean
      label?: string
    })
  | (ElementBase & {
      kind: 'line'
      from: Point
      to: Point
      dashed?: boolean
    })
  | (ElementBase & {
      kind: 'zone'
      x: number
      y: number
      w: number
      h: number
      fill?: 'press' | 'build' | 'danger' | 'custom'
      opacity?: number
      label?: string
    })
  | (ElementBase & {
      kind: 'text'
      x: number
      y: number
      text: string
    })

export type Scene = {
  version: 1
  pitch: {
    type: 'full' | 'half' | 'free'
    halfSide?: 'offensive' | 'defensive' // For half field: which half to show
    showGrid: boolean
  }
  layers: Record<LayerId, { name: string; visible: boolean; locked: boolean }>
  elements: ShapeElement[]
}

export type HistoryState<T> = { past: T[]; present: T; future: T[] }

export type DragState =
  | {
      id: string
      start: Point
      origin?: Point
      type: 'move' | 'resizeZone' | 'resizeLine' | 'resizePath' | 'draw'
      drawKind?: 'arrow' | 'line' | 'path' | 'zone'
      handle?:
        | 'from'
        | 'to'
        | 'middle'
        | 'topLeft'
        | 'topRight'
        | 'bottomLeft'
        | 'bottomRight'
        | 'top'
        | 'bottom'
        | 'left'
        | 'right'
      baseScene?: Scene
    }
  | undefined

export type Drill = {
  id: string
  title: string
  tags: string[]
  description?: string
  durationMin?: number
  players?: string
  sceneSnapshot: Scene
  createdAt: number
}
