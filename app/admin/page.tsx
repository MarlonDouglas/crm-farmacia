'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts'
import { 
  TrendingUp, Users, AlertTriangle, Clock, Calendar, 
  DollarSign, MapPin, Bike, Package, ArrowLeft 
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cores para os gráficos
const COLORS = ['#0d9488', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']

export default function DashboardProprietario() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [filtroData, setFiltroData] = useState('hoje') // hoje, 7dias, 30dias
  const [metrics, setMetrics] = useState<any>({
    faturamento: 0,
    ticketMedio: 0,
    conversao: 0,
    totalAtendimentos: 0,
    tempoMedioNegociacao: 0,
    tempoMedioEntrega: 0,
    motivosPerda: [],
    vendasPorHora: [],
    topBairros: [],
    performanceVendedores: [],
    funilVendas: []
  })

  useEffect(() => {
    carregarDados()
  }, [filtroData])

  async function carregarDados() {
    setLoading(true)
    
    // 1. Definir Data de Início
    const agora = new Date()
    let dataInicio = new Date()
    
    if (filtroData === 'hoje') dataInicio.setHours(0,0,0,0)
    if (filtroData === '7dias') dataInicio.setDate(agora.getDate() - 7)
    if (filtroData === '30dias') dataInicio.setDate(agora.getDate() - 30)

    // 2. Buscar Dados Brutos
    const { data: atendimentos } = await supabase
      .from('atendimentos')
      .select('*, cliente:clientes(*)')
      .gte('data_inicio', dataInicio.toISOString())
      
    if (!atendimentos) { setLoading(false); return }

    processarMetricas(atendimentos)
    setLoading(false)
  }

  function processarMetricas(data: any[]) {
    // A. KPIs Principais
    const concluidos = data.filter(i => ['concluido', 'em_rota', 'entregue'].includes(i.status))
    const cancelados = data.filter(i => i.status === 'cancelado')
    const total = data.length
    const faturamento = concluidos.reduce((acc, curr) => acc + (curr.valor_total || 0), 0)
    const ticketMedio = concluidos.length ? faturamento / concluidos.length : 0
    const conversao = total ? ((concluidos.length / total) * 100).toFixed(1) : 0

    // B. Motivos de Perda
    const perdasMap = cancelados.reduce((acc: any, curr: any) => {
      const motivo = curr.motivo_cancelamento || 'Não Informado'
      acc[motivo] = (acc[motivo] || 0) + 1
      return acc
    }, {})
    const chartPerdas = Object.keys(perdasMap).map(k => ({ name: k, value: perdasMap[k] }))

    // C. Horários de Pico (Mapa de Calor)
    const horasMap = Array(24).fill(0)
    data.forEach(item => {
      const hora = new Date(item.data_inicio).getHours()
      horasMap[hora]++
    })
    const chartHoras = horasMap.map((qtd, i) => ({ hora: `${i}h`, atendimentos: qtd }))

    // D. Top Bairros
    const bairrosMap = concluidos.reduce((acc: any, curr: any) => {
      const bairro = curr.cliente?.bairro || 'Desconhecido'
      acc[bairro] = (acc[bairro] || 0) + 1
      return acc
    }, {})
    const chartBairros = Object.entries(bairrosMap)
      .sort(([,a]:any, [,b]:any) => b - a)
      .slice(0, 5)
      .map(([k, v]) => ({ name: k, vendas: v }))

    // E. Tempos Médios (Gargalos)
    // Calc: (Negociação = Pagamento - Inicio) | (Entrega = Fim - Saida Moto)
    let somaNegociacao = 0, contaNegociacao = 0
    let somaEntrega = 0, contaEntrega = 0
    
    concluidos.forEach(item => {
      if(item.data_inicio && item.data_pagamento) {
        const diff = (new Date(item.data_pagamento).getTime() - new Date(item.data_inicio).getTime()) / 60000
        if(diff > 0 && diff < 120) { somaNegociacao += diff; contaNegociacao++ } // Filtra erros > 2h
      }
      if(item.data_saida_moto && item.data_fim) {
        const diff = (new Date(item.data_fim).getTime() - new Date(item.data_saida_moto).getTime()) / 60000
        if(diff > 0 && diff < 120) { somaEntrega += diff; contaEntrega++ }
      }
    })

    setMetrics({
      faturamento,
      ticketMedio,
      conversao,
      totalAtendimentos: total,
      tempoMedioNegociacao: contaNegociacao ? (somaNegociacao / contaNegociacao).toFixed(0) : 0,
      tempoMedioEntrega: contaEntrega ? (somaEntrega / contaEntrega).toFixed(0) : 0,
      motivosPerda: chartPerdas,
      vendasPorHora: chartHoras,
      topBairros: chartBairros,
    })
  }

  // --- COMPONENTES VISUAIS ---
  
  const CardKpi = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-black text-gray-800">{value}</h3>
        {sub && <p className={`text-xs font-bold mt-1 ${color}`}>{sub}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')} ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <button onClick={() => router.push('/vendedor')} className="flex items-center gap-2 text-gray-500 hover:text-teal-700 font-bold mb-2">
            <ArrowLeft size={16}/> Voltar para Vendas
          </button>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard Executivo</h1>
          <p className="text-gray-500">Inteligência de Mercado e Performance Operacional</p>
        </div>
        
        <div className="bg-white p-1 rounded-lg border border-gray-300 flex">
          {['hoje', '7dias', '30dias'].map(periodo => (
            <button
              key={periodo}
              onClick={() => setFiltroData(periodo)}
              className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition ${
                filtroData === periodo ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {periodo === 'hoje' ? 'Hoje' : periodo === '7dias' ? '7 Dias' : '30 Dias'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center text-teal-600 font-bold animate-pulse">Carregando Inteligência...</div>
      ) : (
        <div className="space-y-6">
          
          {/* 1. KPIs GERAIS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardKpi 
              title="Faturamento" 
              value={`R$ ${metrics.faturamento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} 
              sub={`${metrics.totalAtendimentos} atendimentos iniciados`}
              icon={DollarSign} 
              color="text-green-600" 
            />
            <CardKpi 
              title="Taxa de Conversão" 
              value={`${metrics.conversao}%`} 
              sub="Eficiência de Venda"
              icon={TrendingUp} 
              color="text-blue-600" 
            />
            <CardKpi 
              title="Ticket Médio" 
              value={`R$ ${metrics.ticketMedio.toFixed(2)}`} 
              sub="Por cliente"
              icon={Users} 
              color="text-purple-600" 
            />
            <CardKpi 
              title="Perdas (Churn)" 
              value={metrics.totalAtendimentos ? (metrics.totalAtendimentos - (metrics.faturamento / metrics.ticketMedio || 0)).toFixed(0) : 0} 
              sub="Vendas não realizadas"
              icon={AlertTriangle} 
              color="text-red-600" 
            />
          </div>

          {/* 2. GARGALOS DE TEMPO (Onde estamos lentos?) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-black text-gray-800 text-lg mb-4 flex items-center gap-2"><Clock size={20} className="text-orange-500"/> Gargalos Operacionais (Médias)</h3>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                            <span>Tempo de Negociação (Atendente)</span>
                            <span className={metrics.tempoMedioNegociacao > 10 ? 'text-red-500' : 'text-green-600'}>{metrics.tempoMedioNegociacao} min</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div className={`h-3 rounded-full ${metrics.tempoMedioNegociacao > 10 ? 'bg-red-500' : 'bg-teal-500'}`} style={{ width: `${Math.min(metrics.tempoMedioNegociacao * 5, 100)}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Meta ideal: &lt; 5 min</p>
                    </div>

                    <div>
                        <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                            <span>Tempo de Entrega (Motoboy)</span>
                            <span className={metrics.tempoMedioEntrega > 40 ? 'text-red-500' : 'text-blue-600'}>{metrics.tempoMedioEntrega} min</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div className={`h-3 rounded-full ${metrics.tempoMedioEntrega > 40 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(metrics.tempoMedioEntrega * 2, 100)}%` }}></div>
                        </div>
                         <p className="text-xs text-gray-400 mt-1">Tempo desde a saída até a conclusão</p>
                    </div>
                </div>
             </div>

             {/* 3. MOTIVOS DE PERDA (Por que perdemos?) */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-black text-gray-800 text-lg mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-red-500"/> Motivos de Perda</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={metrics.motivosPerda} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {metrics.motivosPerda.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
             </div>
          </div>

          {/* 4. MAPA DE CALOR E DEMOGRAFIA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Horários de Pico */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="font-black text-gray-800 text-lg mb-4 flex items-center gap-2"><Calendar size={20} className="text-teal-600"/> Horários de Pico (Volume de Atendimentos)</h3>
                  <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={metrics.vendasPorHora}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="hora" tick={{fontSize: 12}} />
                              <YAxis allowDecimals={false} />
                              <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                              <Area type="monotone" dataKey="atendimentos" stroke="#0d9488" fill="#ccfbf1" strokeWidth={3} />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Top Bairros */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="font-black text-gray-800 text-lg mb-4 flex items-center gap-2"><MapPin size={20} className="text-purple-600"/> Onde vendemos mais?</h3>
                  <div className="space-y-4">
                      {metrics.topBairros.map((b: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                  <span className="font-black text-gray-400 text-lg">#{i+1}</span>
                                  <span className="font-bold text-gray-700 text-sm uppercase">{b.name}</span>
                              </div>
                              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">{b.vendas} vendas</span>
                          </div>
                      ))}
                      {metrics.topBairros.length === 0 && <p className="text-gray-400 text-sm text-center py-10">Sem dados geográficos ainda.</p>}
                  </div>
              </div>
          </div>

        </div>
      )}
    </div>
  )
}