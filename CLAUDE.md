# CLAUDE.md — Condutor de RPI (Reunião de Planejamento Individual)

## Visão Geral do Projeto

Webapp standalone para conduzir RPIs (Reuniões de Planejamento Individual) com parceiros de negócios da LOARA. O sistema guia o gerente de parcerias durante a reunião ao vivo, mantém histórico completo, retroalimenta o modelo de funil e gera entregáveis formatados (plano de ação, relatório de status, texto para HubSpot).

**Usuário:** Um único gerente de parcerias (Matheus), sem necessidade de sistema de autenticação complexo. PIN simples de 4 dígitos na abertura do app é suficiente.

**Escala:** ~40 parceiros Prata/Ouro, ~18 RPIs/mês (cada parceiro a cada 45 dias).

**Filosofia:** O app é um *condutor* — ele guia a conversa, não é um formulário burocrático. A experiência deve ser fluida o suficiente para usar com o parceiro na tela compartilhada durante a reunião.

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18+ com Vite |
| Estilização | Tailwind CSS 3 |
| Gráficos | Recharts |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) |
| Deploy | Vercel ou Netlify (SPA) |
| Exportação | html2canvas + jsPDF para PDF, clipboard API para texto |
| Ícones | Lucide React |
| Datas | date-fns (com locale pt-BR) |
| State management | Zustand (leve, sem boilerplate) |
| Notificações | Sonner (toast notifications) |

---

## Modelo de Dados (Supabase/PostgreSQL)

### Tabela: `parceiros`

```sql
CREATE TABLE parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Bronze', 'Prata', 'Ouro')),
  regiao TEXT,
  contato_nome TEXT,
  contato_telefone TEXT,
  contato_email TEXT,
  data_onboarding DATE,
  cnpj_parceiro TEXT,
  
  -- Parâmetros financeiros
  taxa_produto DECIMAL(6,4) DEFAULT 0.06,
  comissao_bruta DECIMAL(8,6) DEFAULT 0.0141516,
  imposto_comissao DECIMAL(6,4) DEFAULT 0.2138,
  meta_anual_credito DECIMAL(15,2) DEFAULT 10000000,
  meta_anual_clientes INTEGER DEFAULT 12,
  tiquete_medio DECIMAL(15,2) DEFAULT 800000,
  
  -- Premissas do funil (taxas de conversão entre etapas)
  conv_lead_qualificado DECIMAL(4,2) DEFAULT 0.60,
  conv_qualificado_oportunidade DECIMAL(4,2) DEFAULT 0.50,
  conv_oportunidade_cliente DECIMAL(4,2) DEFAULT 0.65,
  conv_cliente_doc DECIMAL(4,2) DEFAULT 0.80,
  conv_doc_credito DECIMAL(4,2) DEFAULT 0.85,
  tempo_medio_fechamento INTEGER DEFAULT 120, -- dias
  
  -- Controle
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'churned')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: `leads`

Cada empresa indicada pelo parceiro, com seu estágio no funil.

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
  
  -- Dados da empresa
  nome_empresa TEXT NOT NULL,
  cnpj TEXT,
  faturamento_anual DECIMAL(15,2),
  demanda DECIMAL(15,2),
  
  -- Funil
  etapa TEXT NOT NULL DEFAULT 'Lead' CHECK (etapa IN (
    'Lead', 'Lead Qualificado', 'Oportunidade', 'Cliente', 'Doc. Consolidada', 'Crédito Tomado'
  )),
  probabilidade DECIMAL(3,2) DEFAULT 0.10,
  
  -- Datas de transição (registra quando entrou em cada etapa)
  data_lead DATE DEFAULT CURRENT_DATE,
  data_qualificado DATE,
  data_oportunidade DATE,
  data_cliente DATE,
  data_doc_consolidada DATE,
  data_credito_tomado DATE,
  
  -- Crédito
  valor_credito_tomado DECIMAL(15,2), -- preenchido quando chega no final do funil
  
  -- Controle
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Pausado', 'Perdido', 'Ganho')),
  motivo_perda TEXT,
  origem TEXT DEFAULT 'Indicação Parceiro' CHECK (origem IN (
    'Indicação Parceiro', 'Prospecção Própria', 'Carteira Existente', 'Evento', 'Outro'
  )),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: `rpis`

Cada reunião realizada, com seus dados, atas e plano de ação.

```sql
CREATE TABLE rpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
  
  -- Metadados
  data_reuniao DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_sequencial INTEGER NOT NULL, -- 1ª RPI, 2ª RPI, etc.
  tipo TEXT DEFAULT 'regular' CHECK (tipo IN ('primeira', 'regular', 'extraordinaria')),
  duracao_minutos INTEGER,
  
  -- Snapshot de métricas NO MOMENTO da RPI (para comparação histórica)
  snapshot_credito_ytd DECIMAL(15,2),
  snapshot_clientes_operando INTEGER,
  snapshot_comissao_ytd DECIMAL(15,2),
  snapshot_pipeline_total DECIMAL(15,2),
  snapshot_pipeline_ponderado DECIMAL(15,2),
  snapshot_leads_total INTEGER,
  snapshot_conversao_geral DECIMAL(6,4),
  
  -- Conteúdo da reunião (JSON flexível para os blocos)
  bloco_posicionamento JSONB DEFAULT '{}',
  bloco_duvidas JSONB DEFAULT '{}',
  bloco_andamento JSONB DEFAULT '{}',
  bloco_indicacoes JSONB DEFAULT '{}',
  bloco_plano_acao JSONB DEFAULT '{}',
  
  -- Notas livres
  notas_gerais TEXT,
  
  -- Entregáveis gerados
  plano_acao_texto TEXT,        -- texto formatado do plano de ação
  hubspot_texto TEXT,           -- texto formatado para colar no HubSpot
  relatorio_texto TEXT,         -- relatório de status completo
  
  -- Controle
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizada', 'cancelada')),
  proxima_rpi_prevista DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: `acoes`

Ações individuais do plano de ação, rastreáveis entre RPIs.

```sql
CREATE TABLE acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rpi_id UUID NOT NULL REFERENCES rpis(id) ON DELETE CASCADE,
  parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
  
  descricao TEXT NOT NULL,
  responsavel TEXT NOT NULL CHECK (responsavel IN ('Parceiro', 'Gerente', 'Ambos')),
  prazo DATE,
  prioridade TEXT DEFAULT 'média' CHECK (prioridade IN ('alta', 'média', 'baixa')),
  categoria TEXT CHECK (categoria IN (
    'indicação', 'documentação', 'treinamento', 'processo', 'relacionamento', 'outro'
  )),
  
  -- Tracking
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada', 'cancelada')),
  data_conclusao DATE,
  notas_conclusao TEXT,
  
  -- Vínculo com lead específico (opcional)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: `acompanhamento_mensal`

Dados mensais consolidados por parceiro (alimenta o Motor de Retroalimentação).

```sql
CREATE TABLE acompanhamento_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
  
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  
  -- Crédito
  credito_realizado DECIMAL(15,2) DEFAULT 0,
  
  -- Clientes
  clientes_novos_operando INTEGER DEFAULT 0,
  
  -- Comissão
  comissao_realizada DECIMAL(15,2) DEFAULT 0,
  
  -- Funil mensal (quantos entraram em cada etapa naquele mês)
  leads_recebidos INTEGER DEFAULT 0,
  leads_qualificados INTEGER DEFAULT 0,
  oportunidades INTEGER DEFAULT 0,
  clientes INTEGER DEFAULT 0,
  docs_consolidadas INTEGER DEFAULT 0,
  creditos_tomados INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(parceiro_id, ano, mes)
);
```

### Views úteis

```sql
-- Métricas YTD por parceiro
CREATE VIEW vw_parceiro_ytd AS
SELECT 
  parceiro_id,
  SUM(credito_realizado) AS credito_ytd,
  SUM(clientes_novos_operando) AS clientes_ytd,
  SUM(comissao_realizada) AS comissao_ytd,
  SUM(leads_recebidos) AS leads_ytd,
  SUM(creditos_tomados) AS creditos_tomados_ytd,
  COUNT(*) FILTER (WHERE credito_realizado > 0) AS meses_com_dados
FROM acompanhamento_mensal
WHERE ano = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY parceiro_id;

-- Pipeline consolidado por parceiro
CREATE VIEW vw_pipeline_parceiro AS
SELECT
  parceiro_id,
  COUNT(*) AS total_leads,
  COUNT(*) FILTER (WHERE status = 'Ativo') AS leads_ativos,
  SUM(demanda) FILTER (WHERE status = 'Ativo') AS demanda_total,
  SUM(demanda * probabilidade) FILTER (WHERE status = 'Ativo') AS credito_ponderado,
  COUNT(*) FILTER (WHERE etapa = 'Lead') AS em_lead,
  COUNT(*) FILTER (WHERE etapa = 'Lead Qualificado') AS em_qualificado,
  COUNT(*) FILTER (WHERE etapa = 'Oportunidade') AS em_oportunidade,
  COUNT(*) FILTER (WHERE etapa = 'Cliente') AS em_cliente,
  COUNT(*) FILTER (WHERE etapa = 'Doc. Consolidada') AS em_doc,
  COUNT(*) FILTER (WHERE etapa = 'Crédito Tomado') AS em_credito_tomado
FROM leads
WHERE status != 'Perdido'
GROUP BY parceiro_id;

-- Conversão real do funil por parceiro
CREATE VIEW vw_conversao_funil AS
SELECT
  parceiro_id,
  -- Cada taxa = (count at_or_beyond_next_stage) / (count at_or_beyond_this_stage)
  CASE WHEN COUNT(*) = 0 THEN NULL
    ELSE COUNT(*) FILTER (WHERE etapa IN ('Lead Qualificado','Oportunidade','Cliente','Doc. Consolidada','Crédito Tomado'))::DECIMAL / COUNT(*)
  END AS conv_lead_qualificado,
  CASE WHEN COUNT(*) FILTER (WHERE etapa IN ('Lead Qualificado','Oportunidade','Cliente','Doc. Consolidada','Crédito Tomado')) = 0 THEN NULL
    ELSE COUNT(*) FILTER (WHERE etapa IN ('Oportunidade','Cliente','Doc. Consolidada','Crédito Tomado'))::DECIMAL 
      / COUNT(*) FILTER (WHERE etapa IN ('Lead Qualificado','Oportunidade','Cliente','Doc. Consolidada','Crédito Tomado'))
  END AS conv_qualificado_oportunidade,
  CASE WHEN COUNT(*) FILTER (WHERE etapa IN ('Oportunidade','Cliente','Doc. Consolidada','Crédito Tomado')) = 0 THEN NULL
    ELSE COUNT(*) FILTER (WHERE etapa IN ('Cliente','Doc. Consolidada','Crédito Tomado'))::DECIMAL 
      / COUNT(*) FILTER (WHERE etapa IN ('Oportunidade','Cliente','Doc. Consolidada','Crédito Tomado'))
  END AS conv_oportunidade_cliente,
  CASE WHEN COUNT(*) FILTER (WHERE etapa IN ('Cliente','Doc. Consolidada','Crédito Tomado')) = 0 THEN NULL
    ELSE COUNT(*) FILTER (WHERE etapa IN ('Doc. Consolidada','Crédito Tomado'))::DECIMAL 
      / COUNT(*) FILTER (WHERE etapa IN ('Cliente','Doc. Consolidada','Crédito Tomado'))
  END AS conv_cliente_doc,
  CASE WHEN COUNT(*) FILTER (WHERE etapa IN ('Doc. Consolidada','Crédito Tomado')) = 0 THEN NULL
    ELSE COUNT(*) FILTER (WHERE etapa = 'Crédito Tomado')::DECIMAL 
      / COUNT(*) FILTER (WHERE etapa IN ('Doc. Consolidada','Crédito Tomado'))
  END AS conv_doc_credito
FROM leads
WHERE status != 'Perdido'
GROUP BY parceiro_id;

-- Próximas RPIs (baseado em 45 dias da última)
CREATE VIEW vw_proximas_rpis AS
SELECT
  p.id AS parceiro_id,
  p.nome,
  p.categoria,
  r.data_reuniao AS ultima_rpi,
  r.data_reuniao + INTERVAL '45 days' AS proxima_rpi_calculada,
  COALESCE(r.proxima_rpi_prevista, r.data_reuniao + INTERVAL '45 days') AS proxima_rpi,
  CASE 
    WHEN r.data_reuniao + INTERVAL '45 days' < CURRENT_DATE THEN 'atrasada'
    WHEN r.data_reuniao + INTERVAL '45 days' < CURRENT_DATE + INTERVAL '7 days' THEN 'urgente'
    WHEN r.data_reuniao + INTERVAL '45 days' < CURRENT_DATE + INTERVAL '15 days' THEN 'próxima'
    ELSE 'no_prazo'
  END AS urgencia,
  r.numero_sequencial AS ultima_rpi_numero
FROM parceiros p
LEFT JOIN LATERAL (
  SELECT * FROM rpis 
  WHERE parceiro_id = p.id AND status = 'finalizada'
  ORDER BY data_reuniao DESC 
  LIMIT 1
) r ON TRUE
WHERE p.status = 'ativo' AND p.categoria IN ('Prata', 'Ouro');
```

### RLS (Row Level Security)

Desabilitado — app é single-user. Se no futuro precisar multi-user, adicionar coluna `gerente_id` em `parceiros` e habilitar RLS com base no `auth.uid()`.

### Indexes

```sql
CREATE INDEX idx_leads_parceiro ON leads(parceiro_id);
CREATE INDEX idx_leads_etapa ON leads(etapa);
CREATE INDEX idx_rpis_parceiro ON rpis(parceiro_id);
CREATE INDEX idx_rpis_data ON rpis(data_reuniao DESC);
CREATE INDEX idx_acoes_parceiro ON acoes(parceiro_id);
CREATE INDEX idx_acoes_status ON acoes(status);
CREATE INDEX idx_acomp_parceiro_periodo ON acompanhamento_mensal(parceiro_id, ano, mes);
```

---

## Estrutura de Páginas e Navegação

### Layout Global

- **Sidebar fixa à esquerda** (recolhível): logo LOARA no topo, navegação principal, footer com versão.
- **Área de conteúdo** à direita: header com breadcrumb + ações, conteúdo principal.
- **Design:** dark sidebar (#0F1B2D) + fundo claro (#F0F4F8). Cards brancos com sombra sutil. Tipografia moderna (Aptos ou Inter como fallback). Palette de acento: teal para parceiros, blue para crédito, violet para funil/motor, amber para comissão, rose para alertas, emerald para conquistas.

### Páginas

```
/                         → Dashboard Geral (home)
/parceiros                → Lista de Parceiros
/parceiros/:id            → Perfil do Parceiro (tabs internas)
/parceiros/:id/rpi/nova   → Condutor de RPI (tela de reunião)
/parceiros/:id/rpi/:rpiId → Visualizar RPI passada
/agenda                   → Agenda de RPIs (calendário/lista)
/configuracoes            → Configurações gerais
```

---

## Página: Dashboard Geral (`/`)

Visão consolidada de todos os 40 parceiros. O gerente abre isso toda manhã.

### Componentes:

1. **Barra de RPIs urgentes** (topo, full-width)
   - Lista horizontal de cards compactos com parceiros cuja RPI está atrasada (>45 dias) ou próxima (<7 dias).
   - Cada card: nome do parceiro, dias desde última RPI, botão "Iniciar RPI".
   - Cor: rose para atrasadas, amber para urgentes, muted para no prazo.

2. **KPIs Consolidados** (4 cards)
   - Crédito Total YTD (soma de todos os parceiros) vs Meta Global
   - Comissão Total YTD vs Projeção
   - Total de Leads Ativos no Pipeline (todos os parceiros)
   - RPIs Realizadas no Mês / Total Necessárias

3. **Pipeline Global** (gráfico de barras empilhadas ou funil)
   - Distribuição de todos os leads por etapa do funil, somando todos os parceiros.
   - Pode filtrar por categoria (Prata/Ouro) ou região.

4. **Ranking de Parceiros** (tabela ordenável)
   - Colunas: Nome, Categoria, Crédito YTD, % Meta, Leads Ativos, Última RPI, Próxima RPI, Status.
   - Filtros: categoria, região, urgência de RPI.
   - Click leva ao perfil do parceiro.

5. **Ações Pendentes** (lista)
   - Ações de planos de ação de todas as RPIs que estão pendentes ou atrasadas.
   - Agrupadas por parceiro, ordenadas por prazo.

---

## Página: Perfil do Parceiro (`/parceiros/:id`)

Tudo sobre um parceiro específico. Tabs internas:

### Tab 1: Visão Geral
- Card de dados cadastrais (nome, categoria, região, contato, data onboarding)
- KPIs do parceiro (crédito YTD, comissão, clientes, pipeline)
- Mini funil visual
- Cronograma de RPIs (timeline horizontal mostrando todas as RPIs feitas, a próxima prevista)

### Tab 2: Pipeline
- Kanban visual com as 6 colunas do funil (Lead → Crédito Tomado)
- Cada card = 1 lead, mostrando: nome da empresa, demanda, dias no estágio, probabilidade
- Drag & drop entre colunas (ao mover, registra automaticamente a data de transição)
- Filtros: status, origem, mês alvo
- Totais por coluna: count + soma de demanda
- Botão "+ Novo Lead" abre modal de cadastro

### Tab 3: Acompanhamento
- Tabela mensal (12 colunas) idêntica à aba "Acompanhamento" do Excel
- Blocos: crédito, clientes, comissão, funil mensal
- Campos editáveis inline (click para editar)
- Gráfico de linha sobrepondo meta vs realizado (Recharts)
- YTD e projeção anual calculados automaticamente

### Tab 4: Motor
- Tabela de conversão: premissa vs real vs ativo (com indicador visual de qual está ativo)
- Gap analysis: crédito faltante, run-rate, ritmo, leads/mês recomendados
- Projeções revisadas
- Toggle para forçar premissa manual override (caso o gerente discorde do dado calculado)

### Tab 5: Histórico de RPIs
- Lista de todas as RPIs realizadas, com data, número sequencial, status
- Click expande/abre a RPI com todos os blocos preenchidos
- Comparação lado a lado entre 2 RPIs (diff visual de métricas)
- Botão "Nova RPI" inicia o condutor

### Tab 6: Configuração
- Edição dos parâmetros financeiros e premissas do funil
- Log de alterações

---

## Página: Condutor de RPI (`/parceiros/:id/rpi/nova`)

**Esta é a tela principal do produto.** É usada durante a reunião ao vivo com o parceiro.

### Comportamento Geral:
- Tela cheia (sem sidebar, botão de voltar discreto no canto).
- Barra de progresso no topo mostrando em qual bloco da reunião estamos.
- Navegação por blocos (steps), pode ir e voltar livremente.
- Auto-save a cada 30 segundos e ao trocar de bloco.
- Timer discreto no canto mostrando duração da reunião.
- Ao finalizar, gera automaticamente os 3 entregáveis.

### Bloco 0: Preparação (pré-reunião)

Tela de briefing que o gerente vê ANTES de começar a reunião. Mostra:

- Dados do parceiro (nome, categoria, desde quando)
- Último plano de ação e status de cada ação (concluída/pendente/atrasada)
- Snapshot de métricas (crédito, clientes, pipeline) comparado com a RPI anterior
- Leads que mudaram de estágio desde a última RPI
- Alertas: ações atrasadas, leads parados há muito tempo, RPI atrasada

Botão: **"Iniciar Reunião"** → vai pro Bloco 1 e começa o timer.

### Bloco 1: Posicionamento do Parceiro (item 3.10.1)

Mostrar ao parceiro como ele está em relação aos seus pares.

**Interface:**
- Gráfico de barras horizontal: ranking do parceiro vs média dos pares na mesma categoria (Prata ou Ouro), em 3 dimensões: crédito YTD, leads indicados, conversão do funil.
- Posição numérica: "Você é o #X de Y parceiros [categoria]".
- Evolução: seta indicando se subiu ou desceu desde a última RPI.
- Campo de texto livre: "Observações sobre posicionamento" (o que foi discutido).

**Dado necessário:** Precisa de dados agregados dos outros parceiros para calcular o ranking. Criar uma view ou function no Supabase que retorna percentis sem expor dados individuais de outros parceiros.

```sql
CREATE FUNCTION fn_ranking_parceiro(p_parceiro_id UUID)
RETURNS TABLE(
  dimensao TEXT,
  valor_parceiro DECIMAL,
  media_categoria DECIMAL,
  posicao INTEGER,
  total_categoria INTEGER
) AS $$
  -- Implementar query que compara o parceiro com seus pares
  -- Retornar apenas posição e média, nunca dados de outros parceiros
$$ LANGUAGE sql SECURITY DEFINER;
```

### Bloco 2: Dúvidas e Dificuldades (item 3.10.2)

**Interface:**
- Checklist pré-definido de tópicos comuns:
  - [ ] Processo de indicação (como indicar, FAREGE)
  - [ ] Varredura e documentação
  - [ ] Políticas de crédito
  - [ ] Prazos e SLAs
  - [ ] Comissionamento e pagamentos
  - [ ] Outros
- Cada item é clicável → expande para campo de texto para registrar a dúvida e a resolução dada.
- Toggle: "Resolvido na reunião" / "Requer ação posterior" (se posterior, vira item do plano de ação automaticamente).
- Campo livre: "Outras dúvidas/dificuldades levantadas".

### Bloco 3: Andamento das Operações (item 3.10.3)

**Interface:**
- Kanban compacto (read-only nesta tela) mostrando o pipeline atual do parceiro, agrupado por etapa.
- Para cada lead, mostrar: nome, demanda, dias no estágio atual, último movimento.
- Destaque visual para:
  - 🔴 Leads parados há mais de X dias (configurável)
  - 🟡 Leads que mudaram de estágio desde a última RPI
  - 🟢 Leads que avançaram para "Crédito Tomado"
- Ao clicar em um lead, abre painel lateral com detalhes e campo para registrar update discutido na reunião.
- Cards de resumo no topo: total em cada etapa, crédito ponderado, leads novos desde última RPI.
- Campo de texto: "Pontos discutidos sobre operações".

### Bloco 4: Futuras Indicações (item 3.10.4)

**Interface:**
- Card com meta de leads/mês (calculado pelo motor) e realizado no mês corrente.
- Gráfico de tendência: leads indicados por mês nos últimos 6 meses.
- Seção "Novas indicações discutidas nesta RPI":
  - Formulário rápido para adicionar leads diretamente: Nome da empresa, CNPJ (opcional), Faturamento estimado, Demanda estimada.
  - Ao salvar, o lead entra automaticamente no Pipeline como etapa "Lead".
  - Lista editável dos leads adicionados nesta RPI.
- Campo de texto: "Compromisso do parceiro para próximo período" (ex: "vai indicar 5 empresas da região de Limeira").

### Bloco 5: Plano de Ação (item 3.10.5)

**Interface:**
- **Ações pendentes da RPI anterior** (topo): lista das ações da última RPI com status atualizado.
  - O gerente atualiza o status de cada uma: concluída / ainda em andamento / cancelada.
  - Ações não concluídas podem ser "herdadas" para a nova RPI com um click.

- **Novas ações** (meio): formulário para adicionar ações:
  - Descrição (texto livre)
  - Responsável: Parceiro / Gerente / Ambos (dropdown)
  - Prazo (date picker, default = próxima RPI)
  - Prioridade: Alta / Média / Baixa
  - Categoria: Indicação / Documentação / Treinamento / Processo / Relacionamento / Outro
  - Lead vinculado (opcional, dropdown dos leads do parceiro)

- **Resumo do plano** (bottom): visualização card-style de todas as ações (herdadas + novas), agrupadas por responsável.

### Bloco 6: Finalização

**Interface:**
- Resumo visual da RPI: quantos tópicos cobertos, quantas ações definidas, leads adicionados, métricas atualizadas.
- Date picker: "Próxima RPI prevista" (pré-preenchido com +45 dias).
- Campo: "Notas gerais da reunião" (texto livre).
- Botão: **"Gerar Entregáveis"** → abre modal com 3 tabs:

#### Tab 1: Plano de Ação
Visualização formatada do plano de ação, pronta para compartilhar.
- Cabeçalho: parceiro, data, gerente, número da RPI.
- Tabela de ações com responsável, prazo, prioridade.
- Botão: "Copiar como texto" / "Exportar PDF".

#### Tab 2: Relatório de Status
Relatório completo da situação do parceiro:
- KPIs (crédito, comissão, clientes, funil).
- Pipeline resumido por etapa.
- Comparação com RPI anterior (delta de cada métrica).
- Botão: "Copiar como texto" / "Exportar PDF".

#### Tab 3: Texto para HubSpot
Texto pré-formatado para colar direto no campo de notas do contato no HubSpot:
```
📋 RPI #[N] — [Nome do Parceiro] — [Data]
Gerente: [Nome]

📊 MÉTRICAS
• Crédito YTD: R$ [X] ([Y]% da meta)
• Clientes operando: [N] ([Y]% da meta)
• Pipeline: [N] leads ativos, R$ [X] ponderado

🔄 ANDAMENTO
• [Resumo dos pontos discutidos sobre operações]

📝 PLANO DE AÇÃO
1. [Ação] — Resp: [X] — Prazo: [Data]
2. [Ação] — Resp: [X] — Prazo: [Data]
...

📅 Próxima RPI: [Data]
```
Botão: **"Copiar para clipboard"** (com feedback visual de "Copiado!").

Após gerar, botão **"Finalizar RPI"** → marca como finalizada, volta ao perfil do parceiro.

---

## Página: Agenda de RPIs (`/agenda`)

### Componentes:

1. **Vista calendário mensal** (default)
   - Cada dia mostra as RPIs agendadas (próximas previstas).
   - Cor por urgência: rose = atrasada, amber = esta semana, teal = no prazo.
   - Click no parceiro → vai direto ao condutor.

2. **Vista lista** (toggle)
   - Tabela: Parceiro, Categoria, Última RPI, Próxima RPI, Dias Restantes, Status.
   - Ordenável por qualquer coluna.
   - Filtros: categoria, urgência, região.

3. **Stats no topo**
   - RPIs realizadas este mês / total esperado.
   - RPIs atrasadas (count).
   - Média de dias entre RPIs (atual vs meta de 45).

---

## Geração de Entregáveis

### Formato do Plano de Ação (PDF)

```
┌──────────────────────────────────────────────┐
│  LOARA — Plano de Ação                       │
│  Parceiro: [Nome] ([Categoria])              │
│  RPI #[N] — [Data]                           │
│  Gerente: [Nome]                             │
├──────────────────────────────────────────────┤
│                                              │
│  AÇÕES DEFINIDAS                             │
│                                              │
│  ● [Alta] [Descrição]                        │
│    Responsável: Parceiro                     │
│    Prazo: DD/MM/YYYY                         │
│    Categoria: Indicação                      │
│                                              │
│  ● [Média] [Descrição]                       │
│    Responsável: Gerente                      │
│    Prazo: DD/MM/YYYY                         │
│    Categoria: Processo                       │
│                                              │
├──────────────────────────────────────────────┤
│  Próxima RPI: DD/MM/YYYY                     │
│  Ações pendentes da RPI anterior: X de Y     │
│  concluídas                                  │
└──────────────────────────────────────────────┘
```

### Formato HubSpot (texto plano)

Texto plano com emojis como marcadores visuais, otimizado para o campo de notas do HubSpot. Sem markdown, sem HTML. Cada seção separada por linha em branco. Máximo ~500 palavras para não poluir o histórico.

---

## Componentes Reutilizáveis

### `<FunnelChart />`
Gráfico de funil vertical com as 6 etapas, mostrando count e valor em cada nível. Cores do design system. Usado no dashboard, perfil do parceiro e condutor.

### `<KPICard />`
Card com: label (muted), valor principal (grande), valor secundário (meta ou comparação), indicador de progresso (barra ou %). Props: `label`, `value`, `target`, `format`, `color`, `trend`.

### `<PipelineKanban />`
Board kanban com 6 colunas. Cada coluna tem header com count + soma. Cards draggable. Props: `leads`, `onMove`, `onClickLead`, `readOnly`.

### `<ActionList />`
Lista de ações com status chips, responsável badges, prazo com indicador de urgência. Props: `acoes`, `onStatusChange`, `onEdit`.

### `<MetricComparison />`
Componente que mostra uma métrica atual vs anterior, com delta e seta up/down. Props: `label`, `current`, `previous`, `format`.

### `<RPITimeline />`
Timeline horizontal mostrando RPIs realizadas como dots clicáveis, com a próxima prevista em destaque.

### `<PartnerRanking />`
Gráfico de barras horizontais mostrando o parceiro vs média da categoria, com posição.

### `<CopyButton />`
Botão que copia texto para clipboard e mostra toast "Copiado!" com animação. Props: `text`, `label`.

---

## Fluxo de Dados e Retroalimentação

### Ao mover um lead no Kanban:
1. Atualiza `leads.etapa`
2. Registra a data na coluna correspondente (`data_qualificado`, `data_oportunidade`, etc.)
3. Atualiza `leads.updated_at`
4. A view `vw_conversao_funil` recalcula automaticamente
5. O Motor na tela do parceiro reflete os novos dados

### Ao finalizar uma RPI:
1. Salva snapshot de métricas do momento na tabela `rpis`
2. Gera os 3 textos (plano de ação, relatório, HubSpot) e salva
3. Cria as ações na tabela `acoes`
4. Calcula e salva `proxima_rpi_prevista`
5. Incrementa `numero_sequencial`

### Retroalimentação do Motor:
- As views `vw_conversao_funil` e `vw_parceiro_ytd` são recalculadas em tempo real
- O Motor compara premissa vs real e usa o dado real quando `total_leads >= 5`
- O gerente pode fazer override manual (flag `override_premissa` por etapa, a definir)

### Cálculo de Ranking (Bloco 1 da RPI):
- Function `fn_ranking_parceiro` calcula posição do parceiro vs pares da mesma categoria
- Nunca expõe dados individuais de outros parceiros
- Dimensões: crédito YTD, leads indicados (últimos 90 dias), conversão geral

---

## Regras de Negócio Importantes

1. **Frequência RPI:** A cada 45 dias corridos. Primeira RPI até 15 dias após onboarding.
2. **Categorias elegíveis:** Apenas Prata e Ouro fazem RPI. Bronze não participa.
3. **Etapas do funil são sequenciais:** Um lead não pode pular etapas (Lead → Oportunidade direto não é permitido). A UI deve respeitar isso no drag & drop.
4. **Ações herdadas:** Ações pendentes da RPI anterior aparecem automaticamente no Bloco 5 da próxima RPI. O gerente decide se herda, conclui ou cancela.
5. **Snapshot é imutável:** Uma vez que a RPI é finalizada, o snapshot de métricas não muda — é uma foto do momento.
6. **Texto HubSpot é compacto:** Máximo ~500 palavras, sem formatação rica. Emojis como marcadores são ok.
7. **Tempo médio de fechamento:** Calculado como média de dias entre `data_lead` e `data_credito_tomado` para leads que chegaram ao final. Se não houver dados, usa a premissa configurada.
8. **Informação sensível:** A tela do Condutor de RPI pode ser compartilhada com o parceiro (tela projetada). O Bloco 1 (ranking) deve mostrar apenas posição relativa, nunca dados de outros parceiros. Os blocos 2-5 são safe para compartilhar.

---

## Prioridade de Implementação

### Fase 1 — MVP (usar imediatamente)
1. Setup Supabase (schema, views, indexes)
2. CRUD de parceiros (lista + formulário)
3. CRUD de leads (pipeline kanban com drag & drop)
4. Condutor de RPI (blocos 0, 2, 3, 4, 5, 6 — sem bloco 1/ranking)
5. Geração de texto HubSpot + plano de ação (copy to clipboard)
6. Agenda de RPIs (vista lista)

### Fase 2 — Inteligência
7. Motor de retroalimentação (premissa vs real vs ativo)
8. Dashboard geral com KPIs consolidados
9. Bloco 1 do condutor (ranking vs pares)
10. Acompanhamento mensal por parceiro
11. Comparação entre RPIs (diff visual)
12. Exportação PDF do plano de ação

### Fase 3 — Polimento
13. Agenda vista calendário
14. Gráficos de tendência (Recharts)
15. Notificações/alertas de RPI atrasada
16. Import inicial de dados dos parceiros existentes (CSV)
17. Override manual de premissas no Motor

---

## Diretrizes de Design

- **Não parece planilha.** Parece app. Cards com border-radius, sombras sutis, espaço generoso.
- **Cores com significado:** Cada etapa do funil tem sua cor. Alertas em rose. Conquistas em emerald. Motor em violet.
- **Tipografia clara:** Títulos bold, dados em peso regular, labels em muted. Hierarquia visual nítida.
- **Mobile-friendly é desejável** mas não obrigatório — o uso principal é desktop/laptop na reunião.
- **Animações sutis:** Transições entre blocos do condutor, feedback visual ao salvar/copiar, progress bar animada.
- **Empty states com personalidade:** Quando não há dados, mostrar ilustração/mensagem que guie o próximo passo ("Nenhum lead cadastrado. Que tal adicionar os primeiros?").
- **Condutor em modo focus:** Quando o condutor está aberto, esconder navegação para manter foco na reunião.

---

## Considerações de Segurança

- **Sem auth complexo:** PIN de 4 dígitos no .env (VITE_APP_PIN). Verificado no frontend. Suficiente para uso pessoal.
- **Supabase anon key:** Usar anon key com RLS desabilitado (single-user). Se migrar para multi-user, reabilitar RLS.
- **Dados sensíveis:** CNPJs, faturamentos e demandas de empresas são dados sensíveis. Não commitar no repo. O .env deve conter apenas a URL e key do Supabase.
- **Backup:** Configurar backup automático do Supabase (plano gratuito já inclui).

---

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_APP_PIN=1234
```

---

## Notas para o Claude Code

- Começar pela Fase 1. Não implementar features de fases posteriores até que a Fase 1 esteja funcional e testada.
- O schema SQL deve ser executado primeiro via Supabase SQL editor.
- Usar Supabase JS client v2 (`@supabase/supabase-js`).
- Cada componente reutilizável deve ter seu próprio arquivo em `src/components/`.
- Pages em `src/pages/`, organizadas por rota.
- Hooks customizados para acesso ao Supabase em `src/hooks/` (ex: `usePartners()`, `useLeads(partnerId)`, `useRPI(rpiId)`).
- Zustand stores em `src/stores/` (ex: `useRPIStore` para estado do condutor durante a reunião).
- O condutor de RPI é stateful — todo o progresso fica no Zustand store e faz auto-save no Supabase a cada 30s.
- Não usar SSR. SPA puro com React Router v6.
- Tratar todos os valores monetários como número (não string). Formatar apenas na exibição com `Intl.NumberFormat('pt-BR')`.
