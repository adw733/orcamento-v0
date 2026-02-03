"use client"

import { useState, useEffect, useRef } from "react"
import { GeradorOrcamento } from "@/components/gerador-orcamento"

export default function ClientPage() {
  const [abaAtiva, setAbaAtiva] = useState("orcamentos")
  const isUpdatingFromHash = useRef(false)

  // Check for hash in URL on initial load and listen for hash changes
  useEffect(() => {
    const updateAbaFromHash = () => {
      const hash = window.location.hash.replace("#", "")
      isUpdatingFromHash.current = true
      
      if (!hash) {
        window.location.hash = "orcamentos"
        setAbaAtiva("orcamentos")
      } else {
        setAbaAtiva(hash)
      }
      
      setTimeout(() => {
        isUpdatingFromHash.current = false
      }, 100)
    }

    // Set initial aba from hash
    updateAbaFromHash()

    // Listen for hash changes
    window.addEventListener('hashchange', updateAbaFromHash)

    return () => {
      window.removeEventListener('hashchange', updateAbaFromHash)
    }
  }, [])

  // Update URL hash when state changes (for programmatic navigation)
  useEffect(() => {
    if (typeof window !== "undefined" && !isUpdatingFromHash.current) {
      const currentHash = window.location.hash.replace("#", "")
      if (currentHash !== abaAtiva) {
        window.location.hash = abaAtiva
      }
    }
  }, [abaAtiva])

  return (
    <GeradorOrcamento
      abaAtiva={abaAtiva}
      setAbaAtiva={setAbaAtiva}
    />
  )
}
