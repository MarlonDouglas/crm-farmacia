'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { copiarParaAreaTransferencia } from '@/lib/scripts'

interface BotaoScriptProps {
  texto: string
  label: string
}

export default function BotaoScript({ texto, label }: BotaoScriptProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (copiarParaAreaTransferencia(texto)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm transition-colors"
    >
      {copied ? (
        <>
          <Check size={16} className="text-green-600" />
          <span className="text-green-600">Copiado!</span>
        </>
      ) : (
        <>
          <Copy size={16} />
          <span>{label}</span>
        </>
      )}
    </button>
  )
}

