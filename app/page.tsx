'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Inicializa o Supabase
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
      // Busca usuário no banco
      const { data: funcionario } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('usuario', usuario)
        .eq('senha', senha)
        .single()

      if (!funcionario) {
        setError('Usuário ou senha incorretos')
        setLoading(false)
        return
      }

      // Salva sessão e redireciona
      const cargo = funcionario.cargo
      if (cargo === 'vendedor' || cargo === 'gerente') {
        router.push('/vendedor')
      } else if (cargo === 'dona') {
        router.push('/dona')
      } else {
        setError('Cargo não reconhecido')
      }

    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Fundo cinza claro estilo WhatsApp Web
    <div className="min-h-screen flex items-center justify-center bg-[#efeae2] px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 border-t-4 border-teal-600">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-700">CRM Farmácia</h1>
          <p className="text-gray-500 mt-2">Acesso Restrito</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Usuário
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 bg-white placeholder-gray-400"
              placeholder="Digite seu usuário"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 bg-white"
              placeholder="Digite sua senha"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center font-medium border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-md text-lg"
          >
            {loading ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}