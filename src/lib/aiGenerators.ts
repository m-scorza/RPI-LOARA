import Anthropic from '@anthropic-ai/sdk'
import type { Parceiro, Lead, RPI } from '../types/database'
import { generateHubSpotText, generatePlanoAcaoText, generateRelatorioText } from './generators'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true // Enable for client-side demo if key exists
})

export type DeliverableType = 'hubspot' | 'plano_acao' | 'relatorio'

interface SessionContext {
  parceiro: Parceiro
  rpiData: Partial<RPI>
  leads: Lead[]
  acoes: any[]
  discussionNotes: string
  duvidasChecklist: any // Record of duvidas checked
}

export async function generateWithAI(
  context: SessionContext,
  tipo: DeliverableType
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  
  // Fallback if no API key
  if (!apiKey) {
    console.warn('VITE_ANTHROPIC_API_KEY not found. Falling back to template generation.')
    if (tipo === 'hubspot') return generateHubSpotText(context.parceiro, context.rpiData as any, context.acoes, context.leads, context.discussionNotes)
    if (tipo === 'plano_acao') return generatePlanoAcaoText(context.parceiro, context.rpiData as any, context.acoes)
    return generateRelatorioText(context.parceiro, context.rpiData as any, context.leads, context.acoes)
  }

  const prompt = `
    Você é um consultor estratégico Sênior da LOARA (assessoria financeira empresarial).
    Sua tarefa é gerar um ${tipo === 'hubspot' ? 'resumo para o CRM HubSpot' : tipo === 'plano_acao' ? 'plano de ação executivo' : 'relatório de status de RPI'}.
    
    PARCEIRO: ${context.parceiro.nome} (Categoria: ${context.parceiro.categoria})
    DRE GERAL: ${context.discussionNotes}
    INDICAÇÕES NESSA SESSÃO: ${context.leads.map(l => l.nome_empresa).join(', ')}
    AÇÕES DEFINIDAS: ${context.acoes.map(a => a.descricao).join('; ')}
    
    DIRETRIZES:
    - Linguagem: Português Brasileiro formal e consultivo.
    - Tom: Profissional, focado em resultados e expansão.
    ${tipo === 'hubspot' ? '- Formato: Texto sem markdown, use emojis como bullet points, aprox. 300-500 palavras.' : ''}
    ${tipo === 'plano_acao' ? '- Formato: Markdown estruturado com objetivos claros e prazos.' : ''}
    ${tipo === 'relatorio' ? '- Formato: Sumário executivo destacando progresso e conformidade.' : ''}
  `

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    return message.content[0].type === 'text' ? message.content[0].text : ''
  } catch (error) {
    console.error('Error generating with AI:', error)
    // Fallback on error
    if (tipo === 'hubspot') return generateHubSpotText(context.parceiro, context.rpiData as any, context.acoes, context.leads, context.discussionNotes)
    if (tipo === 'plano_acao') return generatePlanoAcaoText(context.parceiro, context.rpiData as any, context.acoes)
    return generateRelatorioText(context.parceiro, context.rpiData as any, context.leads, context.acoes)
  }
}
