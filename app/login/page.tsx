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
        .eq('usuario', usuario.trim())
        .eq('senha', senha.trim())
        .single()

      if (!funcionario) {
        setError('Acesso negado. Verifique os dados.')
        setLoading(false)
        return
      }

      // Salva sessão
      localStorage.setItem('crm_user', JSON.stringify(funcionario))

      // Roteamento Inteligente
      if (funcionario.cargo === 'vendedor') {
        router.push('/vendedor')
      } else {
        // Proprietária, Gerente e Marketing vão para o Painel Admin
        router.push('/admin')
      }

    } catch (err) {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 border-t-8 border-teal-600">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-teal-800 tracking-tighter">CRM FARMÁCIA</h1>
          <p className="text-gray-500 font-bold mt-1 text-sm uppercase tracking-widest">Sistema Interno</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-gray-400 mb-1 uppercase tracking-wider">Usuário</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 text-gray-900 font-bold bg-gray-50 transition"
              placeholder="Digite seu usuário"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 mb-1 uppercase tracking-wider">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 text-gray-900 font-bold bg-gray-50 transition"
              placeholder="••••••"
            />
          </div>

          {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center font-bold text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl transform active:scale-95 text-lg uppercase tracking-wide"
          >
            {loading ? 'Acessando...' : 'Entrar no Sistema'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-xs text-gray-400">Desenvolvido pelo Time de Marketing 🚀</p>
      </div>
    </div>
  )
}