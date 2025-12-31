'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { LogOut, Plus, MessageCircle, Truck, Wallet, Paperclip, Bike, Package, CheckCircle, Banknote, CreditCard, QrCode, Star, Copy, X } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function VendedorPage() {
  const [atendimentos, setAtendimentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [novoTelefone, setNovoTelefone] = useState('')
  const [uploading, setUploading] = useState(false)
  const [toastMensagem, setToastMensagem] = useState('')

  // Estados Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [etapaModal, setEtapaModal] = useState(1)
  const [idAtendimentoAtual, setIdAtendimentoAtual] = useState('')
  const [tipoPagamento, setTipoPagamento] = useState('')
  const [valorVenda, setValorVenda] = useState('')
  const [valorTroco, setValorTroco] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [idParaUpload, setIdParaUpload] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    buscarAtendimentos()
    const intervalo = setInterval(() => buscarAtendimentos(true), 5000)
    return () => clearInterval(intervalo)
  }, [])

  async function buscarAtendimentos(silencioso = false) {
    try {
      if (!silencioso) setLoading(true)
      const { data } = await supabase
        .from('atendimentos')
        .select('*, cliente:clientes(nome, telefone)')
        .order('data_inicio', { ascending: false })
      if (data) setAtendimentos(data)
    } catch (err) { console.error(err) } 
    finally { if (!silencioso) setLoading(false) }
  }

  async function criarAtendimento() {
    if (!novoTelefone) return alert('Digite o telefone!')
    let { data: cliente } = await supabase.from('clientes').select('id').eq('telefone', novoTelefone).single()
    if (!cliente) {
      const { data: novo } = await supabase.from('clientes').insert([{ telefone: novoTelefone, nome: 'Novo Cliente' }]).select().single()
      cliente = novo
    }
    if (cliente) {
      await supabase.from('atendimentos').insert([{ cliente_id: cliente.id, status: 'novo' }])
      setNovoTelefone('')
      buscarAtendimentos(true)
    }
  }

  function abrirModalPagamento(id: string) {
    setIdAtendimentoAtual(id)
    setEtapaModal(1)
    setTipoPagamento('')
    setValorVenda('')
    setValorTroco('')
    setModalAberto(true)
  }

  async function finalizarPagamento() {
    if (!valorVenda) return alert('Digite o valor!')
    try {
      const valorFloat = parseFloat(valorVenda.replace(',', '.'))
      let statusNovo = 'em_separacao'
      let formaPgtoTexto = tipoPagamento
      let trocoFloat = null

      if (tipoPagamento === 'pix_online') {
        statusNovo = 'aguardando_pix'
        formaPgtoTexto = 'Pix Online'
      } else if (tipoPagamento === 'dinheiro') {
        formaPgtoTexto = 'Dinheiro'
        if (valorTroco) {
          trocoFloat = parseFloat(valorTroco.replace(',', '.'))
          formaPgtoTexto += ` (Troco p/ ${trocoFloat})`
        } else {
          formaPgtoTexto += ' (S/ troco)'
        }
      } else {
        formaPgtoTexto = tipoPagamento === 'cartao' ? 'Cartão (Maq)' : 'Pix (Maq)'
      }

      const { error } = await supabase.from('atendimentos').update({
        status: statusNovo,
        valor_total: valorFloat,
        forma_pagamento: formaPgtoTexto,
        troco_para: trocoFloat
      }).eq('id', idAtendimentoAtual)

      if (error) throw error
      setModalAberto(false)
      mostrarToast('Venda Confirmada! ✅')
      buscarAtendimentos(true)
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message)
    }
  }

  async function avancarStatus(id: string, proximoStatus: string) {
    await supabase.from('atendimentos').update({ status: proximoStatus }).eq('id', id)
    buscarAtendimentos(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !idParaUpload) return
    const file = e.target.files[0]
    setUploading(true)
    try {
      const nomeArquivo = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`
      await supabase.storage.from('comprovantes').upload(nomeArquivo, file)
      const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(nomeArquivo)
      
      await supabase.from('atendimentos').update({ 
        forma_pagamento: `Pix Online - ${publicUrl}` 
      }).eq('id', idParaUpload)
      
      mostrarToast('Comprovante Enviado!')
      buscarAtendimentos(true)
    } catch (error) { alert('Erro upload') } 
    finally { setUploading(false); setIdParaUpload(null) }
  }

  const mostrarToast = (msg: string) => {
    setToastMensagem(msg)
    setTimeout(() => setToastMensagem(''), 3000)
  }

  const copiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto)
    mostrarToast('Texto copiado!')
  }

  const formatarStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'novo': 'Novo',
      'em_negociacao': 'Em Negociação',
      'aguardando_pix': 'Aguardando PIX',
      'em_separacao': 'Em Separação',
      'aguardando_motoboy': 'Esp. Motoboy',
      'em_rota': 'Em Rota',
      'concluido': 'Concluído'
    }
    return statusMap[status] || status.replace('_', ' ')
  }

  const renderPagamento = (texto: string) => {
    if (!texto) return '-'
    if (texto.includes('http')) {
      const [tipo, url] = texto.split(' - ')
      return <span className="flex items-center gap-1 font-bold text-gray-900">{tipo} <a href={url} target="_blank" className="text-blue-700 underline font-extrabold ml-1 flex items-center bg-blue-100 px-2 rounded"><Paperclip size={14}/> VER FOTO</a></span>
    }
    return <span className="font-bold text-gray-900">{texto}</span>
  }

  const scripts = [
    { label: '1. Saudação', texto: 'Olá! Tudo bem? Sou da Farmácia. Vi seu pedido, podemos confirmar?', icone: MessageCircle },
    { label: '2. Pagamento?', texto: 'Como prefere pagar? Levamos maquininha (Cartão/Pix) ou troco para Dinheiro. Se preferir, tenho Pix Online.', icone: Wallet },
    { label: '3. Chave Pix', texto: 'Chave Pix: CNPJ XX.XXX.XXX/0001-XX. Me envia o comprovante por favor?', icone: QrCode },
    { label: '4. Separando', texto: 'Pedido confirmado! Já estamos separando. Assim que o motoboy pegar, te aviso.', icone: Package },
    { label: '5. Saiu Entrega', texto: 'Seu pedido saiu para entrega! 🛵 Fique atento ao interfone/campainha.', icone: Bike },
    { label: '6. Finalizar', texto: 'Pedido entregue! Obrigado pela preferência! 🥰', icone: Star },
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-200 border-r border-gray-300 relative">
      
      {toastMensagem && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-black text-white px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center gap-2 border-2 border-green-400">
          <Copy size={24} className="text-green-400" /> <span className="text-lg">{toastMensagem}</span>
        </div>
      )}

      {/* MODAL (Alto Contraste) */}
      {modalAberto && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border-4 border-teal-600">
            <div className="bg-teal-700 p-4 flex justify-between items-center">
              <span className="font-extrabold text-white text-xl uppercase">Pagamento</span>
              <button onClick={() => setModalAberto(false)}><X size={28} className="text-white"/></button>
            </div>
            
            <div className="p-6">
              {etapaModal === 1 ? (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { setTipoPagamento('pix_online'); setEtapaModal(2) }} className="p-4 border-2 border-gray-300 bg-gray-50 hover:bg-teal-100 hover:border-teal-600 rounded-xl flex flex-col items-center gap-2 transition"><QrCode size={32} className="text-teal-800"/><span className="text-base font-bold text-black">Pix Online</span></button>
                  <button onClick={() => { setTipoPagamento('cartao'); setEtapaModal(2) }} className="p-4 border-2 border-gray-300 bg-gray-50 hover:bg-blue-100 hover:border-blue-600 rounded-xl flex flex-col items-center gap-2 transition"><CreditCard size={32} className="text-blue-800"/><span className="text-base font-bold text-black">Cartão</span></button>
                  <button onClick={() => { setTipoPagamento('pix_maq'); setEtapaModal(2) }} className="p-4 border-2 border-gray-300 bg-gray-50 hover:bg-purple-100 hover:border-purple-600 rounded-xl flex flex-col items-center gap-2 transition"><QrCode size={32} className="text-purple-800"/><span className="text-sm font-bold text-black">Pix Maq.</span></button>
                  <button onClick={() => { setTipoPagamento('dinheiro'); setEtapaModal(2) }} className="p-4 border-2 border-gray-300 bg-gray-50 hover:bg-green-100 hover:border-green-600 rounded-xl flex flex-col items-center gap-2 transition"><Banknote size={32} className="text-green-800"/><span className="text-base font-bold text-black">Dinheiro</span></button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-black text-black uppercase block mb-2">Valor da Venda (R$)</label>
                    <input type="number" autoFocus value={valorVenda} onChange={e => setValorVenda(e.target.value)} className="w-full text-4xl font-black border-4 border-teal-600 rounded-xl p-4 text-center focus:outline-none text-black bg-teal-50" placeholder="0,00" />
                  </div>
                  {tipoPagamento === 'dinheiro' && (
                    <div className="bg-yellow-100 p-4 rounded-xl border-2 border-yellow-400">
                      <label className="text-sm font-black text-black uppercase block mb-2">Troco para quanto?</label>
                      <input type="number" value={valorTroco} onChange={e => setValorTroco(e.target.value)} className="w-full text-2xl font-bold border-b-4 border-black bg-transparent focus:outline-none py-2 text-center text-black placeholder-gray-500" placeholder="Sem troco" />
                    </div>
                  )}
                  <button onClick={finalizarPagamento} className="w-full bg-teal-700 text-white font-black py-4 rounded-xl hover:bg-teal-800 text-xl shadow-lg uppercase">CONFIRMAR</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-teal-700 text-white p-4 flex justify-between items-center shadow-lg">
        <div><h1 className="font-extrabold text-2xl tracking-wide">CRM VENDEDOR</h1><p className="text-sm text-teal-100 font-bold">👤 João</p></div>
        <button onClick={() => router.push('/')} className="p-2 hover:bg-teal-800 rounded-full"><LogOut size={24}/></button>
      </header>

      {/* NOVO */}
      <div className="p-4 bg-white border-b-2 border-gray-300 shadow-md flex gap-2">
        <input type="text" placeholder="Digite o Telefone..." className="flex-1 border-2 border-gray-400 p-4 rounded-xl text-black font-bold text-lg bg-gray-50 focus:bg-white focus:border-teal-600 outline-none placeholder-gray-500" value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)} />
        <button onClick={criarAtendimento} className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl shadow-lg"><Plus size={28}/></button>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-32">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        
        {atendimentos.map((item) => {
          let borderClass = 'border-l-8 border-gray-400'
          if(item.status === 'novo') borderClass = 'border-l-8 border-blue-600'
          if(item.status === 'aguardando_pix') borderClass = 'border-l-8 border-yellow-500'
          if(item.status === 'em_separacao') borderClass = 'border-l-8 border-purple-600'
          if(item.status === 'aguardando_motoboy') borderClass = 'border-l-8 border-indigo-600'
          if(item.status === 'em_rota') borderClass = 'border-l-8 border-orange-500'
          if(item.status === 'concluido') borderClass = 'border-l-8 border-green-600'

          return (
            <div key={item.id} className={`bg-white p-5 rounded-xl shadow-md border-2 border-gray-200 ${borderClass}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-extrabold text-xl text-black">{item.cliente?.nome || 'Cliente'}</h3>
                  <p className="text-lg font-bold text-black mt-1">📱 {item.cliente?.telefone}</p>
                </div>
                <span className="text-xs font-black uppercase px-3 py-1 bg-gray-200 rounded-full text-black border border-gray-400">{formatarStatus(item.status)}</span>
              </div>

              {item.valor_total > 0 && (
                <div className="bg-gray-100 p-3 rounded-lg my-3 border-2 border-gray-300">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-gray-700 text-sm uppercase">Valor:</span>
                    <span className="font-black text-green-800 text-lg">R$ {item.valor_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-700 text-sm uppercase">Pgto:</span>
                    <span className="text-black">{renderPagamento(item.forma_pagamento)}</span>
                  </div>
                  {item.troco_para > 0 && <p className="bg-red-100 text-red-800 font-black mt-2 text-center rounded border border-red-300 py-1 uppercase">⚠️ Troco para R$ {item.troco_para}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 mt-3">
                {item.status === 'novo' && <button onClick={() => avancarStatus(item.id, 'em_negociacao')} className="bg-blue-100 text-blue-900 py-3 rounded-lg font-black text-sm border-2 border-blue-300 hover:bg-blue-200 uppercase">▶ Iniciar Atendimento</button>}
                
                {item.status === 'em_negociacao' && <button onClick={() => abrirModalPagamento(item.id)} className="bg-teal-600 text-white py-3 rounded-lg font-black text-base hover:bg-teal-700 shadow-md uppercase">💲 Finalizar Venda</button>}
                
                {item.status === 'aguardando_pix' && (
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center justify-center text-sm text-gray-600 bg-gray-100 rounded-lg font-bold border-2 border-gray-200 italic">⏳ Aguardando Dona...</div>
                    <button onClick={() => { setIdParaUpload(item.id); fileInputRef.current?.click() }} className="px-4 bg-gray-200 hover:bg-gray-300 rounded-lg border-2 border-gray-400 flex items-center gap-1 text-sm font-black text-black uppercase" title="Anexar Comprovante">
                       {uploading ? '...' : <><Paperclip size={18}/> Anexar</>}
                    </button>
                  </div>
                )}

                {item.status === 'em_separacao' && <button onClick={() => avancarStatus(item.id, 'aguardando_motoboy')} className="bg-purple-100 text-purple-900 py-3 rounded-lg font-black text-sm border-2 border-purple-300 hover:bg-purple-200 uppercase"><Package size={18} className="inline mr-2"/> Pronto p/ Motoboy</button>}
                {item.status === 'aguardando_motoboy' && <button onClick={() => avancarStatus(item.id, 'em_rota')} className="bg-indigo-100 text-indigo-900 py-3 rounded-lg font-black text-sm border-2 border-indigo-300 hover:bg-indigo-200 uppercase"><Bike size={18} className="inline mr-2"/> Saiu p/ Entrega</button>}
                {item.status === 'em_rota' && <button onClick={() => avancarStatus(item.id, 'concluido')} className="bg-green-100 text-green-900 py-3 rounded-lg font-black text-sm border-2 border-green-300 hover:bg-green-200 uppercase"><CheckCircle size={18} className="inline mr-2"/> Confirmar Entrega</button>}
              </div>
            </div>
          )
        })}
      </div>

      {/* RODAPÉ */}
      <div className="bg-white p-2 border-t-2 border-gray-400 grid grid-cols-3 gap-2 shadow-[0_-5px_10px_rgba(0,0,0,0.1)] z-10">
        {scripts.map((s, i) => (
          <button key={i} onClick={() => copiarTexto(s.texto)} className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition border border-gray-200 group">
            <s.icone size={22} className="text-teal-700 mb-1 group-active:scale-110 transition" />
            <span className="text-[11px] text-center leading-tight text-black font-extrabold uppercase">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}