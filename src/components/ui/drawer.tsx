'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DrawerContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DrawerContext = React.createContext<DrawerContextValue | undefined>(undefined)

export function DrawerProvider({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <DrawerContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </DrawerContext.Provider>
  )
}

export function useDrawer() {
  const context = React.useContext(DrawerContext)
  if (!context) {
    throw new Error('useDrawer must be used within DrawerProvider')
  }
  return context
}

export function DrawerTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<'button'>) {
  const { setOpen } = useDrawer()
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function DrawerContent({
  children,
  side = 'right',
  className,
  ...props
}: {
  children: React.ReactNode
  side?: 'left' | 'right' | 'top' | 'bottom'
  className?: string
} & React.ComponentProps<'div'>) {
  const { open, setOpen } = useDrawer()

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const sideClasses = {
    left: 'left-0 top-0 h-full',
    right: 'right-0 top-0 h-full',
    top: 'top-0 left-0 w-full',
    bottom: 'bottom-0 left-0 w-full',
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={() => setOpen(false)}
      />
      {/* Drawer */}
      <div
        className={cn(
          'fixed z-50 bg-background border shadow-lg transition-transform',
          sideClasses[side],
          side === 'left' || side === 'right' ? 'w-[360px]' : 'h-[400px]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </>
  )
}

export function DrawerClose({
  children,
  className,
  ...props
}: React.ComponentProps<'button'>) {
  const { setOpen } = useDrawer()
  return (
    <button
      type="button"
      onClick={() => setOpen(false)}
      className={cn(className)}
      {...props}
    >
      {children}
    </button>
  )
}
