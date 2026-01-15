'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getSavedItems,
  deleteItem,
  updateItem,
  type SavedItem,
  type SavedItemType,
} from '../engine/storage'
import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { deepClone } from '../engine/utils'
import { Edit2, Trash2, Play, Search, Filter, Plus } from 'lucide-react'

export function SavedItemsPage() {
  const navigate = useNavigate()
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
    navigate({ to: '/edit/$id', params: { id: item.id } })
  }

  const handleCreateNew = () => {
    navigate({ to: '/edit' })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Itens Salvos</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus treinos e táticas salvos
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Novo
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 space-y-4 rounded-lg border bg-card p-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Todos ({items.length})
              </button>
              <button
                onClick={() => setFilter('tactics')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'tactics'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Táticas ({items.filter((i) => i.type === 'tactics').length})
              </button>
              <button
                onClick={() => setFilter('training')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'training'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Treinos ({items.filter((i) => i.type === 'training').length})
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16">
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum item encontrado
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery || filter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando e salvando um treino ou tática'}
            </p>
            {!searchQuery && filter === 'all' && (
              <Link to="/">
                <Button className="mt-4">Criar Novo</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
              >
                {/* Preview Image */}
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      Sem preview
                    </div>
                  )}
                  {/* Type Badge */}
                  <div className="absolute left-2 top-2">
                    <span className="rounded-md bg-background/90 px-2 py-1 text-xs font-medium backdrop-blur-sm">
                      {item.type === 'tactics' ? 'Tática' : 'Treino'}
                    </span>
                  </div>
                  {/* Actions Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="sm"
                      onClick={() => handleLoad(item)}
                      className="bg-background text-foreground hover:bg-background/90"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Carregar
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(item.id)
                          if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditTitle('')
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(item.id)}
                          className="h-7 flex-1"
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
                          className="h-7 flex-1"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="mb-1 font-semibold line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.updatedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      {/* Actions */}
                      <div className="mt-3 flex items-center gap-2 border-t pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLoad(item)}
                          className="flex-1"
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Abrir
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
