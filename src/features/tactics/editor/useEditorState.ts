'use client'

import { useEffect, useMemo, useState } from 'react'
import { defaultScene } from '../engine/defaultScene'
import { pushHistory, redoHistory, undoHistory } from '../engine/history'
import type {
  DragState,
  Drill,
  HistoryState,
  LayerId,
  Scene,
  Tool,
} from '../engine/types'
import { deepClone, sceneKey } from '../engine/utils'

export function useEditorState() {
  const [history, setHistory] = useState<HistoryState<Scene>>({
    past: [],
    present: deepClone(defaultScene),
    future: [],
  })

  const scene = history.present

  const [tool, setTool] = useState<Tool>('select')
  const [activeLayer, setActiveLayer] = useState<LayerId>('tactics')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [hoverId, setHoverId] = useState<string | undefined>(undefined)
  const [drag, setDrag] = useState<DragState>(undefined)

  const [panel, setPanel] = useState<'inspector' | 'library'>('inspector')
  const [query, setQuery] = useState('')

  const [drills, setDrills] = useState<Drill[]>(() => {
    try {
      const raw = localStorage.getItem('tactics_poc_drills_v1')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('tactics_poc_drills_v1', JSON.stringify(drills))
    } catch {}
  }, [drills])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrag(undefined)
        setSelectedId(undefined)
        // opcional: volta ao select
        setTool('select')
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const selected = useMemo(
    () => scene.elements.find((e) => e.id === selectedId),
    [scene.elements, selectedId],
  )

  const replaceScene = (next: Scene) =>
    setHistory((h) => ({ ...h, present: next }))

  const commitFrom = (baseScene: Scene) =>
    setHistory((h) => {
      // se não houve mudança, não cria history entry
      if (sceneKey(h.present) === sceneKey(baseScene)) return h

      // se o último past já é igual ao baseScene, não duplica
      const last = h.past[h.past.length - 1]
      const nextPast =
        last && sceneKey(last) === sceneKey(baseScene)
          ? h.past
          : [...h.past, baseScene]

      return {
        past: nextPast.slice(-80),
        present: h.present,
        future: [],
      }
    })

  const filteredDrills = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return drills
    return drills.filter((d) => {
      const hay =
        `${d.title} ${d.tags.join(' ')} ${d.description ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [drills, query])

  const applyScene = (next: Scene) => setHistory((h) => pushHistory(h, next))
  const undo = () => setHistory((h) => undoHistory(h))
  const redo = () => setHistory((h) => redoHistory(h))

  return {
    // core
    history,
    scene,
    applyScene,
    undo,
    redo,
    replaceScene,
    commitFrom,

    // ui state
    tool,
    setTool,
    activeLayer,
    setActiveLayer,
    selectedId,
    setSelectedId,
    selected,
    hoverId,
    setHoverId,
    drag,
    setDrag,

    // library
    drills,
    setDrills,
    filteredDrills,
    query,
    setQuery,
    panel,
    setPanel,
  }
}
