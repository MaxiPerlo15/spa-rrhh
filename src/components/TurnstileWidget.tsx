'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useCspNonce } from '@/contexts/CspNonceContext'

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          action?: string
          theme?: 'light' | 'dark' | 'auto'
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        }
      ) => string
      remove?: (widgetId: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  action: 'contact_form' | 'application_form'
  onTokenChange: (token: string) => void
}

export default function TurnstileWidget({ action, onTokenChange }: TurnstileWidgetProps) {
  const nonce = useCspNonce()
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile) return

    onTokenChange('')
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: 'light',
      callback: (token) => onTokenChange(token),
      'expired-callback': () => onTokenChange(''),
      'error-callback': () => onTokenChange('')
    })

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current)
      }
      widgetIdRef.current = null
    }
  }, [action, onTokenChange, scriptReady, siteKey])

  if (!siteKey) {
    return null
  }

  return (
    <div className="space-y-2">
      <Script
        id="cf-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        nonce={nonce ?? undefined}
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
      <p className="text-xs text-gray-500">
        Protegido por Cloudflare Turnstile para prevenir envíos automáticos.
      </p>
    </div>
  )
}
