'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  LogOut, Plus, MessageCircle, Wallet, Paperclip, Bike, Package, 
  CheckCircle, Banknote, CreditCard, QrCode, Star, MapPin, AlertOctagon, 
  Eye, XCircle, History, User, Search, BarChart2, List, Timer, Bell, Clock 
} from 'lucide-react'

// --- CONFIGURAÇÃO DO SUPABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- COMPONENTE CRONÔMETRO OTIMIZADO ---
function Cronometro({ dataReferencia, status }: { dataReferencia: string, status: string }) {
  const [tempo, setTempo] = useState('00:00')
  const [cor, setCor] = useState('text-gray-400')

  useEffect(() => {
    if (status === 'concluido' || status === 'cancelado' || !dataReferencia) return
    
    const atualizarCronometro = () => {
      const now = new Date().getTime()
      const start = new Date(dataReferencia).getTime()
      let diff = Math.floor((now - start) / 1000) 
      if (diff < 0) diff = 0

      const min = Math.floor(diff / 60)
      const sec = diff % 60
      setTempo(`${min}:${sec < 10 ? '0' : ''}${sec}`)

      if (min < 2) setCor('text-green-600')         
      else if (min < 5) setCor('text-yellow-600')   
      else if (min < 10) setCor('text-orange-600')  
      else setCor('text-red-600 animate-pulse font-black') 
    }

    atualizarCronometro()
    const interval = setInterval(atualizarCronometro, 1000)
    return () => clearInterval(interval)
  }, [dataReferencia, status])

  return (
    <span className={`font-mono font-bold flex items-center gap-1 ${cor} text-xs`}>
      <Timer size={12}/> {tempo}
    </span>
  )
}

export default function VendedorPage() {
  const [atendimentos, setAtendimentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [criandoAtendimento, setCriandoAtendimento] = useState(false)
  const [novoTelefone, setNovoTelefone] = useState('')
  const [uploading, setUploading] = useState(false)
  const [toastMensagem, setToastMensagem] = useState('')

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Modais e Estados Auxiliares
  const [modalAberto, setModalAberto] = useState(false)
  const [modalFoto, setModalFoto] = useState<string | null>(null)
  const [modalPerda, setModalPerda] = useState(false)
  const [modalHistorico, setModalHistorico] = useState(false)
  const [modalRemarketing, setModalRemarketing] = useState(false)
  const [modalDesempenho, setModalDesempenho] = useState(false)

  // Dados de Fluxo
  const [rmkProduto, setRmkProduto] = useState('')
  const [rmkDias, setRmkDias] = useState(30)
  const [rmkContinuo, setRmkContinuo] = useState(false)
  const [historicoCliente, setHistoricoCliente] = useState<any[]>([])
  const [clienteHistoricoNome, setClienteHistoricoNome] = useState('')
  const [statsDia, setStatsDia] = useState<any>({ total: 0, vendas: 0, perdas: 0, novos: 0, listaClientes: [] })

  // Edição Venda / Pagamento
  const [etapaModal, setEtapaModal] = useState(1)
  const [idAtendimentoAtual, setIdAtendimentoAtual] = useState('')
  const [tipoPagamento, setTipoPagamento] = useState('')
  const [valorVenda, setValorVenda] = useState('')
  const [valorTroco, setValorTroco] = useState('')
  const [motivoPerda, setMotivoPerda] = useState('')

  // Endereço e Validação
  const [cep, setCep] = useState('')
  const [erroCep, setErroCep] = useState(false)
  const [logradouro, setLogradouro] = useState('')
  const [bairro, setBairro] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('') 
  const [cidade, setCidade] = useState('Juiz de Fora')
  const [buscandoEnd, setBuscandoEnd] = useState(false)

  const [idParaUpload, setIdParaUpload] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // --- EFEITOS DE FOCO E INICIALIZAÇÃO ---

  useEffect(() => {
    buscarAtendimentos()
    const telUrl = searchParams.get('tel')
    if (telUrl) setNovoTelefone(telUrl)
    
    const intervalo = setInterval(() => {
        buscarAtendimentos(true)
        verificarTemposLimite()
    }, 5000)
    return () => clearInterval(intervalo)
  }, [searchParams])

  // Foco automático no CEP ao abrir modal de endereço
  useEffect(() => {
    if (modalAberto && etapaModal === 2) {
      setTimeout(() => document.getElementById('input-cep')?.focus(), 100)
    }
  }, [modalAberto, etapaModal])

  // --- FUNÇÕES AUXILIARES DE DATA ---
  const obterDataReferencia = (item: any) => {
    switch (item.status) {
      case 'novo': return item.data_inicio;
      case 'em_negociacao': return item.data_negociacao || item.data_inicio;
      case 'aguardando_pix': return item.data_aguardando_pix || item.data_fechamento;
      case 'em_separacao': return item.data_pagamento || item.data_fechamento;
      case 'aguardando_motoboy': return item.data_separacao_fim || item.data_pagamento;
      case 'em_rota': return item.data_saida_moto || item.data_separacao_fim;
      default: return item.data_inicio;
    }
  }

  // --- ROBÔ: AUTO-CANCELAMENTO ---
  const verificarTemposLimite = async () => {
      const dezMinutosAtras = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { data: expirados } = await supabase
        .from('atendimentos')
        .select('id')
        .in('status', ['novo', 'em_negociacao'])
        .lt('data_inicio', dezMinutosAtras)
      
      if (expirados && expirados.length > 0) {
          for (const item of expirados) {
              await supabase.from('atendimentos').update({
                  status: 'cancelado',
                  motivo_cancelamento: 'Auto-Cancelado (Inatividade 10min)',
                  auto_cancelado: true,
                  data_fim: new Date().toISOString()
              }).eq('id', item.id)
          }
          buscarAtendimentos(true)
      }
  }

  // --- NAVEGAÇÃO E TECLADO (ENTER FLOW) ---
  const handleTelefoneEnter = async (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault()
          if (!novoTelefone) return alert('Digite o telefone!')
          const { data: cliente } = await supabase.from('clientes').select('*').eq('telefone', novoTelefone).single()
          await criarAtendimento()
          setTimeout(() => {
             if (!cliente) {
                 const inputsNome = document.querySelectorAll('input[name="nome-cliente"]')
                 if (inputsNome.length > 0) (inputsNome[0] as HTMLInputElement).focus()
             } else {
                 // Se já existe, foca no botão de Iniciar do Card
                 const botoesStart = document.querySelectorAll('button[name="btn-acao-principal"]')
                 if (botoesStart.length > 0) (botoesStart[0] as HTMLButtonElement).focus()
             }
          }, 500)
      }
  }

  const handleNomeEnter = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
          // Lógica inteligente: Foca no botão principal de ação do card (Iniciar ou Fechar Venda)
          const card = (e.target as HTMLElement).closest('.card-atendimento')
          const btn = card?.querySelector('button[name="btn-acao-principal"]') as HTMLButtonElement
          if (btn) btn.focus()
      }
  }

  // --- API / SUPABASE ACTIONS ---
  const buscarCep = async (cepInput: string) => {
    const cepLimpo = cepInput.replace(/\D/g, '')
    setCep(cepInput)
    setErroCep(false)
    
    if (cepLimpo.length === 8) {
        setBuscandoEnd(true)
        try {
            const r = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
            const d = await r.json()
            if (!d.erro) {
                preencherEndereco(d)
            } else {
                setErroCep(true)
                mostrarToast('CEP Inválido/Não encontrado.')
            }
        } catch (error) { setErroCep(true); mostrarToast('Erro na busca.') } 
        finally { setBuscandoEnd(false) }
    }
  }

  const preencherEndereco = (data: any) => {
      setLogradouro(data.logradouro); setBairro(data.bairro); setCidade(data.localidade); setCep(data.cep)
      // Foca direto no número para agilidade
      setTimeout(() => document.getElementById('input-numero')?.focus(), 100)
  }

  async function buscarAtendimentos(silencioso = false) {
    try {
      if (!silencioso) setLoading(true)
      const { data } = await supabase
        .from('atendimentos')
        .select('*, cliente:clientes(*)')
        .order('data_inicio', { ascending: false })
        .neq('status', 'concluido')
      if (data) setAtendimentos(data)
    } catch (err) { console.error(err) } finally { if (!silencioso) setLoading(false) }
  }

  async function atualizarCliente(clienteId: string, campo: string, valor: any) {
    if (!clienteId) return
    await supabase.from('clientes').update({ [campo]: valor }).eq('id', clienteId)
    mostrarToast('Salvo!')
    buscarAtendimentos(true)
  }

  async function criarAtendimento(telOpcional?: string) {
    const telefoneFinal = telOpcional || novoTelefone
    if (criandoAtendimento) return
    setCriandoAtendimento(true)
    try {
        let { data: cliente } = await supabase.from('clientes').select('*').eq('telefone', telefoneFinal).single()
        if (!cliente) {
             const { data: novo } = await supabase.from('clientes').insert([{ telefone: telefoneFinal, nome: 'Novo Cliente' }]).select().single()
             cliente = novo
        }
        if (cliente) {
             await supabase.from('atendimentos').insert([{ 
                cliente_id: cliente.id, 
                status: 'novo',
                data_inicio: new Date().toISOString() 
             }])
             setNovoTelefone('')
             buscarAtendimentos(true)
        }
    } catch (e) { console.error(e) } finally { setTimeout(() => setCriandoAtendimento(false), 1000) }
  }

  function abrirModalPerda(id: string) { setIdAtendimentoAtual(id); setMotivoPerda(''); setModalPerda(true) }

  async function confirmarPerda() {
    if (!motivoPerda) return alert('Selecione o motivo!')
    await supabase.from('atendimentos').update({ status: 'cancelado', motivo_cancelamento: motivoPerda, data_fim: new Date().toISOString() }).eq('id', idAtendimentoAtual)
    setModalPerda(false); buscarAtendimentos(true); mostrarToast('Perda registrada')
  }

  async function abrirModalPagamento(item: any) {
    setIdAtendimentoAtual(item.id)
    setEtapaModal(1); setTipoPagamento(''); setValorVenda(item.valor_total || ''); setValorTroco('')
    setErroCep(false)
    setCep(item.cliente?.cep || ''); setLogradouro(item.cliente?.logradouro || ''); setNumero(item.cliente?.numero || ''); setBairro(item.cliente?.bairro || ''); setCidade(item.cliente?.cidade || 'Juiz de Fora'); setComplemento(item.cliente?.complemento || '')
    if (!item.cliente?.logradouro && item.cliente?.endereco) setLogradouro(item.cliente.endereco) 
    
    await supabase.from('atendimentos').update({ data_fechamento: new Date().toISOString() }).eq('id', item.id)
    setModalAberto(true)
  }

  async function finalizarPagamento() {
    if (!valorVenda) return alert('Digite o valor!')
    if (!bairro) return alert('O BAIRRO é obrigatório!')
    if (!logradouro) return alert('Digite a Rua!')
    if (erroCep) return alert('CEP Inválido! Corrija antes de salvar.')

    try {
      const valorFloat = parseFloat(valorVenda.replace(',', '.'))
      let statusNovo = 'em_separacao'
      let formaPgtoTexto = tipoPagamento
      let trocoFloat = null
      let agora = new Date().toISOString()
      let camposParaAtualizar: any = {
          valor_total: valorFloat,
          data_pagamento: agora,
      }

      if (tipoPagamento === 'pix_online') { 
          statusNovo = 'aguardando_pix'; 
          formaPgtoTexto = 'Pix Online';
          camposParaAtualizar.data_aguardando_pix = agora;
      } else if (tipoPagamento === 'dinheiro') {
        formaPgtoTexto = 'Dinheiro'
        if (valorTroco) { trocoFloat = parseFloat(valorTroco.replace(',', '.')); formaPgtoTexto += ` (Troco p/ ${trocoFloat})` } 
        else { formaPgtoTexto += ' (S/ troco)' }
      } else { formaPgtoTexto = tipoPagamento === 'cartao' ? 'Cartão (Maq)' : 'Pix (Maq)' }

      camposParaAtualizar.status = statusNovo
      camposParaAtualizar.forma_pagamento = formaPgtoTexto
      camposParaAtualizar.troco_para = trocoFloat

      await supabase.from('atendimentos').update(camposParaAtualizar).eq('id', idAtendimentoAtual)
      
      const { data: at } = await supabase.from('atendimentos').select('cliente_id').eq('id', idAtendimentoAtual).single()
      if (at) {
          const compTexto = complemento ? ` - ${complemento}` : ''
          const enderecoCompletoVisual = `${logradouro}, ${numero}${compTexto} - ${bairro}`
          await supabase.from('clientes').update({ endereco: enderecoCompletoVisual, cep, logradouro, bairro, numero, cidade, complemento }).eq('id', at.cliente_id)
      }
      
      setModalAberto(false); mostrarToast('Venda Confirmada! ✅'); buscarAtendimentos(true)
    } catch (error: any) { alert('Erro: ' + error.message) }
  }

  async function avancarStatus(id: string, proximoStatus: string) {
      const updateData: any = { status: proximoStatus }
      const agora = new Date().toISOString()
      
      if (proximoStatus === 'em_negociacao') updateData.data_negociacao = agora
      if (proximoStatus === 'aguardando_motoboy') updateData.data_separacao_fim = agora
      if (proximoStatus === 'em_rota') updateData.data_saida_moto = agora
      if (proximoStatus === 'concluido') updateData.data_fim = agora
      
      await supabase.from('atendimentos').update(updateData).eq('id', id)
      buscarAtendimentos(true)
  }
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !idParaUpload) return
    const file = e.target.files[0]; setUploading(true)
    try {
      const nomeArquivo = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`
      await supabase.storage.from('comprovantes').upload(nomeArquivo, file)
      const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(nomeArquivo)
      
      await supabase.from('atendimentos').update({ 
          forma_pagamento: `Pix Online - ${publicUrl}`, 
          status: 'aguardando_pix',
          data_aguardando_pix: new Date().toISOString()
      }).eq('id', idParaUpload)
      
      mostrarToast('Comprovante Enviado!'); buscarAtendimentos(true)
    } catch (error) { alert('Erro upload') } finally { setUploading(false); setIdParaUpload(null) }
  }

  // --- REMARKETING ---
  async function abrirModalRemarketing(id: string) { setIdAtendimentoAtual(id); setRmkProduto(''); setRmkDias(30); setRmkContinuo(false); setModalRemarketing(true) }
  
  async function salvarRemarketing() {
    if (!rmkProduto) return alert('O que o cliente comprou?')
    const dataAviso = new Date(); dataAviso.setDate(dataAviso.getDate() + rmkDias)
    const { data: at } = await supabase.from('atendimentos').select('cliente_id').eq('id', idAtendimentoAtual).single()
    
    if (at) { 
        await supabase.from('lembretes').insert({ 
            cliente_id: at.cliente_id, 
            produto: rmkProduto, 
            dias_duracao: rmkDias, 
            data_aviso: dataAviso.toISOString(), 
            uso_continuo: rmkContinuo 
        }) 
    }
    await avancarStatus(idAtendimentoAtual, 'concluido')
    setModalRemarketing(false); mostrarToast('Venda Concluída e Lembrete Salvo! 🚀');
  }

  // --- ANALYTICS (Meu Dia) ---
  const calcularDesempenho = async () => {
    const hoje = new Date().toISOString().split('T')[0]
    
    // CORREÇÃO: Agora busca tanto os ativos quanto os CANCELADOS no dia
    const { data } = await supabase
        .from('atendimentos')
        .select('*, cliente:clientes(nome, telefone, created_at)')
        .or(`data_inicio.gte.${hoje},data_fim.gte.${hoje}`) 
        .order('data_inicio', { ascending: false })
    
    if (data) {
        // Filtra para mostrar na lista apenas o que realmente aconteceu hoje
        const listaDoDia = data.filter(i => {
           const inicioHoje = i.data_inicio?.startsWith(hoje);
           const fimHoje = i.data_fim?.startsWith(hoje);
           return inicioHoje || fimHoje;
        });

        const total = listaDoDia.length
        const vendas = listaDoDia.filter(i => ['em_separacao', 'aguardando_pix', 'aguardando_motoboy', 'em_rota', 'concluido'].includes(i.status)).length
        const perdas = listaDoDia.filter(i => i.status === 'cancelado').length
        
        const listaClientes = listaDoDia.map(i => ({ 
            nome: i.cliente?.nome, 
            telefone: i.cliente?.telefone, 
            status: i.status 
        }))
        
        setStatsDia({ total, vendas, perdas, novos: 0, listaClientes }); 
        setModalDesempenho(true)
    }
  }
  
  const mostrarToast = (msg: string) => { setToastMensagem(msg); setTimeout(() => setToastMensagem(''), 3000) }
  const copiarTexto = (texto: string) => { navigator.clipboard.writeText(texto); mostrarToast('Copiado!') }
  const isClienteAntigo = (dataCriacao: string) => { if (!dataCriacao) return false; return (new Date().getTime() - new Date(dataCriacao).getTime()) / (1000 * 3600 * 24) > 1 }
  async function abrirHistorico(cliente: any) {
    setClienteHistoricoNome(cliente.nome)
    const { data } = await supabase.from('atendimentos').select('*').eq('cliente_id', cliente.id).neq('status', 'novo').order('data_inicio', { ascending: false }).limit(5)
    if (data) { setHistoricoCliente(data); setModalHistorico(true) }
  }

  const scripts = [{ label: 'Saudação', texto: 'Olá! Tudo bem? Sou da Farmácia. Vi seu pedido, podemos confirmar?', icone: MessageCircle }, { label: 'Pagamento?', texto: 'Como prefere pagar? Levamos maquininha (Cartão/Pix) ou troco para Dinheiro. Se preferir, tenho Pix Online.', icone: Wallet }, { label: 'Chave Pix', texto: 'Chave Pix: CNPJ XX.XXX.XXX/0001-XX. Me envia o comprovante por favor?', icone: QrCode }, { label: 'Separando', texto: 'Pedido confirmado! Já estamos separando. Assim que o motoboy pegar, te aviso.', icone: Package }, { label: 'Saiu', texto: 'Seu pedido saiu para entrega! 🛵 Fique atento ao interfone/campainha.', icone: Bike }, { label: 'Finalizar', texto: 'Pedido entregue! Obrigado pela preferência! 🥰', icone: Star }]

  return (
    <div className="flex flex-col h-screen bg-gray-100 border-r border-gray-300 relative">
      {toastMensagem && (<div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4"><CheckCircle size={20} className="text-green-400" /> {toastMensagem}</div>)}

      {/* --- MODAIS --- */}
      {modalRemarketing && (
          <div className="absolute inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 border-4 border-teal-600">
                  <h3 className="text-2xl font-black text-teal-800 mb-4 flex items-center gap-2 uppercase tracking-wide"><Bell className="text-yellow-500"/> Pós-Venda</h3>
                  <p className="text-gray-900 mb-2 font-black text-sm uppercase">Qual produto ele comprou?</p>
                  <div className="space-y-6">
                      <input placeholder="Ex: Losartana..." value={rmkProduto} onChange={e => setRmkProduto(e.target.value)} className="w-full p-4 border-2 border-gray-900 rounded-lg font-black text-lg outline-none focus:border-teal-500 shadow-inner bg-white text-black" autoFocus />
                      <div>
                          <p className="text-xs font-black text-gray-500 uppercase mb-2">Quando acaba?</p>
                          <div className="grid grid-cols-3 gap-3">
                              {[7, 14, 21, 30, 45, 60].map(d => (
                                  <button key={d} onClick={() => setRmkDias(d)} className={`py-3 px-1 rounded-lg font-black border-2 transition transform active:scale-95 ${rmkDias === d ? 'border-teal-600 bg-teal-600 text-white shadow-lg' : 'border-gray-300 text-gray-500 bg-white hover:border-teal-300'}`}>{d} Dias</button>
                              ))}
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => setRmkContinuo(false)} className={`flex-1 p-3 rounded-lg border-2 font-black uppercase text-xs ${!rmkContinuo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-300'}`}>Só uma vez</button>
                          <button onClick={() => setRmkContinuo(true)} className={`flex-1 p-3 rounded-lg border-2 font-black uppercase text-xs ${rmkContinuo ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-400 border-gray-300'}`}>Uso Contínuo</button>
                      </div>
                      <button onClick={salvarRemarketing} className="w-full bg-green-600 text-white font-black py-4 rounded-xl hover:bg-green-700 shadow-xl uppercase tracking-widest text-lg">FINALIZAR 🚀</button>
                  </div>
              </div>
          </div>
      )}

      {modalAberto && (
      <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border-4 border-teal-600">
              <div className="bg-teal-700 p-3 flex justify-between items-center text-white font-bold">
                  <span>FORMA DE PAGAMENTO</span> 
                  <button onClick={() => setModalAberto(false)}><XCircle/></button>
              </div>
              <div className="p-4">
                  {etapaModal === 1 ? (
                      <div className="grid grid-cols-2 gap-3">
                          <button autoFocus onClick={() => { setTipoPagamento('pix_online'); setEtapaModal(2) }} className="p-4 border-2 border-teal-200 hover:border-teal-500 bg-teal-50 hover:bg-teal-100 rounded-xl flex flex-col items-center transition focus:ring-2 focus:ring-teal-500 outline-none">
                              <QrCode className="text-teal-700 mb-2" size={32}/><span className="text-sm font-black text-teal-900">Pix Online</span>
                          </button>
                          <button onClick={() => { setTipoPagamento('cartao'); setEtapaModal(2) }} className="p-4 border-2 border-blue-200 hover:border-blue-500 bg-blue-50 hover:bg-blue-100 rounded-xl flex flex-col items-center transition focus:ring-2 focus:ring-blue-500 outline-none">
                              <CreditCard className="text-blue-700 mb-2" size={32}/><span className="text-sm font-black text-blue-900">Cartão</span>
                          </button>
                          <button onClick={() => { setTipoPagamento('pix_maq'); setEtapaModal(2) }} className="p-4 border-2 border-purple-200 hover:border-purple-500 bg-purple-50 hover:bg-purple-100 rounded-xl flex flex-col items-center transition focus:ring-2 focus:ring-purple-500 outline-none">
                              <QrCode className="text-purple-700 mb-2" size={32}/><span className="text-xs font-black text-purple-900 text-center">Pix Maquininha</span>
                          </button>
                          <button onClick={() => { setTipoPagamento('dinheiro'); setEtapaModal(2) }} className="p-4 border-2 border-green-200 hover:border-green-500 bg-green-50 hover:bg-green-100 rounded-xl flex flex-col items-center transition focus:ring-2 focus:ring-green-500 outline-none">
                              <Banknote className="text-green-700 mb-2" size={32}/><span className="text-sm font-black text-green-900">Dinheiro</span>
                          </button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <div className="bg-gray-100 p-3 rounded border-2 border-gray-300 space-y-3 relative">
                              <p className="text-xs font-black uppercase text-gray-700 flex gap-2 items-center tracking-wider"><MapPin size={14}/> Entrega</p>
                              
                              <input 
                                  id="input-cep" 
                                  placeholder="CEP (Aperte Enter)" 
                                  value={cep} 
                                  onChange={e => buscarCep(e.target.value)} 
                                  onKeyDown={(e) => {e.stopPropagation(); if(e.key === 'Enter') document.getElementById('input-numero')?.focus()}} 
                                  maxLength={9} 
                                  className={`w-full p-3 border-2 ${erroCep ? 'border-red-500 bg-red-50 text-red-700 placeholder-red-300' : 'border-gray-400 bg-white text-black'} rounded-lg text-base font-black outline-none focus:border-teal-600 focus:ring-2 ring-teal-200`}
                              />
                              {erroCep && <span className="text-[10px] text-red-600 font-bold absolute right-4 top-10">Inválido!</span>}

                              <div className="flex gap-2">
                                  <div className="flex-1 relative">
                                      <input id="input-rua" value={logradouro} onChange={e => setLogradouro(e.target.value)} onKeyDown={(e) => {e.stopPropagation(); if(e.key==='Enter') document.getElementById('input-numero')?.focus()}} placeholder="Nome da Rua" className="w-full p-3 border-2 border-gray-400 rounded-lg text-base font-black text-black outline-none pr-10 focus:border-teal-600 bg-white"/>
                                      <button onClick={() => {}} disabled={buscandoEnd} className="absolute right-2 top-2 p-1.5 text-gray-500 hover:text-teal-700 hover:bg-teal-100 rounded-md">{buscandoEnd ? <span className="animate-spin">⌛</span> : <Search size={20}/>}</button>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <input id="input-numero" value={numero} onChange={e => setNumero(e.target.value)} onKeyDown={(e) => {e.stopPropagation(); if(e.key==='Enter') document.getElementById('input-complemento')?.focus()}} placeholder="Nº" className="w-24 p-3 border-2 border-teal-500 bg-white rounded-lg text-base font-black text-black outline-none focus:ring-4 ring-teal-200 text-center"/>
                                  <input id="input-complemento" value={complemento} onChange={e => setComplemento(e.target.value)} onKeyDown={(e) => {e.stopPropagation(); if(e.key==='Enter') document.getElementById('input-bairro')?.focus()}} placeholder="Compl." className="flex-1 p-3 border-2 border-gray-400 bg-white rounded-lg text-sm font-black text-black outline-none focus:border-teal-600 placeholder:text-gray-400"/>
                              </div>
                              <div className="flex gap-2">
                                  <input id="input-bairro" value={bairro} onChange={e => setBairro(e.target.value)} onKeyDown={(e) => {e.stopPropagation(); if(e.key==='Enter') document.getElementById('input-valor')?.focus()}} placeholder="Bairro" className="flex-1 p-3 border-2 border-gray-400 rounded-lg text-sm font-bold text-black outline-none focus:border-teal-600 bg-white"/>
                                  <input value={cidade} disabled className="w-24 p-3 border-2 border-gray-300 rounded-lg text-xs font-bold bg-gray-200 text-gray-600 text-center"/>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <div className="flex-1">
                                  <label className="text-xs font-black uppercase text-gray-600 mb-1 block">Total (R$)</label>
                                  <input id="input-valor" type="number" value={valorVenda} onChange={e => setValorVenda(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') tipoPagamento === 'dinheiro' ? document.getElementById('input-troco')?.focus() : finalizarPagamento() }} className="w-full text-2xl font-black border-4 border-teal-600 rounded-lg p-3 text-center outline-none text-teal-900 bg-white shadow-inner" placeholder="0,00" />
                              </div>
                              {tipoPagamento === 'dinheiro' && (<div className="flex-1"><label className="text-xs font-black uppercase text-gray-600 mb-1 block">Troco p/?</label><input id="input-troco" type="number" value={valorTroco} onChange={e => setValorTroco(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') finalizarPagamento() }} className="w-full text-2xl font-black border-4 border-yellow-400 bg-yellow-50 rounded-lg p-3 text-center outline-none text-yellow-900 shadow-inner" placeholder="0" /></div>)}
                          </div>
                          <button onClick={finalizarPagamento} className="w-full bg-teal-700 text-white font-black py-4 rounded-xl hover:bg-teal-800 shadow-xl uppercase tracking-widest text-lg transform active:scale-95 transition">CONFIRMAR ✅</button>
                          <button onClick={() => setEtapaModal(1)} className="w-full text-gray-500 text-xs py-2 hover:underline font-bold">Voltar</button>
                      </div>
                  )}
              </div>
          </div>
      </div>
      )}
      
      {modalFoto && (<div className="absolute inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 backdrop-blur" onClick={() => setModalFoto(null)}><div className="relative max-w-2xl w-full max-h-full"><button className="absolute -top-10 right-0 text-white hover:text-red-500"><XCircle size={32}/></button><img src={modalFoto} className="w-full h-auto rounded-lg shadow-2xl border-4 border-white" alt="Comprovante" /></div></div>)}
      
      {modalDesempenho && (<div className="absolute inset-0 bg-black/80 z-[70] flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]"><div className="bg-blue-800 p-4 text-white flex justify-between items-center"><h2 className="text-xl font-black flex items-center gap-2"><BarChart2/> Meu Desempenho (Hoje)</h2><button onClick={() => setModalDesempenho(false)}><XCircle/></button></div><div className="p-4 grid grid-cols-3 gap-3 bg-blue-50"><div className="bg-white p-3 rounded-lg border-b-4 border-green-500 shadow-sm text-center"><p className="text-xs font-bold text-gray-500 uppercase">Vendas</p><p className="text-3xl font-black text-green-600">{statsDia.vendas}</p></div><div className="bg-white p-3 rounded-lg border-b-4 border-red-500 shadow-sm text-center"><p className="text-xs font-bold text-gray-500 uppercase">Perdas</p><p className="text-3xl font-black text-red-600">{statsDia.perdas}</p></div><div className="bg-white p-3 rounded-lg border-b-4 border-blue-500 shadow-sm text-center"><p className="text-xs font-bold text-gray-500 uppercase">Atendidos</p><p className="text-3xl font-black text-blue-600">{statsDia.total}</p></div></div><div className="p-4 flex-1 overflow-y-auto"><h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><List size={16}/> Lista de Hoje</h3><div className="space-y-2">{statsDia.listaClientes.map((c: any, i: number) => (<div key={i} className="flex justify-between items-center p-2 border-b border-gray-100 text-sm"><div><p className="font-bold text-gray-800">{c.nome || 'Sem Nome'}</p><p className="text-xs text-gray-500">{c.telefone}</p></div><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.status === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{c.status === 'cancelado' ? 'Perdida' : 'Venda'}</span></div>))}</div></div></div></div>)}
      
      {modalPerda && (<div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95"><h3 className="text-lg font-black text-red-600 mb-2 flex items-center gap-2"><AlertOctagon/> Cliente não quis?</h3><div className="grid grid-cols-1 gap-2 mb-4">{['Preço Alto', 'Taxa de Entrega', 'Demora na Resposta', 'Falta de Medicamento', 'Parou de Responder', 'Comprou em Outra'].map(m => (<button key={m} onClick={() => setMotivoPerda(m)} className={`p-3 rounded-lg border font-bold text-left transition ${motivoPerda === m ? 'bg-red-100 border-red-500 text-red-900 ring-2 ring-red-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>{m}</button>))}</div><div className="flex gap-2"><button onClick={() => setModalPerda(false)} className="flex-1 py-3 bg-gray-200 font-bold rounded-lg hover:bg-gray-300">Voltar</button><button onClick={confirmarPerda} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg">Confirmar</button></div></div></div>)}
      
      {modalHistorico && (<div className="absolute inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95"><div className="bg-teal-700 p-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center gap-2"><History/> Ficha: {clienteHistoricoNome}</h3><button onClick={() => setModalHistorico(false)}><XCircle/></button></div><div className="p-4 overflow-y-auto flex-1 bg-gray-50">{historicoCliente.length === 0 ? <p className="text-center text-gray-400 mt-10">Nenhuma compra.</p> : <div className="space-y-3">{historicoCliente.map(h => (<div key={h.id} className={`p-3 rounded-lg border text-sm relative ${h.status === 'cancelado' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}><div className="flex justify-between font-bold text-gray-700 mb-1"><span>{new Date(h.data_inicio).toLocaleDateString()}</span><span className={h.status === 'cancelado' ? 'text-red-600' : 'text-green-600'}>{h.status === 'cancelado' ? '❌ DECLINOU' : '✅ COMPROU'}</span></div>{h.status === 'cancelado' ? <div className="bg-red-100 p-2 rounded text-red-800 font-bold text-xs mt-1">Motivo: {h.motivo_cancelamento || 'Não informado'}</div> : <div className="flex justify-between items-center text-xs text-gray-500 mt-1"><span>R$ {h.valor_total}</span><span className="bg-gray-100 px-2 py-0.5 rounded">{h.forma_pagamento?.split(' - ')[0]}</span></div>}</div>))}</div>}</div></div></div>)}

      {/* HEADER */}
      <header className="bg-teal-700 text-white p-3 flex justify-between items-center shadow-lg z-20">
        <div><h1 className="font-black text-xl tracking-tight">CRM VENDEDOR</h1></div>
        <div className="flex gap-2">
            <button onClick={calcularDesempenho} className="bg-teal-800 hover:bg-teal-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-teal-600 shadow-sm"><BarChart2 size={14}/> Meu Dia</button>
            <button onClick={() => router.push('/')} className="p-2 hover:bg-teal-800 rounded-full"><LogOut size={20}/></button>
        </div>
      </header>

      {/* BARRA DE NOVO PEDIDO */}
      <div className="p-3 bg-white border-b border-gray-300 flex gap-2 z-10">
        <input 
          type="number" 
          placeholder={criandoAtendimento ? "Criando..." : "📱 Digite Telefone e ENTER..."}
          className={`flex-1 border-2 border-gray-300 p-3 rounded text-black font-bold focus:border-teal-600 outline-none shadow-inner ${criandoAtendimento ? 'bg-gray-100 opacity-50' : ''}`}
          value={novoTelefone} 
          disabled={criandoAtendimento}
          onChange={e => setNovoTelefone(e.target.value)}
          onKeyDown={handleTelefoneEnter} 
        />
        <button onClick={() => criarAtendimento()} disabled={criandoAtendimento} className={`px-6 rounded font-bold shadow-md transition text-white ${criandoAtendimento ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}>{criandoAtendimento ? '...' : <Plus/>}</button>
      </div>

      {/* LISTA DE CARDS */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-2 pb-32">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {atendimentos.map((item) => {
            // Cores dos Cards
            let statusColor = 'bg-gray-200 text-gray-700 border-gray-400'
            if(item.status === 'novo') statusColor = 'bg-blue-100 text-blue-800 border-blue-300'
            if(item.status === 'aguardando_pix') statusColor = 'bg-yellow-100 text-yellow-800 border-yellow-400'
            if(item.status === 'pix_rejeitado') statusColor = 'bg-red-100 text-red-900 border-red-500 animate-pulse'
            if(item.status === 'em_separacao') statusColor = 'bg-purple-100 text-purple-800 border-purple-300'
            if(item.status === 'aguardando_motoboy') statusColor = 'bg-indigo-100 text-indigo-800 border-indigo-300'
            if(item.status === 'em_rota') statusColor = 'bg-orange-100 text-orange-800 border-orange-300'
            if(item.status === 'concluido') statusColor = 'bg-green-100 text-green-800 border-green-300'
            if(item.status === 'cancelado') statusColor = 'bg-red-50 text-red-800 border-red-300 opacity-70' 
            
            const mostraHistorico = isClienteAntigo(item.cliente?.created_at)
            const dataReferenciaRelogio = obterDataReferencia(item);
            const horaInicio = new Date(item.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

            return (
              <div key={item.id} className={`bg-white p-3 rounded-lg shadow-sm border-l-4 ${statusColor.split(' ')[2]} flex flex-col gap-2 relative group card-atendimento`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <User size={16} className="text-gray-400"/>
                        <input name="nome-cliente" defaultValue={item.cliente?.nome || 'Novo Cliente'} onBlur={(e) => atualizarCliente(item.cliente?.id, 'nome', e.target.value)} onKeyDown={handleNomeEnter} className="font-black text-gray-900 leading-tight w-full bg-transparent border-b border-dashed border-gray-300 hover:border-teal-500 focus:border-teal-600 focus:bg-gray-50 outline-none transition px-1"/>
                    </div>
                    <p className="text-sm font-bold text-gray-600 flex items-center gap-1">📱 {item.cliente?.telefone}</p>
                    
                    {/* VISUALIZAÇÃO DE TEMPO E INÍCIO */}
                    <div className="mt-2 flex items-center gap-2">
                         <div className="bg-gray-50 p-1 rounded inline-block border border-gray-100" title="Tempo na etapa atual">
                            <Cronometro dataReferencia={dataReferenciaRelogio} status={item.status} />
                         </div>
                         <span className="text-[10px] text-gray-400 flex items-center gap-1 font-bold" title="Hora que chamou"><Clock size={10}/> {horaInicio}</span>
                    </div>

                    {item.cliente?.endereco && (<div className="mt-2"><p className="text-[10px] text-gray-500 flex items-center gap-1 truncate"><MapPin size={10}/> {item.cliente.endereco}</p>{item.cliente.bairro && <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[9px] px-1.5 py-0.5 rounded border border-green-200 font-bold mt-1"><CheckCircle size={8}/> Endereço OK</span>}</div>)}
                  </div>
                  <div className="flex flex-col items-end gap-1"><span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${statusColor}`}>{item.status.replace('_', ' ')}</span>{mostraHistorico && <button onClick={() => abrirHistorico(item.cliente)} className="text-teal-600 hover:bg-teal-50 flex items-center gap-1 text-[10px] font-black border border-teal-200 rounded px-2 py-1 transition bg-white shadow-sm"><History size={12}/> Ficha</button>}</div>
                </div>
                
                {/* EXIBIÇÃO DO MOTIVO DE PERDA */}
                {item.status === 'cancelado' && (
                    <div className="bg-red-100 p-2 rounded text-xs font-black text-red-800 border border-red-200 mt-2">
                        ❌ Motivo: {item.motivo_cancelamento || 'Não informado'}
                    </div>
                )}

                {item.status === 'pix_rejeitado' && (<div className="bg-red-50 p-2 rounded text-xs font-black text-red-700 border border-red-200 text-center">⚠️ PIX REJEITADO PELA GERÊNCIA!<br/><span className="font-normal">Motivo: {item.observacao || 'Não informado'}</span></div>)}
                
                {item.status === 'em_rota' && item.forma_pagamento?.includes('Pix') && !item.data_aprovacao_pix && (
                    <div className="bg-orange-50 p-1 rounded text-[10px] font-black text-orange-700 border border-orange-200 text-center animate-pulse">🛵 MOTO SAIU (PIX NÃO CONFIRMADO)</div>
                )}

                {item.valor_total > 0 && item.status !== 'cancelado' && (<div className="bg-gray-50 p-2 rounded border border-gray-200 text-xs"><div className="flex justify-between font-bold text-gray-700"><span>R$ {item.valor_total}</span><span>{item.forma_pagamento?.split(' - ')[0]}</span></div>{item.forma_pagamento?.includes('http') && <button onClick={() => setModalFoto(item.forma_pagamento.split(' - ')[1])} className="w-full mt-1 bg-blue-100 text-blue-700 font-bold py-1 rounded flex items-center justify-center gap-1 hover:bg-blue-200"><Eye size={12}/> Ver Comprovante</button>}{item.troco_para > 0 && <div className="text-center text-red-600 font-black bg-red-50 mt-1 rounded">⚠️ Troco p/ {item.troco_para}</div>}</div>)}
                
                <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                   {/* BOTÕES DE AÇÃO COM SUPORTE A ENTER (name="btn-acao-principal") */}
                   
                   {item.status !== 'novo' && item.status !== 'cancelado' && <button onClick={() => abrirModalPerda(item.id)} className="col-span-2 border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 font-bold py-2 rounded text-xs flex items-center justify-center gap-1 transition opacity-70 hover:opacity-100"><XCircle size={14}/> ❌ Declinar (Perda)</button>}
                   
                   {item.status === 'novo' && <button name="btn-acao-principal" onClick={() => avancarStatus(item.id, 'em_negociacao')} className="col-span-2 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md">Iniciar Atendimento</button>}
                   
                   {item.status === 'em_negociacao' && <button name="btn-acao-principal" onClick={() => abrirModalPagamento(item)} className="col-span-2 bg-teal-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-teal-700 shadow-md animate-pulse">💲 Fechar Venda</button>}
                   
                   {(item.status === 'aguardando_pix' || item.status === 'pix_rejeitado') && (<button onClick={() => { setIdParaUpload(item.id); fileInputRef.current?.click() }} className="col-span-2 bg-yellow-100 text-yellow-800 py-2 rounded font-bold text-xs border border-yellow-300 hover:bg-yellow-200 flex items-center justify-center gap-1">{uploading ? '...' : <><Paperclip size={14}/> {item.status === 'pix_rejeitado' ? 'REENVIAR PIX' : 'Anexar Pix'}</>}</button>)}
                   
                   {/* Botão Pronto p/ Moto - Simplificado e Destravado */}
                   {item.status === 'em_separacao' && (
                       <button 
                            name="btn-acao-principal"
                            onClick={() => avancarStatus(item.id, 'aguardando_motoboy')} 
                            className="col-span-2 bg-purple-100 text-purple-900 py-3 rounded font-bold text-xs border border-purple-300 hover:bg-purple-200 active:bg-purple-300 transition"
                        >
                           🏍️ Chamar Moto
                       </button>
                    )}
                   
                   {item.status === 'aguardando_motoboy' && <button name="btn-acao-principal" onClick={() => avancarStatus(item.id, 'em_rota')} className="col-span-2 bg-indigo-100 text-indigo-900 py-2 rounded font-bold text-xs border border-indigo-300 hover:bg-indigo-200">🛵 Saiu Entrega</button>}
                   
                   {item.status === 'em_rota' && <button name="btn-acao-principal" onClick={() => abrirModalRemarketing(item.id)} className="col-span-2 bg-green-600 text-white py-2 rounded font-bold text-sm hover:bg-green-700">✅ Entregue</button>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="bg-white border-t border-gray-300 grid grid-cols-6 gap-1 p-1 z-20">{scripts.map((s, i) => (<button key={i} onClick={() => copiarTexto(s.texto)} className="flex flex-col items-center justify-center p-1 rounded hover:bg-gray-100 active:scale-90 transition group"><s.icone size={16} className="text-teal-700 mb-0.5 group-hover:scale-110 transition" /><span className="text-[9px] text-center leading-none text-gray-800 font-bold uppercase">{s.label}</span></button>))}</div>
    </div>
  )
}