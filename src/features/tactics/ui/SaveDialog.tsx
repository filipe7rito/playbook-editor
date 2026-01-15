'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import { saveItem, updateItem, getSavedItems, generatePreview, type SavedItemType } from '../engine/storage'
import { useState, useEffect, useRef } from 'react'
import type { Scene } from '../engine/types'
import { Save } from 'lucide-react'

export function SaveDialog({
  scene,
  onSave,
  editingId,
}: {
  scene: Scene
  onSave?: () => void
  editingId?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<SavedItemType>('tactics')
  const [saving, setSaving] = useState(false)
  const lastEditingIdRef = useRef<string | null>(null)

  // Load item data when editing (only when dialog opens or editingId changes)
  useEffect(() => {
    if (!open) {
      return
    }

    // Only update if editingId changed or this is first open
    if (editingId !== lastEditingIdRef.current) {
      lastEditingIdRef.current = editingId || null
      
      if (editingId) {
        const items = getSavedItems()
        const item = items.find((i) => i.id === editingId)
        if (item) {
          setTitle(item.title)
          setType(item.type)
        }
      } else {
        // Reset for new item
        setTitle('')
        setType('tactics')
      }
    }
  }, [editingId, open])

  const handleSave = async () => {
    if (!title.trim()) return

    setSaving(true)
    try {
      // Generate preview
      const preview = await generatePreview(scene)
      
      if (editingId) {
        // Update existing item
        updateItem(editingId, {
          title: title.trim(),
          type,
          scene,
          preview,
        })
      } else {
        // Save new item
        saveItem({
          title: title.trim(),
          type,
          scene,
          preview,
        })
      }

      setOpen(false)
      onSave?.()
    } catch (error) {
      console.error('Error saving item:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen && !saving) {
      // Reset state when dialog closes (but not during save operation)
      // Use a small delay to avoid glitch during close animation
      setTimeout(() => {
        setTitle('')
        setType('tactics')
        lastEditingIdRef.current = null
      }, 200)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Save className="h-4 w-4" />
          Salvar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {editingId ? 'Atualizar Item' : 'Salvar Item'}
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-medium">Título</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do item..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) {
                  handleSave()
                }
              }}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setType('tactics')}
                className={`flex-1 rounded px-3 py-2 text-sm transition-colors ${
                  type === 'tactics'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Tática
              </button>
              <button
                onClick={() => setType('training')}
                className={`flex-1 rounded px-3 py-2 text-sm transition-colors ${
                  type === 'training'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Treino
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || saving}>
              {saving ? (editingId ? 'Atualizando...' : 'Salvando...') : (editingId ? 'Atualizar' : 'Salvar')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
