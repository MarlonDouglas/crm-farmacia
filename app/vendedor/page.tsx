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

  // Estados do Modal
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

      // ATUALIZAÇÃO NO BANCO
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
      console.error(error)
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
    mostrarToast('Texto copiado! Cole no WhatsApp')
  }

  const renderPagamento = (texto: string) => {
    if (!texto) return '-'
    if (texto.includes('http')) {
      const [tipo, url] = texto.split(' - ')
      return <span className="flex items-center gap-1">{tipo} <a href={url} target="_blank" className="text-blue-600 underline font-bold ml-1 flex items-center"><Paperclip size={12}/> Ver Foto</a></span>
    }
    return texto
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
    <div className="flex flex-col h-screen bg-[#efeae2] border-r border-gray-300 relative">
      
      {toastMensagem && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl animate-in fade-in slide-in-from-top-4 font-bold flex items-center gap-2">
          <Copy size={18} className="text-green-400" /> {toastMensagem}
        </div>
      )}

      {/* MODAL REFORMULADO (ALTO CONTRASTE) */}
      {modalAberto && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border-2 border-gray-200">
            <div className="bg-gray-100 p-4 border-b border-gray-300 flex justify-between items-center">
              <span className="font-bold text-gray-800 text-lg">Forma de Pagamento</span>
              <button onClick={() => setModalAberto(false)} className="text-gray-500 hover:text-red-600"><X size={24}/></button>
            </div>
            
            <div className="p-6">
              {etapaModal === 1 ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* Botões Grandes e Claros */}
                  <button onClick={() => { setTipoPagamento('pix_online'); setEtapaModal(2) }} 
                    className="p-4 border-2 border-teal-200 bg-white hover:bg-teal-50 hover:border-teal-600 rounded-xl flex flex-col items-center gap-2 transition group">
                    <QrCode size={32} className="text-teal-600 group-hover:scale-110 transition"/>
                    <span className="text-sm font-bold text-gray-800">Pix Online</span>
                  </button>

                  <button onClick={() => { setTipoPagamento('cartao'); setEtapaModal(2) }} 
                    className="p-4 border-2 border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-600 rounded-xl flex flex-col items-center gap-2 transition group">
                    <CreditCard size={32} className="text-blue-600 group-hover:scale-110 transition"/>
                    <span className="text-sm font-bold text-gray-800">Cartão</span>
                  </button>

                  <button onClick={() => { setTipoPagamento('pix_maq'); setEtapaModal(2) }} 
                    className="p-4 border-2 border-purple-200 bg-white hover:bg-purple-50 hover:border-purple-600 rounded-xl flex flex-col items-center gap-2 transition group">
                    <QrCode size={32} className="text-purple-600 group-hover:scale-110 transition"/>
                    <span className="text-xs font-bold text-gray-800 text-center">Pix Maquininha</span>
                  </button>

                  <button onClick={() => { setTipoPagamento('dinheiro'); setEtapaModal(2) }} 
                    className="p-4 border-2 border-green-200 bg-white hover:bg-green-50 hover:border-green-600 rounded-xl flex flex-col items-center gap-2 transition group">
                    <Banknote size={32} className="text-green-600 group-hover:scale-110 transition"/>
                    <span className="text-sm font-bold text-gray-800">Dinheiro</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Valor Total (R$)</label>
                    <input type="number" autoFocus value={valorVenda} onChange={e => setValorVenda(e.target.value)} className="w-full text-3xl font-bold border-2 border-teal-500 rounded-lg p-3 text-center focus:outline-none" placeholder="0,00" />
                  </div>
                  
                  {tipoPagamento === 'dinheiro' && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <label className="text-xs font-bold text-orange-800 uppercase block mb-1">Troco para quanto?</label>
                      <input type="number" value={valorTroco} onChange={e => setValorTroco(e.target.value)} className="w-full text-lg border-b-2 border-orange-300 bg-transparent focus:border-orange-600 focus:outline-none py-1 text-center text-gray-800" placeholder="Não precisa" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <button onClick={finalizarPagamento} className="w-full bg-teal-600 text-white font-bold py-4 rounded-lg hover:bg-teal-700 text-lg shadow-md">
                      CONFIRMAR VENDA
                    </button>
                    <button onClick={() => setEtapaModal(1)} className="w-full text-gray-500 text-sm py-2 hover:underline">
                      Voltar e Escolher Outro
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-teal-600 text-white p-4 flex justify-between items-center shadow-md">
        <div><h1 className="font-bold text-xl">CRM Vendedor</h1><p className="text-xs text-teal-100 font-medium">Logado como João</p></div>
        <button onClick={() => router.push('/')} className="p-2 hover:bg-teal-700 rounded-full"><LogOut size={20}/></button>
      </header>

      {/* NOVO ATENDIMENTO */}
      <div className="p-4 bg-white border-b border-gray-300 shadow-sm flex gap-2">
        <input type="text" placeholder="Telefone do Cliente..." className="flex-1 border p-3 rounded-lg bg-gray-50 focus:bg-white focus:border-teal-500 outline-none" value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)} />
        <button onClick={criarAtendimento} className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg shadow"><Plus size={24}/></button>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        
        {atendimentos.map((item) => {
          let borderClass = 'border-l-4 border-gray-400'
          if(item.status === 'novo') borderClass = 'border-l-4 border-blue-500'
          if(item.status === 'aguardando_pix') borderClass = 'border-l-4 border-yellow-500'
          if(item.status === 'em_separacao') borderClass = 'border-l-4 border-purple-500'
          if(item.status === 'aguardando_motoboy') borderClass = 'border-l-4 border-indigo-500'
          if(item.status === 'em_rota') borderClass = 'border-l-4 border-orange-500'
          if(item.status === 'concluido') borderClass = 'border-l-4 border-green-500'

          return (
            <div key={item.id} className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${borderClass}`}>
              <div className="flex justify-between items-start">
                <div><h3 className="font-bold text-gray-800">{item.cliente?.nome}</h3><p className="text-sm text-gray-600">📱 {item.cliente?.telefone}</p></div>
                <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-100 rounded text-gray-600">{item.status.replace('_', ' ')}</span>
              </div>

              {item.valor_total > 0 && (
                <div className="bg-gray-50 p-2 rounded text-xs my-3 border border-gray-100">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-gray-500">Valor:</span>
                    <span className="font-bold text-green-700 text-sm">R$ {item.valor_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-500">Pgto:</span>
                    <span className="text-gray-700 truncate max-w-[150px]">{renderPagamento(item.forma_pagamento)}</span>
                  </div>
                  {item.troco_para > 0 && <p className="text-red-600 font-bold mt-1 text-center bg-red-50 rounded py-1">⚠️ Troco p/ {item.troco_para}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 mt-2">
                {item.status === 'novo' && <button onClick={() => avancarStatus(item.id, 'em_negociacao')} className="bg-blue-50 text-blue-700 py-2 rounded font-bold text-sm border border-blue-200">Iniciar Atendimento</button>}
                {item.status === 'em_negociacao' && <button onClick={() => abrirModalPagamento(item.id)} className="bg-teal-600 text-white py-2 rounded font-bold text-sm hover:bg-teal-700 shadow">Finalizar Venda ($)</button>}
                
                {item.status === 'aguardando_pix' && (
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center justify-center text-xs text-gray-500 bg-gray-100 rounded italic">Aguardando Dona...</div>
                    <button onClick={() => { setIdParaUpload(item.id); fileInputRef.current?.click() }} className="px-3 bg-gray-200 hover:bg-gray-300 rounded border border-gray-300 flex items-center gap-1 text-xs font-bold" title="Anexar Comprovante">
                       {uploading ? '...' : <><Paperclip size={14}/> Anexar</>}
                    </button>
                  </div>
                )}

                {item.status === 'em_separacao' && <button onClick={() => avancarStatus(item.id, 'aguardando_motoboy')} className="bg-purple-50 text-purple-700 py-2 rounded font-bold text-sm border border-purple-200"><Package size={16} className="inline mr-1"/> Pronto p/ Motoboy</button>}
                {item.status === 'aguardando_motoboy' && <button onClick={() => avancarStatus(item.id, 'em_rota')} className="bg-orange-50 text-orange-700 py-2 rounded font-bold text-sm border border-orange-200"><Bike size={16} className="inline mr-1"/> Saiu p/ Entrega</button>}
                {item.status === 'em_rota' && <button onClick={() => avancarStatus(item.id, 'concluido')} className="bg-green-50 text-green-700 py-2 rounded font-bold text-sm border border-green-200"><CheckCircle size={16} className="inline mr-1"/> Entrega Confirmada</button>}
              </div>
            </div>
          )
        })}
      </div>

      {/* RODAPÉ DE HOTKEYS */}
      <div className="bg-white p-2 border-t border-gray-300 grid grid-cols-3 gap-2 shadow-lg z-10">
        {scripts.map((s, i) => (
          <button key={i} onClick={() => copiarTexto(s.texto)} className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-50 active:scale-95 transition border border-transparent hover:border-gray-200 group">
            <s.icone size={18} className="text-teal-600 mb-1 group-active:scale-110 transition" />
            <span className="text-[10px] text-center leading-tight text-gray-700 font-bold">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}