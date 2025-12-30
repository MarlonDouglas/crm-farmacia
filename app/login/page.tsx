'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

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
      const { data: funcionario } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('usuario', usuario.trim()) // Trim remove espaços acidentais
        .eq('senha', senha.trim())
        .single()

      if (!funcionario) {
        setError('Usuário ou senha incorretos')
        setLoading(false)
        return
      }

      // Salva sessão simples no navegador
      localStorage.setItem('crm_user', JSON.stringify(funcionario))

      if (funcionario.cargo === 'vendedor' || funcionario.cargo === 'gerente') {
        router.push('/vendedor')
      } else if (funcionario.cargo === 'dona') {
        router.push('/dona')
      } else {
        setError('Cargo sem permissão de acesso')
      }

    } catch (err) {
      setError('Erro de conexão. Verifique a internet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 border-t-8 border-teal-600">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-teal-700 uppercase tracking-tight">Farmácia CRM</h1>
          <p className="text-gray-800 font-medium mt-2">Sistema Interno</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-base font-bold text-black mb-2 uppercase">
              Usuário
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-teal-600 text-black font-bold text-lg placeholder-gray-500"
              placeholder="Digite seu usuário"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-base font-bold text-black mb-2 uppercase">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-teal-600 text-black font-bold text-lg"
              placeholder="••••••"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-100 text-red-900 rounded-lg text-center font-bold border-2 border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-teal-700 text-white font-extrabold rounded-lg hover:bg-teal-800 transition-colors shadow-lg text-xl uppercase tracking-wider"
          >
            {loading ? 'ENTRANDO...' : 'ACESSAR'}
          </button>
        </form>
      </div>
    </div>
  )
}