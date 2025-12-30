'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// 1. INICIALIZAÇÃO SIMPLIFICADA (Igual ao do Vendedor)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Tentando logar com:', usuario)

      // 2. BUSCA DIRETA NO BANCO (Sem depender de arquivos externos)
      const { data: funcionarios, error: dbError } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('usuario', usuario)
        .eq('senha', senha) // No futuro podemos criptografar, para o MVP é texto puro
        .single()

      if (dbError || !funcionarios) {
        console.error('Erro ou não achou:', dbError)
        setError('Usuário ou senha incorretos')
        setLoading(false)
        return
      }

      // 3. SE ACHOU, VERIFICA O CARGO
      console.log('Login sucesso:', funcionarios)
      
      // Salva no navegador que o usuário está logado (Básico)
      localStorage.setItem('crm_user', JSON.stringify(funcionarios))

      const cargo = funcionarios.cargo

      if (cargo === 'vendedor' || cargo === 'gerente') {
        router.push('/vendedor')
      } else if (cargo === 'dona') {
        router.push('/dona')
      } else {
        setError(`Cargo desconhecido: ${cargo}`)
      }

    } catch (err) {
      console.error('Erro fatal:', err)
      setError('Erro ao conectar no sistema')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">CRM Farmácia</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuário
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: joao"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        
        <p className="text-center text-xs text-gray-400 mt-4">
          Sistema Interno - Versão 1.0
        </p>
      </div>
    </div>
  )
}