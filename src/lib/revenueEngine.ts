import type { Parceiro } from '../types/database'
import { formatCurrency } from './format'

/**
 * Revenue engine: works backwards from partner's monthly income goal
 * to determine required credit volume, clients, and leads.
 *
 * Flow: Revenue Goal → Commission needed → Credit volume → Clients → Leads
 */

export interface RevenueProjection {
  // Goal
  metaReceitaMensal: number
  metaReceitaAnual: number

  // Commission math
  comissaoLiquida: number      // comissao_bruta * (1 - imposto_comissao)
  creditoNecessarioAnual: number
  creditoNecessarioMensal: number

  // Client math
  clientesNecessariosAnual: number
  clientesNecessariosMensal: number

  // Funnel math (monthly leads needed at each stage)
  leadsNecessariosMensal: number
  leadsQualificadosMensal: number
  oportunidadesMensal: number

  // Conversion pipeline
  conversaoGeralLeadCliente: number
}

export function calculateRevenueProjection(parceiro: Parceiro): RevenueProjection {
  const metaReceitaMensal = parceiro.meta_receita_mensal || 20000
  const metaReceitaAnual = metaReceitaMensal * 12

  // Net commission per R$ of credit
  const comissaoLiquida = parceiro.comissao_bruta * (1 - parceiro.imposto_comissao)

  // How much credit do we need to generate this revenue?
  const creditoNecessarioAnual = comissaoLiquida > 0 ? metaReceitaAnual / comissaoLiquida : 0
  const creditoNecessarioMensal = creditoNecessarioAnual / 12

  // How many clients does that require?
  const tiqueteMedio = parceiro.tiquete_medio || 800000
  const clientesNecessariosAnual = tiqueteMedio > 0 ? Math.ceil(creditoNecessarioAnual / tiqueteMedio) : 0
  const clientesNecessariosMensal = Math.ceil(clientesNecessariosAnual / 12)

  // Funnel conversions (backward from clients to leads)
  const convLeadQualificado = parceiro.conv_lead_qualificado || 0.60
  const convQualificadoOportunidade = parceiro.conv_qualificado_oportunidade || 0.50
  const convOportunidadeCliente = parceiro.conv_oportunidade_cliente || 0.65
  const convClienteDoc = parceiro.conv_cliente_doc || 0.80
  const convDocCredito = parceiro.conv_doc_credito || 0.85

  // Overall conversion: lead → credit taken
  const conversaoGeralLeadCliente =
    convLeadQualificado *
    convQualificadoOportunidade *
    convOportunidadeCliente *
    convClienteDoc *
    convDocCredito

  // Monthly leads needed (working backwards from monthly clients needed through full funnel)
  const leadsNecessariosMensal = conversaoGeralLeadCliente > 0
    ? Math.ceil(clientesNecessariosMensal / conversaoGeralLeadCliente)
    : 0

  const leadsQualificadosMensal = Math.ceil(leadsNecessariosMensal * convLeadQualificado)
  const oportunidadesMensal = Math.ceil(leadsQualificadosMensal * convQualificadoOportunidade)

  return {
    metaReceitaMensal,
    metaReceitaAnual,
    comissaoLiquida,
    creditoNecessarioAnual,
    creditoNecessarioMensal,
    clientesNecessariosAnual,
    clientesNecessariosMensal,
    leadsNecessariosMensal,
    leadsQualificadosMensal,
    oportunidadesMensal,
    conversaoGeralLeadCliente,
  }
}

/**
 * Generate a narrative text explaining the revenue path.
 * Used in deliverables and the RPI conductor.
 */
export function generateRevenueNarrative(
  parceiro: Parceiro,
  projection: RevenueProjection,
  actual?: { leadsNoMes?: number; clientesNoMes?: number; creditoNoMes?: number },
): string {
  const lines: string[] = []

  lines.push(
    `Sua meta é gerar ${formatCurrency(projection.metaReceitaMensal)}/mês em receita ` +
    `(${formatCurrency(projection.metaReceitaAnual)}/ano).`
  )
  lines.push('')
  lines.push(
    `Com a comissão líquida de ${(projection.comissaoLiquida * 100).toFixed(4)}% sobre o crédito, ` +
    `você precisa movimentar ${formatCurrency(projection.creditoNecessarioMensal)}/mês em crédito.`
  )
  lines.push('')
  lines.push(
    `Com tíquete médio de ${formatCurrency(parceiro.tiquete_medio)}, isso significa ` +
    `${projection.clientesNecessariosMensal} cliente(s) novo(s) por mês ` +
    `(${projection.clientesNecessariosAnual} por ano).`
  )
  lines.push('')
  lines.push(
    `Considerando suas taxas de conversão do funil (${(projection.conversaoGeralLeadCliente * 100).toFixed(1)}% de Lead até Crédito Tomado), ` +
    `você precisa indicar pelo menos ${projection.leadsNecessariosMensal} lead(s) por mês.`
  )

  if (actual) {
    lines.push('')
    lines.push('--- Realizado neste período ---')
    if (actual.leadsNoMes !== undefined) {
      const diff = actual.leadsNoMes - projection.leadsNecessariosMensal
      if (diff >= 0) {
        lines.push(`Leads indicados: ${actual.leadsNoMes} (meta: ${projection.leadsNecessariosMensal}) — Acima da meta!`)
      } else {
        lines.push(`Leads indicados: ${actual.leadsNoMes} (meta: ${projection.leadsNecessariosMensal}) — Faltam ${Math.abs(diff)} leads.`)
      }
    }
    if (actual.clientesNoMes !== undefined) {
      lines.push(`Clientes novos: ${actual.clientesNoMes} (meta mensal: ${projection.clientesNecessariosMensal})`)
    }
    if (actual.creditoNoMes !== undefined) {
      lines.push(`Crédito movimentado: ${formatCurrency(actual.creditoNoMes)} (meta mensal: ${formatCurrency(projection.creditoNecessarioMensal)})`)
    }
  }

  return lines.join('\n')
}
