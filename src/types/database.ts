export type Categoria = 'Bronze' | 'Prata' | 'Ouro'
export type StatusParceiro = 'ativo' | 'inativo' | 'churned'

export type EtapaFunil = 'Lead' | 'Lead Qualificado' | 'Oportunidade' | 'Cliente' | 'Doc. Consolidada' | 'Crédito Tomado'
export type StatusLead = 'Ativo' | 'Pausado' | 'Perdido' | 'Ganho'
export type OrigemLead = 'Indicação Parceiro' | 'Prospecção Própria' | 'Carteira Existente' | 'Evento' | 'Outro'

export type TipoRPI = 'primeira' | 'regular' | 'extraordinaria'
export type StatusRPI = 'em_andamento' | 'finalizada' | 'cancelada'

export type Responsavel = 'Parceiro' | 'Gerente' | 'Ambos'
export type Prioridade = 'alta' | 'média' | 'baixa'
export type CategoriaAcao = 'indicação' | 'documentação' | 'treinamento' | 'processo' | 'relacionamento' | 'outro'
export type StatusAcao = 'pendente' | 'em_andamento' | 'concluida' | 'atrasada' | 'cancelada'

export const ETAPAS_FUNIL: EtapaFunil[] = [
  'Lead',
  'Lead Qualificado',
  'Oportunidade',
  'Cliente',
  'Doc. Consolidada',
  'Crédito Tomado',
]

export const ETAPA_NEXT: Record<EtapaFunil, EtapaFunil | null> = {
  'Lead': 'Lead Qualificado',
  'Lead Qualificado': 'Oportunidade',
  'Oportunidade': 'Cliente',
  'Cliente': 'Doc. Consolidada',
  'Doc. Consolidada': 'Crédito Tomado',
  'Crédito Tomado': null,
}

export const ETAPA_PREV: Record<EtapaFunil, EtapaFunil | null> = {
  'Lead': null,
  'Lead Qualificado': 'Lead',
  'Oportunidade': 'Lead Qualificado',
  'Cliente': 'Oportunidade',
  'Doc. Consolidada': 'Cliente',
  'Crédito Tomado': 'Doc. Consolidada',
}

export interface Parceiro {
  id: string
  nome: string
  categoria: Categoria
  regiao: string | null
  contato_nome: string | null
  contato_telefone: string | null
  contato_email: string | null
  data_onboarding: string | null
  cnpj_parceiro: string | null
  taxa_produto: number
  comissao_bruta: number
  imposto_comissao: number
  meta_anual_credito: number
  meta_anual_clientes: number
  tiquete_medio: number
  conv_lead_qualificado: number
  conv_qualificado_oportunidade: number
  conv_oportunidade_cliente: number
  conv_cliente_doc: number
  conv_doc_credito: number
  tempo_medio_fechamento: number
  meta_receita_mensal: number
  status: StatusParceiro
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  parceiro_id: string
  nome_empresa: string
  cnpj: string | null
  faturamento_anual: number | null
  demanda: number | null
  etapa: EtapaFunil
  probabilidade: number
  data_lead: string
  data_qualificado: string | null
  data_oportunidade: string | null
  data_cliente: string | null
  data_doc_consolidada: string | null
  data_credito_tomado: string | null
  valor_credito_tomado: number | null
  status: StatusLead
  motivo_perda: string | null
  origem: OrigemLead
  observacoes: string | null
  dentro_farege: boolean
  created_at: string
  updated_at: string
}

export interface RPI {
  id: string
  parceiro_id: string
  data_reuniao: string
  numero_sequencial: number
  tipo: TipoRPI
  duracao_minutos: number | null
  snapshot_credito_ytd: number | null
  snapshot_clientes_operando: number | null
  snapshot_comissao_ytd: number | null
  snapshot_pipeline_total: number | null
  snapshot_pipeline_ponderado: number | null
  snapshot_leads_total: number | null
  snapshot_conversao_geral: number | null
  bloco_posicionamento: Record<string, unknown>
  bloco_duvidas: Record<string, unknown>
  bloco_andamento: Record<string, unknown>
  bloco_indicacoes: Record<string, unknown>
  bloco_plano_acao: Record<string, unknown>
  notas_gerais: string | null
  plano_acao_texto: string | null
  hubspot_texto: string | null
  relatorio_texto: string | null
  funil_vendas_ritmo: number | null
  funil_vendas_snapshot: FunilVendasSnapshot | null
  playbooks_usados: string[]
  status: StatusRPI
  proxima_rpi_prevista: string | null
  created_at: string
  updated_at: string
}

export interface Acao {
  id: string
  rpi_id: string
  parceiro_id: string
  descricao: string
  responsavel: Responsavel
  prazo: string | null
  prioridade: Prioridade
  categoria: CategoriaAcao | null
  status: StatusAcao
  data_conclusao: string | null
  notas_conclusao: string | null
  lead_id: string | null
  created_at: string
  updated_at: string
}

export interface AcompanhamentoMensal {
  id: string
  parceiro_id: string
  ano: number
  mes: number
  credito_realizado: number
  clientes_novos_operando: number
  comissao_realizada: number
  leads_recebidos: number
  leads_qualificados: number
  oportunidades: number
  clientes: number
  docs_consolidadas: number
  creditos_tomados: number
  created_at: string
  updated_at: string
}

// Playbooks
export type PlaybookStepType = 'texto' | 'checklist' | 'passo_a_passo' | 'alerta'

export interface PlaybookStep {
  tipo: PlaybookStepType
  titulo: string
  corpo?: string
  items?: string[]
  passos?: Array<{ numero: number; titulo: string; descricao: string }>
}

export interface Playbook {
  id: string
  slug: string
  titulo: string
  descricao: string | null
  conteudo: PlaybookStep[]
  categoria: string | null
  ativo: boolean
  ordem: number
  created_at: string
  updated_at: string
}

// Funil de Vendas
export interface FunilVendasSnapshot {
  ritmo: number
  cadastros_dia: number
  prospeccoes_semana: number
  contatos_mes: number
  reunioes_semana: number
  reunioes_mes: number
  clientes_mes: number
  conversoes: Array<{ pct: number; clientes: number; credito: number }>
  credito_projetado_mes: number
  comissao_projetada_mes: number
  atinge_meta: boolean
}

// Supabase Database type helper
export interface Database {
  public: {
    Tables: {
      parceiros: { Row: Parceiro; Insert: Partial<Parceiro> & { nome: string; categoria: Categoria }; Update: Partial<Parceiro> }
      leads: { Row: Lead; Insert: Partial<Lead> & { parceiro_id: string; nome_empresa: string }; Update: Partial<Lead> }
      rpis: { Row: RPI; Insert: Partial<RPI> & { parceiro_id: string; numero_sequencial: number }; Update: Partial<RPI> }
      acoes: { Row: Acao; Insert: Partial<Acao> & { rpi_id: string; parceiro_id: string; descricao: string; responsavel: Responsavel }; Update: Partial<Acao> }
      acompanhamento_mensal: { Row: AcompanhamentoMensal; Insert: Partial<AcompanhamentoMensal> & { parceiro_id: string; ano: number; mes: number }; Update: Partial<AcompanhamentoMensal> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
