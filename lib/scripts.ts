import { supabase } from './supabase'
import { ScriptMsg } from './types'

export async function buscarScripts(): Promise<ScriptMsg[]> {
  try {
    const { data, error } = await supabase
      .from('scripts_msg')
      .select('*')
      .order('tipo', { ascending: true })

    if (error) throw error
    return (data || []) as ScriptMsg[]
  } catch (error) {
    console.error('Erro ao buscar scripts:', error)
    return []
  }
}

export function copiarParaAreaTransferencia(texto: string): boolean {
  if (typeof window !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(texto)
    return true
  }
  return false
}

