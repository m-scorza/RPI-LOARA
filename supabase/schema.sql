-- =============================================================
-- LOARA RPI — Database Schema
-- Execute this in the Supabase SQL Editor to set up the database
-- =============================================================

-- Parceiros
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

  taxa_produto DECIMAL(6,4) DEFAULT 0.06,
  comissao_bruta DECIMAL(8,6) DEFAULT 0.0141516,
  imposto_comissao DECIMAL(6,4) DEFAULT 0.2138,
  meta_anual_credito DECIMAL(15,2) DEFAULT 10000000,
  meta_anual_clientes INTEGER DEFAULT 12,
  tiquete_medio DECIMAL(15,2) DEFAULT 800000,

  conv_lead_qualificado DECIMAL(4,2) DEFAULT 0.60,
  conv_qualificado_oportunidade DECIMAL(4,2) DEFAULT 0.50,
  conv_oportunidade_cliente DECIMAL(4,2) DEFAULT 0.65,
  conv_cliente_doc DECIMAL(4,2) DEFAULT 0.80,
  conv_doc_credito DECIMAL(4,2) DEFAULT 0.85,
  tempo_medio_fechamento INTEGER DEFAULT 120,

  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'churned')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,

  nome_empresa TEXT NOT NULL,
  cnpj TEXT,
  faturamento_anual DECIMAL(15,2),
  demanda DECIMAL(15,2),

  etapa TEXT NOT NULL DEFAULT 'Lead' CHECK (etapa IN (
    'Lead', 'Lead Qualificado', 'Oportunidade', 'Cliente', 'Doc. Consolidada', 'Crédito Tomado'
  )),
  probabilidade DECIMAL(3,2) DEFAULT 0.10,

  data_lead DATE DEFAULT CURRENT_DATE,
  data_qualificado DATE,
  data_oportunidade DATE,
  data_cliente DATE,
  data_doc_consolidada DATE,
  data_credito_tomado DATE,

  valor_credito_tomado DECIMAL(15,2),

  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Pausado', 'Perdido', 'Ganho')),
  motivo_perda TEXT,
  origem TEXT DEFAULT 'Indicação Parceiro' CHECK (origem IN (
    'Indicação Parceiro', 'Prospecção Própria', 'Carteira Existente', 'Evento', 'Outro'
  )),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPIs
CREATE TABLE rpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,

  data_reuniao DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_sequencial INTEGER NOT NULL,
  tipo TEXT DEFAULT 'regular' CHECK (tipo IN ('primeira', 'regular', 'extraordinaria')),
  duracao_minutos INTEGER,

  snapshot_credito_ytd DECIMAL(15,2),
  snapshot_clientes_operando INTEGER,
  snapshot_comissao_ytd DECIMAL(15,2),
  snapshot_pipeline_total DECIMAL(15,2),
  snapshot_pipeline_ponderado DECIMAL(15,2),
  snapshot_leads_total INTEGER,
  snapshot_conversao_geral DECIMAL(6,4),

  bloco_posicionamento JSONB DEFAULT '{}',
  bloco_duvidas JSONB DEFAULT '{}',
  bloco_andamento JSONB DEFAULT '{}',
  bloco_indicacoes JSONB DEFAULT '{}',
  bloco_plano_acao JSONB DEFAULT '{}',

  notas_gerais TEXT,

  plano_acao_texto TEXT,
  hubspot_texto TEXT,
  relatorio_texto TEXT,

  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizada', 'cancelada')),
  proxima_rpi_prevista DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ações
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

  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada', 'cancelada')),
  data_conclusao DATE,
  notas_conclusao TEXT,

  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Acompanhamento Mensal
CREATE TABLE acompanhamento_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,

  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),

  credito_realizado DECIMAL(15,2) DEFAULT 0,
  clientes_novos_operando INTEGER DEFAULT 0,
  comissao_realizada DECIMAL(15,2) DEFAULT 0,

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

-- Indexes
CREATE INDEX idx_leads_parceiro ON leads(parceiro_id);
CREATE INDEX idx_leads_etapa ON leads(etapa);
CREATE INDEX idx_rpis_parceiro ON rpis(parceiro_id);
CREATE INDEX idx_rpis_data ON rpis(data_reuniao DESC);
CREATE INDEX idx_acoes_parceiro ON acoes(parceiro_id);
CREATE INDEX idx_acoes_status ON acoes(status);
CREATE INDEX idx_acomp_parceiro_periodo ON acompanhamento_mensal(parceiro_id, ano, mes);

-- Views
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
