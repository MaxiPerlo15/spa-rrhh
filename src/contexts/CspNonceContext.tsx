'use client'

import { createContext, useContext } from 'react'

const CspNonceContext = createContext<string | null>(null)

export function CspNonceProvider({
  children,
  value
}: {
  children: React.ReactNode
  value: string | null
}) {
  return <CspNonceContext.Provider value={value}>{children}</CspNonceContext.Provider>
}

export function useCspNonce() {
  return useContext(CspNonceContext)
}
