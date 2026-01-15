'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getSavedItems,
  deleteItem,
  updateItem,
  type SavedItem,
  type SavedItemType,
  generatePreview,
} from '../engine/storage'
import { useState, useEffect, useMemo } from 'react'
import type { Scene } from '../engine/types'
import { deepClone } from '../engine/utils'
import { X, Edit2, Trash2, Play } from 'lucide-react'

export function SavedItemsList({
  onLoad,
  onClose,
}: {
  onLoad: (scene: Scene) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<SavedItem[]>([])
  const [filter, setFilter] = useState<SavedItemType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = () => {
    setItems(getSavedItems())
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesFilter = filter === 'all' || item.type === filter
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [items, filter, searchQuery])

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      deleteItem(id)
      loadItems()
    }
  }

  const handleEdit = (item: SavedItem) => {
    setEditingId(item.id)
    setEditTitle(item.title)
  }

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      updateItem(id, { title: editTitle.trim() })
      setEditingId(null)
      setEditTitle('')
      loadItems()
    }
  }

  const handleLoad = (item: SavedItem) => {
    onLoad(deepClone(item.scene))
    onClose()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <h2 className="text-lg font-semibold">Itens Salvos</h2>
        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-accent"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('tactics')}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              filter === 'tactics'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            Táticas
          </button>
          <button
            onClick={() => setFilter('training')}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              filter === 'training'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            Treinos
          </button>
        </div>
        <Input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum item salvo encontrado
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="group rounded-lg border p-3 hover:bg-accent/50 transition-colors"
            >
              {editingId === item.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(item.id)
                      if (e.key === 'Escape') {
                        setEditingId(null)
                        setEditTitle('')
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveEdit(item.id)}
                    className="h-8"
                  >
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null)
                      setEditTitle('')
                    }}
                    className="h-8"
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    {/* Preview */}
                    <div className="relative h-16 w-24 flex-shrink-0 rounded border bg-muted overflow-hidden">
                      {item.preview ? (
                        <img
                          src={item.preview}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          Sem preview
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase">
                              {item.type === 'tactics' ? 'Tática' : 'Treino'}
                            </span>
                            <h3 className="font-semibold truncate">{item.title}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleLoad(item)}
                            className="rounded p-1.5 hover:bg-accent"
                            title="Carregar"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded p-1.5 hover:bg-accent"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded p-1.5 hover:bg-destructive hover:text-destructive-foreground"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
