'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { criarCliente, buscarClientePorTelefone, criarAtendimento } from '@/lib/atendimentos'

interface ModalNovoAtendimentoProps {
  isOpen: boolean
  onClose: () => void
  vendedorId: string
  onSuccess: () => void
}

export default function ModalNovoAtendimento({
  isOpen,
  onClose,
  vendedorId,
  onSuccess,
}: ModalNovoAtendimentoProps) {
  const [telefone, setTelefone] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setTelefone('')
      setNome('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Buscar ou criar cliente
      let cliente = await buscarClientePorTelefone(telefone)
      
      if (!cliente) {
        if (!nome.trim()) {
          setError('Nome é obrigatório para novos clientes')
          setLoading(false)
          return
        }
        cliente = await criarCliente(nome.trim(), telefone)
        if (!cliente) {
          setError('Erro ao criar cliente')
          setLoading(false)
          return
        }
      }

      // Criar atendimento
      const atendimento = await criarAtendimento(cliente.id, vendedorId)
      
      if (atendimento) {
        setTelefone('')
        setNome('')
        onSuccess()
        onClose()
      } else {
        setError('Erro ao criar atendimento')
      }
    } catch (err) {
      setError('Erro ao processar solicitação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Novo Atendimento</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone *
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome (opcional se já existir)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

