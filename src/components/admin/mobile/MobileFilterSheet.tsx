'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

export type FilterOption = {
  value: string
  label: string
}

interface MobileFilterSheetProps {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel?: string
  placeholder?: string
}

export default function MobileFilterSheet({
  label,
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  placeholder = 'Seleccionar'
}: MobileFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const dialogId = useId()
  const titleId = useId()
  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value])

  const close = () => setIsOpen(false)

  const handleSelect = (nextValue: string) => {
    onChange(nextValue)
    close()
  }

  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    const triggerElement = triggerRef.current
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }

    closeButtonRef.current?.focus()
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', onKeyDown)
      triggerElement?.focus()
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        aria-controls={dialogId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-left text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate text-base font-medium">{selectedOption?.label ?? placeholder}</span>
        <span aria-hidden="true" className="text-lg text-gray-600">
          ˅
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[95]">
          <button
            type="button"
            aria-label={`Cerrar selector de ${label}`}
            onClick={close}
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
          />
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-gray-200 bg-white shadow-2xl"
          >
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-gray-300" />
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
              <h3 id={titleId} className="text-sm font-semibold text-gray-900">
                {label}
              </h3>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="min-h-11 min-w-11 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[min(48vh,360px)] overflow-y-auto px-2 py-2">
              <div role="listbox" aria-label={label} className="space-y-1">
                {options.map((option) => {
                  const isSelected = option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value)}
                      className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                        isSelected
                          ? 'bg-primary-50 text-primary-800 ring-1 ring-primary-200'
                          : 'text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <span aria-hidden="true" className="text-primary-700">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
