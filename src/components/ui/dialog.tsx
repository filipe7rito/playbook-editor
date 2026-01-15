'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined)

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within Dialog')
  }
  return context
}

export function DialogTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<'button'>) {
  const { setOpen } = useDialog()
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

export function DialogContent({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
} & React.ComponentProps<'div'>) {
  const { open, setOpen } = useDialog()

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

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={() => setOpen(false)}
      />
      {/* Dialog */}
      <div
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg shadow-lg p-6',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </>
  )
}

export function DialogClose({
  children,
  className,
  ...props
}: React.ComponentProps<'button'>) {
  const { setOpen } = useDialog()
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
