import { supabase } from './supabase'
import { Atendimento, StatusAtendimento } from './types'

export async function criarAtendimento(
  clienteId: string,
  vendedorId: string
): Promise<Atendimento | null> {
  try {
    const { data, error } = await supabase
      .from('atendimentos')
      .insert({
        cliente_id: clienteId,
        vendedor_id: vendedorId,
        status: 'novo',
      })
      .select(`
        *,
        cliente:clientes(*),
        vendedor:funcionarios(*)
      `)
      .single()

    if (error) throw error
    return data as Atendimento
  } catch (error) {
    console.error('Erro ao criar atendimento:', error)
    return null
  }
}

export async function atualizarStatusAtendimento(
  id: string,
  status: StatusAtendimento
): Promise<boolean> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'em_separacao') {
      updateData.aprovado_em = new Date().toISOString()
    }

    const { error } = await supabase
      .from('atendimentos')
      .update(updateData)
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    return false
  }
}

export async function buscarAtendimentos(
  vendedorId?: string,
  status?: StatusAtendimento
): Promise<Atendimento[]> {
  try {
    let query = supabase
      .from('atendimentos')
      .select(`
        *,
        cliente:clientes(*),
        vendedor:funcionarios(*)
      `)
      .order('created_at', { ascending: false })

    if (vendedorId) {
      query = query.eq('vendedor_id', vendedorId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as Atendimento[]
  } catch (error) {
    console.error('Erro ao buscar atendimentos:', error)
    return []
  }
}

export async function buscarClientePorTelefone(telefone: string) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefone', telefone)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data || null
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return null
  }
}

export async function criarCliente(nome: string, telefone: string) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert({ nome, telefone })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return null
  }
}

