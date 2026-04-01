import type { Parceiro, Acao, Lead } from '../types/database'
import { formatCurrency, formatDate, GERENTE_NOME } from './format'
import { calculateRevenueProjection } from './revenueEngine'
import { ETAPAS_FUNIL } from '../types/database'

interface RPIData {
  numero_sequencial: number
  data_reuniao: string
  notas_gerais?: string | null
  proxima_rpi_prevista?: string | null
}

export function generateHubSpotText(
  parceiro: Parceiro,
  rpi: RPIData,
  acoes: Array<Partial<Acao>>,
  leads: Lead[],
  discussionNotes?: string,
): string {
  const proj = calculateRevenueProjection(parceiro)
  const activeLeads = leads.filter((l) => l.status === 'Ativo')
  const ponderado = activeLeads.reduce((s, l) => s + (l.demanda || 0) * l.probabilidade, 0)

  const lines: string[] = []
  lines.push(`RPI #${rpi.numero_sequencial} — ${parceiro.nome} — ${formatDate(rpi.data_reuniao)}`)
  lines.push(`Gerente: ${GERENTE_NOME}`)
  lines.push('')

  // Revenue-centric narrative
  lines.push('META DE RECEITA')
  lines.push(`Meta: ${formatCurrency(proj.metaReceitaMensal)}/mês (${formatCurrency(proj.metaReceitaAnual)}/ano)`)
  lines.push(`Para atingir: ${proj.clientesNecessariosMensal} clientes/mês, ${proj.leadsNecessariosMensal} leads/mês`)
  lines.push('')

  lines.push('PIPELINE')
  lines.push(`${activeLeads.length} leads ativos, ${formatCurrency(ponderado)} ponderado`)
  lines.push('')

  if (discussionNotes) {
    lines.push('ANDAMENTO')
    lines.push(`${discussionNotes}`)
    lines.push('')
  }

  if (acoes.length > 0) {
    lines.push('PLANO DE AÇÃO')
    acoes.forEach((a, i) => {
      lines.push(`${i + 1}. ${a.descricao} — Resp: ${a.responsavel}${a.prazo ? ` — Prazo: ${formatDate(a.prazo)}` : ''}`)
    })
    lines.push('')
  }

  if (rpi.proxima_rpi_prevista) {
    lines.push(`Próxima RPI: ${formatDate(rpi.proxima_rpi_prevista)}`)
  }

  return lines.join('\n')
}

export function generatePlanoAcaoText(
  parceiro: Parceiro,
  rpi: RPIData,
  acoes: Array<Partial<Acao>>,
): string {
  const proj = calculateRevenueProjection(parceiro)
  const lines: string[] = []

  lines.push('LOARA — Plano de Ação')
  lines.push(`Parceiro: ${parceiro.nome} (${parceiro.categoria})`)
  lines.push(`RPI #${rpi.numero_sequencial} — ${formatDate(rpi.data_reuniao)}`)
  lines.push(`Gerente: ${GERENTE_NOME}`)
  lines.push('')

  // Revenue context
  lines.push('CONTEXTO')
  lines.push(
    `Sua meta é gerar ${formatCurrency(proj.metaReceitaMensal)}/mês em receita. ` +
    `Para isso, precisa indicar ${proj.leadsNecessariosMensal} leads/mês e ` +
    `fechar ${proj.clientesNecessariosMensal} clientes/mês.`
  )
  lines.push('')

  lines.push('AÇÕES DEFINIDAS')
  lines.push('')

  if (acoes.length === 0) {
    lines.push('Nenhuma ação definida.')
  } else {
    acoes.forEach((a) => {
      const prioLabel = a.prioridade ? `[${a.prioridade.charAt(0).toUpperCase() + a.prioridade.slice(1)}]` : ''
      lines.push(`• ${prioLabel} ${a.descricao}`)
      lines.push(`  Responsável: ${a.responsavel}`)
      if (a.prazo) lines.push(`  Prazo: ${formatDate(a.prazo)}`)
      if (a.categoria) lines.push(`  Categoria: ${a.categoria}`)
      lines.push('')
    })
  }

  if (rpi.proxima_rpi_prevista) {
    lines.push(`Próxima RPI: ${formatDate(rpi.proxima_rpi_prevista)}`)
  }

  return lines.join('\n')
}

export function generateRelatorioText(
  parceiro: Parceiro,
  rpi: RPIData,
  leads: Lead[],
  acoes: Array<Partial<Acao>>,
): string {
  const proj = calculateRevenueProjection(parceiro)
  const activeLeads = leads.filter((l) => l.status === 'Ativo')
  const totalPipeline = activeLeads.reduce((s, l) => s + (l.demanda || 0), 0)
  const ponderado = activeLeads.reduce((s, l) => s + (l.demanda || 0) * l.probabilidade, 0)

  const lines: string[] = []

  lines.push(`RELATÓRIO DE STATUS — ${parceiro.nome}`)
  lines.push(`RPI #${rpi.numero_sequencial} — ${formatDate(rpi.data_reuniao)}`)
  lines.push(`Categoria: ${parceiro.categoria} | Região: ${parceiro.regiao || 'N/A'}`)
  lines.push('')

  // Revenue narrative
  lines.push('SUA META')
  lines.push(
    `Você quer gerar ${formatCurrency(proj.metaReceitaMensal)}/mês ` +
    `(${formatCurrency(proj.metaReceitaAnual)}/ano) em receita.`
  )
  lines.push('')
  lines.push(
    `Com comissão líquida de ${(proj.comissaoLiquida * 100).toFixed(4)}% e ` +
    `tíquete médio de ${formatCurrency(parceiro.tiquete_medio)}, você precisa:`
  )
  lines.push(`  • ${formatCurrency(proj.creditoNecessarioMensal)}/mês em crédito`)
  lines.push(`  • ${proj.clientesNecessariosMensal} clientes novos/mês (${proj.clientesNecessariosAnual}/ano)`)
  lines.push(`  • ${proj.leadsNecessariosMensal} leads indicados/mês`)
  lines.push('')

  lines.push('PIPELINE ATUAL')
  ETAPAS_FUNIL.forEach((etapa) => {
    const count = activeLeads.filter((l) => l.etapa === etapa).length
    const valor = activeLeads.filter((l) => l.etapa === etapa).reduce((s, l) => s + (l.demanda || 0), 0)
    if (count > 0) {
      lines.push(`  ${etapa}: ${count} leads — ${formatCurrency(valor)}`)
    }
  })
  lines.push(`  Total: ${activeLeads.length} leads ativos — ${formatCurrency(totalPipeline)} total — ${formatCurrency(ponderado)} ponderado`)
  lines.push('')

  if (acoes.length > 0) {
    lines.push('AÇÕES')
    acoes.forEach((a, i) => {
      lines.push(`  ${i + 1}. ${a.descricao} (${a.responsavel})`)
    })
    lines.push('')
  }

  if (rpi.notas_gerais) {
    lines.push('NOTAS')
    lines.push(`  ${rpi.notas_gerais}`)
    lines.push('')
  }

  if (rpi.proxima_rpi_prevista) {
    lines.push(`Próxima RPI: ${formatDate(rpi.proxima_rpi_prevista)}`)
  }

  return lines.join('\n')
}
