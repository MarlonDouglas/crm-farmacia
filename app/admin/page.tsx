'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { LogOut, PieChart, TrendingUp, DollarSign, Users, AlertCircle } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
  // Atualização Forçada Vercel
export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ vendasHoje: 0, faturamentoHoje: 0, perdidas: 0 })
  const [pendentesPix, setPendentesPix] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    // 1. Verifica quem está logado
    const session = localStorage.getItem('crm_user')
    if (!session) {
      router.push('/')
      return
    }
    const usuarioLogado = JSON.parse(session)
    setUser(usuarioLogado)

    // 2. Carrega dados
    carregarDados()
  }, [])

  async function carregarDados() {
    // Buscar Pix Pendentes (Para Dona/Gerente)
    const { data: pix } = await supabase
      .from('atendimentos')
      .select('*, cliente:clientes(nome)')
      .eq('status', 'aguardando_pix')
    
    if (pix) setPendentesPix(pix)

    // Buscar Estatísticas (Para Marketing/Proprietária)
    const hoje = new Date().toISOString().split('T')[0]
    
    // Vendas Hoje
    const { data: vendas } = await supabase
      .from('atendimentos')
      .select('valor_total, status')
      .gte('data_inicio', hoje) // A partir de hoje 00:00

    if (vendas) {
      const faturamento = vendas
        .filter(v => v.status !== 'cancelado')
        .reduce((acc, curr) => acc + (curr.valor_total || 0), 0)
      
      const perdidas = vendas.filter(v => v.status === 'cancelado').length

      setStats({
        vendasHoje: vendas.length,
        faturamentoHoje: faturamento,
        perdidas: perdidas
      })
    }
  }

  async function aprovarPix(id: string) {
    if(!confirm('Confirmar recebimento?')) return
    await supabase.from('atendimentos').update({ status: 'em_separacao', data_aprovacao_pix: new Date().toISOString() }).eq('id', id)
    carregarDados() // Recarrega a tela
  }

  if (!user) return <div className="p-10 text-center">Carregando Painel...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      {/* CABEÇALHO */}
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Painel {user.cargo}</h1>
          <p className="text-sm text-gray-500 font-medium">Bem-vindo, {user.nome}</p>
        </div>
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition">
          <LogOut size={18}/> Sair
        </button>
      </header>

      {/* DASHBOARD (Para Todos: Marketing e Dona) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Faturamento Hoje</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">R$ {stats.faturamentoHoje.toFixed(2)}</h3>
            </div>
            <div className="p-2 bg-green-100 rounded-lg text-green-700"><DollarSign size={24}/></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
           <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Pedidos</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.vendasHoje}</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg text-blue-700"><TrendingUp size={24}/></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
           <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Vendas Perdidas</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.perdidas}</h3>
            </div>
            <div className="p-2 bg-red-100 rounded-lg text-red-700"><AlertCircle size={24}/></div>
          </div>
           <p className="text-xs text-red-400 mt-2 font-bold cursor-pointer hover:underline">Ver Motivos &rarr;</p>
        </div>
      </div>

      {/* ÁREA DE OPERAÇÃO (Só aparece se tiver Pix Pendente) */}
      {pendentesPix.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2"><AlertCircle className="text-yellow-500"/> Aprovação Necessária ({pendentesPix.length})</h2>
          <div className="grid gap-3">
            {pendentesPix.map(pix => (
               <div key={pix.id} className="bg-white p-4 rounded-xl border border-yellow-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-center md:text-left">
                    <p className="font-bold text-gray-900 text-lg">{pix.cliente?.nome}</p>
                    <p className="text-green-600 font-black text-xl">R$ {pix.valor_total}</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    {pix.comprovante_pix_url && pix.comprovante_pix_url.includes('http') ? (
                       <a href={pix.comprovante_pix_url.split(' - ')[1]} target="_blank" className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 text-center hover:bg-blue-100">Ver Comprovante</a>
                    ) : (
                       <span className="flex-1 px-4 py-2 bg-gray-100 text-gray-400 font-bold rounded-lg text-center">Sem Foto</span>
                    )}
                    <button onClick={() => aprovarPix(pix.id)} className="flex-[2] px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg hover:shadow-xl transition">APROVAR ✅</button>
                  </div>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* ÁREA DE MARKETING (Só aparece para Marketing ou Proprietária) */}
      {(user.cargo === 'marketing' || user.cargo === 'proprietaria') && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
           <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2"><PieChart className="text-purple-600"/> Inteligência de Vendas</h2>
           <div className="h-40 bg-gray-50 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 font-bold">
              Gráfico de Bairros (Em breve)
           </div>
        </div>
      )}

    </div>
  )
}