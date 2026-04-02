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

import type { Parceiro, Lead, RPI, Acao, AcompanhamentoMensal, Playbook } from '../types/database'

export const localParceiros = new LocalTable<Parceiro>('parceiros')
export const localLeads = new LocalTable<Lead>('leads')
export const localRPIs = new LocalTable<RPI>('rpis')
export const localAcoes = new LocalTable<Acao>('acoes')
export const localAcompanhamento = new LocalTable<AcompanhamentoMensal>('acompanhamento_mensal')
export const localPlaybooks = new LocalTable<Playbook>('playbooks')

// Default values for new parceiros
export const PARCEIRO_DEFAULTS: Partial<Parceiro> = {
  status: 'ativo',
  taxa_produto: 0.06,
  comissao_bruta: 0.0141516,
  imposto_comissao: 0.2138,
  meta_anual_credito: 10000000,
  meta_anual_clientes: 12,
  tiquete_medio: 800000,
  meta_receita_mensal: 20000,
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
  funil_vendas_ritmo: null,
  funil_vendas_snapshot: null,
  playbooks_usados: [],
}

export const ACAO_DEFAULTS: Partial<Acao> = {
  status: 'pendente',
  prioridade: 'média',
}

import type { PlaybookStep } from '../types/database'

// Seed playbooks on first load
export const PLAYBOOK_SEEDS: Array<{ slug: string; titulo: string; categoria: string; conteudo: PlaybookStep[] }> = [
  {
    slug: 'farege',
    titulo: 'Processo de Indicação (FAREGE)',
    categoria: 'processo',
    conteudo: [
      { tipo: 'texto', titulo: 'O que é o FAREGE?', corpo: 'FAREGE é o método de indicação da LOARA: **F**iltrar, **A**bordar, **R**elacionar, **E**ntregar, **G**erir, **E**voluir. Cada etapa garante que a indicação seja qualificada e tenha alto potencial de conversão.' },
      { tipo: 'passo_a_passo', titulo: 'Como aplicar o FAREGE', passos: [
        { numero: 1, titulo: 'Filtrar', descricao: 'Identifique empresas com faturamento acima de R$ 500 mil/ano e necessidade de crédito.' },
        { numero: 2, titulo: 'Abordar', descricao: 'Faça o primeiro contato apresentando a LOARA como parceira de soluções financeiras.' },
        { numero: 3, titulo: 'Relacionar', descricao: 'Construa confiança antes de solicitar documentos. Entenda as dores do empresário.' },
        { numero: 4, titulo: 'Entregar', descricao: 'Envie a indicação completa com dados da empresa e contato do decisor.' },
        { numero: 5, titulo: 'Gerir', descricao: 'Acompanhe o status da indicação e mantenha o indicado informado.' },
        { numero: 6, titulo: 'Evoluir', descricao: 'Aprenda com cada indicação para melhorar as próximas.' },
      ]},
      { tipo: 'checklist', titulo: 'Checklist de indicação', items: ['Nome completo da empresa', 'CNPJ', 'Nome do decisor', 'Telefone de contato', 'Faturamento estimado', 'Demanda de crédito estimada'] },
    ],
  },
  {
    slug: 'varredura',
    titulo: 'Varredura e Documentação',
    categoria: 'processo',
    conteudo: [
      { tipo: 'texto', titulo: 'O que é a Varredura?', corpo: 'A Varredura é o processo de análise documental que identifica o potencial de crédito do cliente. Uma varredura bem feita acelera a aprovação e aumenta o valor liberado.' },
      { tipo: 'checklist', titulo: 'Documentos necessários', items: ['Contrato social atualizado', 'Faturamento dos últimos 12 meses', 'Balanço patrimonial', 'DRE do último exercício', 'Certidões negativas (Federal, Estadual, Municipal)', 'Relação de faturamento mensal'] },
      { tipo: 'alerta', titulo: 'Atenção', corpo: 'Nunca solicite documentos por canais inseguros. Use sempre o portal da LOARA para upload de documentos sensíveis.' },
    ],
  },
  {
    slug: 'inteligencia_credito',
    titulo: 'Inteligência de Crédito',
    categoria: 'credito',
    conteudo: [
      { tipo: 'texto', titulo: 'Inteligência de Crédito LOARA', corpo: 'Nossa equipe de inteligência analisa cada operação para encontrar as melhores condições. Entenda como funciona para orientar melhor seus indicados.' },
      { tipo: 'passo_a_passo', titulo: 'Fluxo de análise', passos: [
        { numero: 1, titulo: 'Recebimento', descricao: 'A documentação é recebida e conferida pela equipe.' },
        { numero: 2, titulo: 'Análise preliminar', descricao: 'Score de crédito e viabilidade são avaliados em até 48h.' },
        { numero: 3, titulo: 'Proposta', descricao: 'As melhores opções de crédito são apresentadas ao cliente.' },
        { numero: 4, titulo: 'Formalização', descricao: 'Documentos são assinados e a operação é concluída.' },
      ]},
    ],
  },
  {
    slug: 'assessoria_mkt',
    titulo: 'Assessoria de Marketing',
    categoria: 'marketing',
    conteudo: [
      { tipo: 'texto', titulo: 'Assessoria de Marketing', corpo: 'A LOARA oferece suporte de marketing para parceiros Prata e Ouro. Utilize os materiais disponíveis para fortalecer sua marca e atrair mais indicações.' },
      { tipo: 'checklist', titulo: 'Materiais disponíveis', items: ['Templates de posts para redes sociais', 'Apresentação institucional personalizada', 'Cases de sucesso para compartilhar', 'Material para eventos e palestras'] },
    ],
  },
  {
    slug: 'processo_vendas',
    titulo: 'Processo de Vendas',
    categoria: 'vendas',
    conteudo: [
      { tipo: 'texto', titulo: 'Processo de Vendas', corpo: 'O sucesso na indicação depende de um processo de vendas consistente. Siga o ritmo recomendado para maximizar seus resultados.' },
      { tipo: 'passo_a_passo', titulo: 'Ciclo de vendas', passos: [
        { numero: 1, titulo: 'Prospecção', descricao: 'Identifique potenciais clientes na sua rede de contatos.' },
        { numero: 2, titulo: 'Qualificação', descricao: 'Verifique se o potencial cliente tem perfil para crédito.' },
        { numero: 3, titulo: 'Apresentação', descricao: 'Apresente as soluções da LOARA de forma consultiva.' },
        { numero: 4, titulo: 'Indicação', descricao: 'Formalize a indicação com todos os dados necessários.' },
      ]},
      { tipo: 'alerta', titulo: 'Dica', corpo: 'Mantenha um ritmo constante de prospecção. O modelo 4x4x4x4 ajuda a manter a disciplina necessária.' },
    ],
  },
  {
    slug: 'prazos_sla',
    titulo: 'Prazos e SLAs',
    categoria: 'processo',
    conteudo: [
      { tipo: 'texto', titulo: 'Prazos e SLAs', corpo: 'Conheça os prazos de cada etapa para gerenciar expectativas com seus indicados.' },
      { tipo: 'passo_a_passo', titulo: 'Prazos por etapa', passos: [
        { numero: 1, titulo: 'Análise preliminar', descricao: 'Até 48 horas úteis após recebimento da documentação completa.' },
        { numero: 2, titulo: 'Proposta de crédito', descricao: 'Até 5 dias úteis após aprovação preliminar.' },
        { numero: 3, titulo: 'Formalização', descricao: 'Até 10 dias úteis após aceite da proposta.' },
        { numero: 4, titulo: 'Liberação do crédito', descricao: 'Até 5 dias úteis após formalização completa.' },
      ]},
      { tipo: 'alerta', titulo: 'Importante', corpo: 'Prazos podem variar conforme complexidade da operação. Documentação incompleta é a principal causa de atrasos.' },
    ],
  },
  {
    slug: 'comissionamento',
    titulo: 'Comissionamento e Pagamentos',
    categoria: 'processo',
    conteudo: [
      { tipo: 'texto', titulo: 'Como funciona o comissionamento', corpo: 'Sua comissão é calculada sobre o volume de crédito efetivamente liberado. Entenda a fórmula e os prazos de pagamento.' },
      { tipo: 'texto', titulo: 'Fórmula de cálculo', corpo: 'Comissão = Volume de crédito x Taxa de comissão bruta x (1 - Imposto). Exemplo: R$ 800.000 x 1,415% x (1 - 21,38%) = R$ 8.902' },
      { tipo: 'checklist', titulo: 'Para receber', items: ['Nota fiscal emitida corretamente', 'Dados bancários atualizados no sistema', 'Operação finalizada e confirmada'] },
    ],
  },
]

export function seedPlaybooks(): void {
  const existing = localPlaybooks.selectAll()
  if (existing.length > 0) return
  for (const seed of PLAYBOOK_SEEDS) {
    localPlaybooks.insert({
      slug: seed.slug,
      titulo: seed.titulo,
      descricao: null,
      conteudo: seed.conteudo,
      categoria: seed.categoria,
      ativo: true,
      ordem: PLAYBOOK_SEEDS.indexOf(seed),
    } as unknown as Partial<Playbook>)
  }
}

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)
