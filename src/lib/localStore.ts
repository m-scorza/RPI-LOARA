// localStorage-based data store that works without Supabase.
// Used automatically when VITE_SUPABASE_URL is not configured.

function uuid(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

class LocalTable<T extends { id: string }> {
  private key: string
  constructor(key: string) {
    this.key = key
  }

  private read(): T[] {
    try {
      const raw = localStorage.getItem(`rpi_${this.key}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private write(data: T[]): void {
    localStorage.setItem(`rpi_${this.key}`, JSON.stringify(data))
  }

  selectAll(): T[] {
    return this.read()
  }

  selectWhere(filters: Partial<T>): T[] {
    return this.read().filter((row) =>
      Object.entries(filters).every(([k, v]) => (row as Record<string, unknown>)[k] === v)
    )
  }

  selectById(id: string): T | null {
    return this.read().find((r) => r.id === id) || null
  }

  insert(data: Partial<T>): T {
    const rows = this.read()
    const newRow = {
      id: uuid(),
      created_at: now(),
      updated_at: now(),
      ...data,
    } as unknown as T
    rows.push(newRow)
    this.write(rows)
    return newRow
  }

  update(id: string, data: Partial<T>): T | null {
    const rows = this.read()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) return null
    rows[idx] = { ...rows[idx], ...data, updated_at: now() }
    this.write(rows)
    return rows[idx]
  }

  delete(id: string): boolean {
    const rows = this.read()
    const filtered = rows.filter((r) => r.id !== id)
    if (filtered.length === rows.length) return false
    this.write(filtered)
    return true
  }
}

import type { Parceiro, Lead, RPI, Acao, AcompanhamentoMensal } from '../types/database'

export const localParceiros = new LocalTable<Parceiro>('parceiros')
export const localLeads = new LocalTable<Lead>('leads')
export const localRPIs = new LocalTable<RPI>('rpis')
export const localAcoes = new LocalTable<Acao>('acoes')
export const localAcompanhamento = new LocalTable<AcompanhamentoMensal>('acompanhamento_mensal')

// Default values for new parceiros
export const PARCEIRO_DEFAULTS: Partial<Parceiro> = {
  status: 'ativo',
  taxa_produto: 0.06,
  comissao_bruta: 0.0141516,
  imposto_comissao: 0.2138,
  meta_anual_credito: 10000000,
  meta_anual_clientes: 12,
  tiquete_medio: 800000,
  conv_lead_qualificado: 0.60,
  conv_qualificado_oportunidade: 0.50,
  conv_oportunidade_cliente: 0.65,
  conv_cliente_doc: 0.80,
  conv_doc_credito: 0.85,
  tempo_medio_fechamento: 120,
}

export const LEAD_DEFAULTS: Partial<Lead> = {
  etapa: 'Lead',
  probabilidade: 0.10,
  status: 'Ativo',
  origem: 'Indicação Parceiro',
  data_lead: today(),
}

export const RPI_DEFAULTS: Partial<RPI> = {
  status: 'em_andamento',
  bloco_posicionamento: {},
  bloco_duvidas: {},
  bloco_andamento: {},
  bloco_indicacoes: {},
  bloco_plano_acao: {},
}

export const ACAO_DEFAULTS: Partial<Acao> = {
  status: 'pendente',
  prioridade: 'média',
}

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)
