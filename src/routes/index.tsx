import { createFileRoute } from '@tanstack/react-router'
import { SavedItemsPage } from '@/features/tactics/ui/SavedItemsPage'

export const Route = createFileRoute('/')({
  component: SavedItemsPage,
})
