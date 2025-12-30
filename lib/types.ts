export type StatusAtendimento = 
  | 'novo'
  | 'em_negociacao'
  | 'aguardando_pix'
  | 'em_separacao'
  | 'aguardando_motoboy'
  | 'em_rota'
  | 'concluido'

export interface Funcionario {
  id: string
  nome: string
  usuario: string
  senha: string
  tipo: 'vendedor' | 'dona' | 'gerente'
  created_at: string
}

export interface Cliente {
  id: string
  nome: string
  telefone: string
  created_at: string
}

export interface Atendimento {
  id: string
  cliente_id: string
  vendedor_id: string
  status: StatusAtendimento
  valor?: number
  observacoes?: string
  aprovado_em?: string
  created_at: string
  updated_at: string
  cliente?: Cliente
  vendedor?: Funcionario
}

export interface ScriptMsg {
  id: string
  tipo: string
  texto: string
  created_at: string
}

