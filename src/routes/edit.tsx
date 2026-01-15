import { createFileRoute } from '@tanstack/react-router'
import { TacticsEditor } from '@/features/tactics'

export const Route = createFileRoute('/edit')({
  component: TacticsEditor,
})
