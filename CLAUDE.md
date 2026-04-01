# CLAUDE.md v2 — Condutor de RPI (Reunião de Planejamento Individual)

> **IMPORTANTE:** Este documento substitui o CLAUDE.md v1. Leia a seção "BUGS E CORREÇÕES URGENTES" antes de qualquer novo desenvolvimento.

---

## Visão Geral

Webapp standalone para conduzir RPIs (Reuniões de Planejamento Individual) com parceiros de negócios da LOARA. O sistema guia o gerente de parcerias durante a reunião ao vivo, mantém histórico completo, retroalimenta o modelo de funil com dados reais e gera entregáveis formatados (plano de ação, relatório de status, texto para HubSpot).

- **Usuário:** Um único gerente de parcerias, sem auth complexo. PIN de 4 dígitos.
- **Escala:** ~40 parceiros Prata/Ouro, ~18 RPIs/mês.
- **Filosofia:** Condutor de reunião, não formulário. Fluido o suficiente para usar com tela compartilhada com o parceiro.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilização | Tailwind CSS 3 |
| Gráficos | Recharts |
| Backend/DB | Supabase (PostgreSQL) |
| Ícones | Lucide React |
| Datas | date-fns (pt-BR) |
| State | Zustand |
| Toasts | Sonner |
| Exportação | Clipboard API (texto), jsPDF (futuro) |
| Deploy | GitHub Pages (HashRouter) |

---

## BUGS E CORREÇÕES URGENTES

Antes de implementar qualquer feature nova, corrigir estes problemas encontrados no código atual:

### Bug 1: `meta_receita_mensal` não existe no schema

**Problema:** O tipo `Parceiro` em `src/types/database.ts` tem o campo `meta_receita_mensal` e o `revenueEngine.ts` usa `parceiro.meta_receita_mensal || 20000` como ponto de partida de todo o cálculo. Porém, esse campo **não existe** na tabela `parceiros` do `supabase/schema.sql`. Quando o Supabase for conectado, o campo vai retornar `undefined` e o engine vai cair silenciosamente no fallback de R$ 20.000.

**Correção:** Adicionar o campo ao schema SQL:

```sql
ALTER TABLE parceiros ADD COLUMN meta_receita_mensal DECIMAL(15,2) DEFAULT 20000;
```

E atualizar o schema.sql original para incluí-lo na criação da tabela.

### Bug 2: Views do Supabase criadas mas não consumidas

**Problema:** O schema cria `vw_parceiro_ytd`, `vw_pipeline_parceiro` e `vw_proximas_rpis`, mas nenhum hook as utiliza. A página Agenda recalcula urgência manualmente, duplicando lógica.

**Correção:** Criar hooks ou funções utilitárias que consomem essas views:

```typescript
// Em useLeads.ts ou novo hook useViews.ts
const fetchPipelineSummary = async (parceiroId: string) => {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('vw_pipeline_parceiro')
      .select('*')
      .eq('parceiro_id', parceiroId)
      .single()
    return data
  }
  // fallback: calcular localmente a partir dos leads
}
```

Atualizar a Agenda para usar `vw_proximas_rpis` quando Supabase está configurado.

### Bug 3: View `vw_conversao_funil` ausente

**Problema:** O CLAUDE.md v1 especificava essa view mas ela não foi criada no schema.sql. Sem ela, o Motor de Retroalimentação não tem como calcular conversão real.

**Correção:** Adicionar ao schema.sql (SQL completo na seção de modelo de dados).

### Bug 4: Condutor não entra em modo focus

**Problema:** O CondutorRPI renderiza dentro do `<Layout />` com sidebar visível. Quando o gerente projeta a tela pro parceiro, a sidebar de navegação fica aparecendo.

**Correção:** O CondutorRPI deve renderizar **fora** do Layout. Mover a rota para fora do `<Route element={<Layout />}>`.

### Bug 5: Entregáveis exibidos como texto cru

**Problema:** O modal de entregáveis mostra o conteúdo numa `<pre>` com `font-mono`. Parece terminal, não documento profissional.

**Correção:** Criar componentes de renderização formatados para cada entregável. O texto do HubSpot pode ficar em `<pre>` (é para copiar/colar), mas o Plano de Ação e o Relatório devem ter formatação visual.

---

## FEATURES NOVAS — v2

### Feature 1: Atualização do Checklist de Dúvidas (Bloco 2)

Substituir o `DUVIDAS_CHECKLIST` atual por:

```typescript
const DUVIDAS_CHECKLIST = [
  { id: 'indicacao', label: 'Processo de indicação (FAREGE)', playbook: 'farege' },
  { id: 'varredura', label: 'Varredura e documentação', playbook: 'varredura' },
  { id: 'inteligencia_credito', label: 'Inteligência de crédito', playbook: 'inteligencia_credito' },
  { id: 'assessoria_mkt', label: 'Assessoria de marketing', playbook: 'assessoria_mkt' },
  { id: 'processo_vendas', label: 'Processo de vendas', playbook: 'processo_vendas' },
  { id: 'prazos', label: 'Prazos e SLAs', playbook: 'prazos_sla' },
  { id: 'comissao', label: 'Comissionamento e pagamentos', playbook: 'comissionamento' },
  { id: 'outros', label: 'Outros', playbook: null },
]
```

### Feature 2: Sistema de Playbooks Condicionais

Quando o gerente marca um tópico no Bloco 2, o sistema injeta uma tela de capacitação no fluxo do Condutor. Essa tela mostra o playbook correspondente.

### Feature 3: Funil de Vendas Interativo (Modelo NxNxNxN)

Bloco novo no Condutor, entre "Andamento" e "Indicações". Simulador interativo do funil de vendas com ritmo ajustável.

---

## MODELO DE DADOS ATUALIZADO

### Alterações no schema existente

```sql
-- Bug 1: campo faltante
ALTER TABLE parceiros ADD COLUMN meta_receita_mensal DECIMAL(15,2) DEFAULT 20000;

-- Feature 3: funil de vendas na RPI
ALTER TABLE rpis ADD COLUMN funil_vendas_ritmo INTEGER DEFAULT 4;
ALTER TABLE rpis ADD COLUMN funil_vendas_snapshot JSONB DEFAULT '{}';

-- Feature 2: playbooks
CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  conteudo JSONB NOT NULL DEFAULT '[]',
  categoria TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature 2: tracking de playbooks usados por RPI
ALTER TABLE rpis ADD COLUMN playbooks_usados TEXT[] DEFAULT '{}';

-- Indexes
CREATE INDEX idx_playbooks_slug ON playbooks(slug);
CREATE INDEX idx_playbooks_ativo ON playbooks(ativo);
```

---

## PRIORIDADE DE IMPLEMENTAÇÃO

### Sprint 1: Correções (fazer primeiro)

1. Corrigir Bug 1 (schema `meta_receita_mensal`)
2. Corrigir Bug 4 (modo focus do Condutor)
3. Corrigir Bug 3 (adicionar `vw_conversao_funil` ao schema)
4. Corrigir Bug 5 (formatar entregáveis no modal)
5. Atualizar checklist de Dúvidas (Feature 1)

### Sprint 2: Funil de Vendas + Playbooks

6. Componente `<FunilVendas />` + integração no Condutor
7. Tabela `playbooks` + seeds iniciais
8. Hook `usePlaybooks`
9. Componente `<PlaybookViewer />`
10. Blocos dinâmicos no Condutor

### Sprint 3: Motor + Dashboard

11. Componente `<MotorRetro />` + tab no ParceiroPerfil
12. Tab "Acompanhamento" no ParceiroPerfil
13. Dashboard completo
14. Consumir views do Supabase nos hooks

### Sprint 4: Posicionamento + Polimento

15. Bloco 1 do Condutor (Posicionamento/Ranking)
16. Configurações (substituir stub)
17. Comparação entre RPIs
18. Retroalimentação no FunilVendas

---

## REGRAS DE NEGÓCIO

1. **Frequência RPI:** A cada 45 dias corridos. Primeira RPI até 15 dias após onboarding.
2. **Categorias elegíveis:** Apenas Prata e Ouro fazem RPI.
3. **Etapas do funil são sequenciais:** Drag & drop só pode mover 1 etapa por vez.
4. **Ações herdadas:** Ações pendentes da RPI anterior aparecem automaticamente no Bloco "Plano de Ação".
5. **Snapshot é imutável:** Uma vez que a RPI é finalizada, o snapshot de métricas não muda.
6. **Texto HubSpot:** Máximo ~500 palavras, texto plano com emojis como marcadores.
7. **Retroalimentação do Motor:** Troca de premissa para dado real quando `total_leads >= 5`.
8. **Playbooks são opcionais:** Se nenhum tópico com playbook for marcado, o Condutor pula direto para Andamento.
9. **Funil NxNxNxN usa o tíquete médio do parceiro.**
10. **Modo focus do Condutor:** sem sidebar, fundo limpo.

---

## DIRETRIZES DE DESIGN

- **Não parece planilha. Parece app.**
- **Cores com significado:** Teal = parceiros. Blue = crédito. Violet = funil/motor. Amber = comissão/urgente. Rose = alertas. Emerald = conquistas.
- **O Condutor é o produto.** Investir mais no polish dessa tela.
- **Playbooks devem parecer material didático.**
- **Funil de Vendas deve ter impacto visual.**
- **Empty states com personalidade.**

---

## VARIÁVEIS DE AMBIENTE

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_APP_PIN=1234
```

---

## NOTAS PARA O CLAUDE CODE

- **Ler a seção BUGS primeiro.** Corrigir antes de qualquer feature nova.
- O dual-mode localStorage/Supabase deve ser mantido em todos os hooks novos.
- Cada componente novo em seu próprio arquivo em `src/components/`.
- Hooks novos em `src/hooks/`.
- Manter o pattern existente de `isSupabaseConfigured` para branching.
- Testar em modo localStorage primeiro (sem Supabase configurado).
- O deploy é GitHub Pages com HashRouter — manter `base: '/RPI-LOARA/'` no vite.config.
- Todos os valores monetários como número, formatados apenas na exibição com `formatCurrency()`.
- O `GERENTE_NOME` está hardcoded em `src/lib/format.ts`. Na Sprint de Configurações, migrar para localStorage/Supabase.
