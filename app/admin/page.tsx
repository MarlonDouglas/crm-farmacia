'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { LogOut, CheckCircle, Clock, DollarSign, Image as ImageIcon, History, Package, CreditCard, Banknote, Paperclip } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DonaPage() {
  const [pendentes, setPendentes] = useState<any[]>([])
  const [emAndamento, setEmAndamento] = useState<any[]>([])
  const [concluidos, setConcluidos] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    carregarTudo()
    const intervalo = setInterval(carregarTudo, 5000)
    return () => clearInterval(intervalo)
  }, [])

  async function carregarTudo() {
    const { data } = await supabase
      .from('atendimentos')
      .select('*, cliente:clientes(nome, telefone)')
      .order('data_inicio', { ascending: false })
      .limit(50)

    if (data) {
      setPendentes(data.filter(i => i.status === 'aguardando_pix'))
      setEmAndamento(data.filter(i => ['em_separacao', 'aguardando_motoboy', 'em_rota'].includes(i.status)))
      setConcluidos(data.filter(i => i.status === 'concluido'))
    }
  }

  async function aprovarPix(id: string) {
    if (!confirm('Confirmar recebimento?')) return
    await supabase.from('atendimentos').update({ status: 'em_separacao', data_aprovacao_pix: new Date().toISOString() }).eq('id', id)
    carregarTudo()
  }

  const IconePagamento = ({ tipo }: { tipo: string }) => {
    if (!tipo) return <DollarSign size={14} className="text-gray-500" />
    if (tipo.includes('Pix')) return <div className="flex items-center gap-1 text-teal-300 font-bold uppercase text-xs"><DollarSign size={14}/> Pix</div>
    if (tipo.includes('Cartão')) return <div className="flex items-center gap-1 text-blue-300 font-bold uppercase text-xs"><CreditCard size={14}/> Cartão</div>
    if (tipo.includes('Dinheiro')) return <div className="flex items-center gap-1 text-green-300 font-bold uppercase text-xs"><Banknote size={14}/> Dinheiro</div>
    return <span className="text-xs text-gray-300">{tipo}</span>
  }

  const getLinkComprovante = (texto: string) => {
    if(!texto) return null
    const partes = texto.split(' - ')
    if (partes.length > 1 && partes[1].startsWith('http')) return partes[1]
    return null
  }

  const renderPagamentoHistorico = (texto: string) => {
    if (!texto) return 'S/ Info'
    if (texto.includes('Pix Online')) return 'Pix Online'
    return texto
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 pb-20">
      <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <div><h1 className="text-2xl font-black text-green-400 uppercase tracking-widest">Financeiro</h1><p className="text-sm text-gray-400 font-medium">Torre de Controle</p></div>
        <button onClick={() => router.push('/')} className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 border border-gray-600"><LogOut size={20}/></button>
      </header>

      {/* 1. URGENTE */}
      {pendentes.length > 0 && (
        <div className="mb-10">
          <h2 className="text-base font-black text-yellow-400 mb-3 uppercase tracking-wider flex items-center gap-2 border-l-4 border-yellow-500 pl-2">
            <Clock size={20}/> Aprovação Necessária ({pendentes.length})
          </h2>
          <div className="space-y-4">
            {pendentes.map((item) => {
              const link = getLinkComprovante(item.forma_pagamento)
              return (
                <div key={item.id} className="bg-gray-800 p-5 rounded-xl border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-xl text-white">{item.cliente?.nome}</h3>
                    <span className="text-xs bg-yellow-900 text-yellow-100 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Aguardando</span>
                  </div>
                  <div className="bg-black/40 p-4 rounded-lg mb-4 flex justify-between items-center border border-gray-700">
                     <span className="text-gray-400 font-bold uppercase text-xs">Valor:</span>
                     <span className="text-3xl font-black text-green-400">R$ {item.valor_total}</span>
                  </div>
                  <div className="flex gap-3">
                      {link ? (
                        <a href={link} target="_blank" className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg flex justify-center items-center gap-2 text-sm font-black uppercase"><ImageIcon size={18}/> Ver Foto</a>
                      ) : (
                        <div className="flex-1 bg-gray-700 py-3 rounded-lg flex justify-center text-sm font-bold text-gray-500 uppercase cursor-not-allowed">Sem Foto</div>
                      )}
                      <button onClick={() => aprovarPix(item.id)} className="flex-[2] bg-green-600 hover:bg-green-500 py-3 rounded-lg flex justify-center items-center gap-2 font-black uppercase text-white shadow-lg"><CheckCircle size={20}/> Aprovar Pix</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 2. OPERAÇÃO */}
      <h2 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2 pt-6 border-t border-gray-800">
        <Package size={16}/> Em Operação ({emAndamento.length})
      </h2>
      <div className="space-y-3 mb-10">
        {emAndamento.length === 0 && <p className="text-gray-600 text-sm italic py-4 text-center">Tudo calmo na operação.</p>}
        {emAndamento.map((item) => (
          <div key={item.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center hover:bg-gray-750 transition">
            <div>
              <p className="font-bold text-white text-lg">{item.cliente?.nome}</p>
              <div className="flex flex-col mt-1">
                <IconePagamento tipo={item.forma_pagamento} />
                {item.troco_para > 0 && <span className="text-red-400 font-black text-xs mt-1 uppercase">⚠️ Troco p/ {item.troco_para}</span>}
              </div>
            </div>
            <div className="text-right">
              <span className={`text-[10px] px-2 py-1 rounded font-black uppercase mb-1 block
                ${item.status === 'em_separacao' ? 'bg-purple-900 text-purple-200' : 
                  item.status === 'aguardando_motoboy' ? 'bg-indigo-900 text-indigo-200' : 'bg-orange-900 text-orange-200'}`}>
                {item.status.replace('_', ' ')}
              </span>
              <p className="font-black text-white text-lg">R$ {item.valor_total}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. FINALIZADOS */}
      <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2 pt-6 border-t border-gray-800">
        <History size={16}/> Vendas Finalizadas
      </h2>
      <div className="space-y-2 opacity-60 hover:opacity-100 transition duration-300">
        {concluidos.map((item) => (
          <div key={item.id} className="bg-gray-800 p-3 rounded border border-gray-700 flex justify-between items-center text-sm">
            <div>
              <p className="text-gray-300 font-bold">{item.cliente?.nome}</p>
              <div className="flex items-center gap-2">
                 <p className="text-[10px] text-gray-400 uppercase font-medium">{renderPagamentoHistorico(item.forma_pagamento)}</p>
                 {item.forma_pagamento?.includes('http') && <Paperclip size={12} className="text-blue-400"/>}
              </div>
            </div>
            <p className="font-black text-green-500">R$ {item.valor_total}</p>
          </div>
        ))}
      </div>
    </div>
  )
}