'use client'

import { StatusAtendimento } from '@/lib/types'
import { atualizarStatusAtendimento } from '@/lib/atendimentos'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface CardAtendimentoProps {
  id: string
  clienteNome: string
  telefone: string
  status: StatusAtendimento
  valor?: number
  onStatusChange: () => void
}

const statusLabels: Record<StatusAtendimento, string> = {
  novo: 'Novo',
  em_negociacao: 'Em Negociação',
  aguardando_pix: 'Aguardando PIX',
  em_separacao: 'Em Separação',
  aguardando_motoboy: 'Aguardando Motoboy',
  em_rota: 'Em Rota',
  concluido: 'Concluído',
}

const statusOrder: StatusAtendimento[] = [
  'novo',
  'em_negociacao',
  'aguardando_pix',
  'em_separacao',
  'aguardando_motoboy',
  'em_rota',
  'concluido',
]

export default function CardAtendimento({
  id,
  clienteNome,
  telefone,
  status,
  valor,
  onStatusChange,
}: CardAtendimentoProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  const currentIndex = statusOrder.indexOf(status)
  const nextStatus = statusOrder[currentIndex + 1]

  const handleStatusChange = async (newStatus: StatusAtendimento) => {
    setLoading(true)
    const success = await atualizarStatusAtendimento(id, newStatus)
    if (success) {
      onStatusChange()
    }
    setLoading(false)
    setShowDropdown(false)
  }

  const getStatusColor = (s: StatusAtendimento) => {
    const colors: Record<StatusAtendimento, string> = {
      novo: 'bg-blue-100 text-blue-800',
      em_negociacao: 'bg-yellow-100 text-yellow-800',
      aguardando_pix: 'bg-orange-100 text-orange-800',
      em_separacao: 'bg-purple-100 text-purple-800',
      aguardando_motoboy: 'bg-indigo-100 text-indigo-800',
      em_rota: 'bg-green-100 text-green-800',
      concluido: 'bg-gray-100 text-gray-800',
    }
    return colors[s]
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{clienteNome}</h3>
          <p className="text-xs text-gray-600">{telefone}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
          {statusLabels[status]}
        </span>
      </div>

      {valor && (
        <div className="text-sm font-medium text-gray-900 mb-2">
          R$ {valor.toFixed(2).replace('.', ',')}
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={loading || !nextStatus}
          className="w-full flex items-center justify-between px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{nextStatus ? `Próximo: ${statusLabels[nextStatus]}` : 'Concluído'}</span>
          {nextStatus && <ChevronDown size={16} />}
        </button>

        {showDropdown && nextStatus && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
            {statusOrder.slice(currentIndex + 1).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

