import { supabase } from './supabase'
import { Funcionario } from './types'

export async function login(usuario: string, senha: string): Promise<Funcionario | null> {
  try {
    // Buscar funcionário pelo usuário (usando nome de coluna em português)
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('usuario', usuario)
      .single()

    if (error) {
      console.error('Erro ao buscar funcionário:', error)
      return null
    }

    if (!data) {
      console.error('Funcionário não encontrado')
      return null
    }

    // Verificar senha (usando nome de coluna em português)
    // Acessa diretamente a propriedade 'senha' do objeto retornado
    const senhaDoBanco = (data as any).senha
    
    if (!senhaDoBanco || senhaDoBanco !== senha) {
      console.error('Senha incorreta')
      return null
    }

    return data as Funcionario
  } catch (error) {
    console.error('Erro no login:', error)
    return null
  }
}

export function setUserSession(funcionario: Funcionario) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('funcionario', JSON.stringify(funcionario))
  }
}

export function getUserSession(): Funcionario | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('funcionario')
    if (stored) {
      return JSON.parse(stored) as Funcionario
    }
  }
  return null
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('funcionario')
  }
}

