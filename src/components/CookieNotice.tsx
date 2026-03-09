'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cookie_notice_ack_v1'

export default function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const alreadyAcknowledged = window.localStorage.getItem(STORAGE_KEY) === 'true'
        if (!alreadyAcknowledged) {
          setVisible(true)
        }
      } catch {
        setVisible(true)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  const acknowledge = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // Ignore storage failures and just close the notice.
    }
    setVisible(false)
  }

  if (!visible) {
    return null
  }

  return (
    <aside
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 right-4 z-[70] rounded-xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur md:left-auto md:max-w-md"
    >
      <p className="text-sm text-gray-700">
        Usamos cookies esenciales para seguridad y sesión del panel admin. No utilizamos cookies de marketing.
      </p>
      <div className="pointer-events-auto mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={acknowledge}
          className="rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600"
        >
          Entendido
        </button>
        <Link href="/privacy" className="text-sm font-medium text-primary-600 hover:text-primary-700">
          Ver política
        </Link>
      </div>
    </aside>
  )
}
