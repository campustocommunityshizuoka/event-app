// app/components/ServiceWorkerRegister.tsx
'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registration successful with scope: ', registration.scope)
        })
        .catch((err) => {
          console.log('Service Worker registration failed: ', err)
        })
    }
  }, [])

  return null
}