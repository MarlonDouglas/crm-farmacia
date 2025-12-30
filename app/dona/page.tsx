'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { LogOut, CheckCircle, Clock, DollarSign, Image as ImageIcon, History, Package, Bike, CreditCard, Banknote } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DonaPage() {
  const [pendentes, setPendentes] = useState<any[]>([])
  const [emAndamento, setEmAndamento] = useState<any[]>([])
  const [concluidos, setConcluidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    carregarTudo()
    const intervalo = setInterval(carregarTudo, 5000)
    return () => clearInterval(intervalo)
  }, [])

  async function carregarTudo() {
    // 1. Busca TUDO do dia (ou últimos 50)
    const { data } = await supabase
      .from('atendimentos')
      .select('*, cliente:clientes(nome, telefone)')
      .order('data_inicio', { ascending: false })
      .limit(50)

    if (data) {
      // Separa em 3 grupos para organizar a tela
      setPendentes(data.filter(i => i.status === 'aguardando_pix'))
      
      // Em andamento: Separação, Aguardando Motoboy, Em Rota
      setEmAndamento(data.filter(i => ['em_separacao', 'aguardando_motoboy', 'em_rota'].includes(i.status)))
      
      // Concluídos
      setConcluidos(data.filter(i => i.status === 'concluido'))
    }
    setLoading(false)
  }

  async function aprovarPix(id: string) {
    if (!confirm('Confirmar recebimento deste valor?')) return
    await supabase.from('atendimentos').update({ status: 'em_separacao', data_aprovacao_pix: new Date().toISOString() }).eq('id', id)
    carregarTudo()
  }

  // Helper para ícone de pagamento
  const IconePagamento = ({ tipo }: { tipo: string }) => {
    if (!tipo) return <DollarSign size={14} />
    if (tipo.includes('Pix')) return <div className="flex items-center gap-1 text-teal-400"><DollarSign size={14}/> Pix</div>
    if (tipo.includes('Cartão')) return <div className="flex items-center gap-1 text-blue-400"><CreditCard size={14}/> Cartão</div>
    if (tipo.includes('Dinheiro')) return <div className="flex items-center gap-1 text-green-400"><Banknote size={14}/> Dinheiro</div>
    return <span>{tipo}</span>
  }

  // Helper para URL da foto
  const getLinkComprovante = (texto: string) => {
    if(!texto) return null
    const partes = texto.split(' - ')
    if (partes.length > 1 && partes[1].startsWith('http')) return partes[1]
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 pb-20">
      <header className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
        <div><h1 className="text-xl font-bold text-green-400">Visão Geral</h1><p className="text-sm text-gray-400">Torre de Controle</p></div>
        <button onClick={() => router.push('/')} className="p-2 bg-gray-800 rounded hover:bg-gray-700"><LogOut size={20}/></button>
      </header>

      {/* --- 1. URGENTE: PIX PENDENTE --- */}
      {pendentes.length > 0 && (
        <div className="mb-8 animate-pulse">
          <h2 className="text-sm font-bold text-yellow-500 mb-2 uppercase tracking-wider flex items-center gap-2">
            <Clock size={16}/> Aprovação Necessária ({pendentes.length})
          </h2>
          <div className="space-y-3">
            {pendentes.map((item) => {
              const link = getLinkComprovante(item.forma_pagamento)
              return (
                <div key={item.id} className="bg-gray-800 p-4 rounded-lg border-l-4 border-yellow-500 shadow-lg shadow-yellow-900/20">
                  <div className="flex justify-between"><h3 className="font-bold">{item.cliente?.nome}</h3><span className="text-xs bg-yellow-900 text-yellow-100 px-2 py-1 rounded">Confira o App</span></div>
                  <div className="bg-gray-900 p-3 rounded my-3 flex justify-between border border-gray-700">
                     <span className="text-gray-400">Valor:</span><span className="text-2xl font-bold text-green-400">R$ {item.valor_total}</span>
                  </div>
                  <div className="flex gap-3">
                      {link ? (
                        <a href={link} target="_blank" className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded flex justify-center items-center gap-2 text-sm font-bold"><ImageIcon size={18}/> Ver Foto</a>
                      ) : (
                        <div className="flex-1 bg-gray-700 py-3 rounded flex justify-center text-sm font-bold text-gray-500">Sem Foto</div>
                      )}
                      <button onClick={() => aprovarPix(item.id)} className="flex-[2] bg-green-600 hover:bg-green-500 py-3 rounded flex justify-center items-center gap-2 font-bold"><CheckCircle size={20}/> Aprovar</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* --- 2. EM OPERAÇÃO (Cozinha/Entrega) --- */}
      <h2 className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-wider flex items-center gap-2 pt-4 border-t border-gray-800">
        <Package size={16}/> Em Operação ({emAndamento.length})
      </h2>
      <div className="space-y-2 mb-8">
        {emAndamento.length === 0 && <p className="text-gray-600 text-xs italic">Nenhum pedido sendo preparado agora.</p>}
        
        {emAndamento.map((item) => (
          <div key={item.id} className="bg-gray-800 p-3 rounded border border-gray-700 flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-200">{item.cliente?.nome}</p>
              <div className="text-xs text-gray-400 flex flex-col">
                <IconePagamento tipo={item.forma_pagamento} />
                {item.troco_para > 0 && <span className="text-red-400 font-bold">⚠️ Troco p/ {item.troco_para}</span>}
              </div>
            </div>
            <div className="text-right">
              <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase mb-1 block
                ${item.status === 'em_separacao' ? 'bg-purple-900 text-purple-200' : 
                  item.status === 'aguardando_motoboy' ? 'bg-indigo-900 text-indigo-200' : 'bg-orange-900 text-orange-200'}`}>
                {item.status === 'aguardando_motoboy' ? 'Esp. Motoboy' : item.status.replace('_', ' ')}
              </span>
              <p className="font-bold text-white">R$ {item.valor_total}</p>
            </div>
          </div>
        ))}
      </div>

      {/* --- 3. CONCLUÍDOS RECENTES --- */}
      <h2 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider flex items-center gap-2 pt-4 border-t border-gray-800">
        <History size={16}/> Vendas Finalizadas
      </h2>
      <div className="space-y-2 opacity-60 hover:opacity-100 transition duration-300">
        {concluidos.map((item) => (
          <div key={item.id} className="bg-gray-800 p-2 rounded border border-gray-700 flex justify-between items-center text-sm">
            <div>
              <p className="text-gray-300">{item.cliente?.nome}</p>
              <p className="text-[10px] text-gray-500">{item.forma_pagamento?.split(' (')[0]}</p>
            </div>
            <p className="font-bold text-green-500">R$ {item.valor_total}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
