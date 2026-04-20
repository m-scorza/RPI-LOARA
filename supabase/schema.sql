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
  meta_receita_mensal DECIMAL(15,2) DEFAULT 20000,

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

-- Conversão real do funil por parceiro
CREATE VIEW vw_conversao_funil AS
SELECT
  parceiro_id,
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

-- =============================================================
402: -- SPRINT 0 — Schema Fixes
403: -- =============================================================
404: 
405: -- Missing field in leads
406: ALTER TABLE leads ADD COLUMN IF NOT EXISTS dentro_farege BOOLEAN DEFAULT TRUE;
407: 
408: -- Missing fields in rpis
409: ALTER TABLE rpis ADD COLUMN IF NOT EXISTS funil_vendas_ritmo INTEGER DEFAULT NULL;
410: ALTER TABLE rpis ADD COLUMN IF NOT EXISTS funil_vendas_snapshot JSONB DEFAULT NULL;
411: ALTER TABLE rpis ADD COLUMN IF NOT EXISTS playbooks_usados TEXT[] DEFAULT '{}';
412: 
413: -- Playbooks table
414: CREATE TABLE IF NOT EXISTS playbooks (
415:   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
416:   slug TEXT UNIQUE NOT NULL,
417:   titulo TEXT NOT NULL,
418:   descricao TEXT,
419:   conteudo JSONB NOT NULL DEFAULT '[]',
420:   categoria TEXT,
421:   ativo BOOLEAN DEFAULT TRUE,
422:   ordem INTEGER DEFAULT 0,
423:   created_at TIMESTAMPTZ DEFAULT NOW(),
424:   updated_at TIMESTAMPTZ DEFAULT NOW()
425: );
426: CREATE INDEX idx_playbooks_slug ON playbooks(slug);
427: CREATE INDEX idx_playbooks_ativo ON playbooks(ativo);
428: 
429: -- Playbook seeds
430: INSERT INTO playbooks (slug, titulo, categoria, conteudo, ordem) VALUES
431: ('farege', 'Processo de Indicação (FAREGE)', 'processo', '[{"tipo": "texto", "titulo": "O que é o FAREGE?", "corpo": "FAREGE é o método de indicação da LOARA: **F**iltrar, **A**bordar, **R**elacionar, **E**ntregar, **G**erir, **E**voluir. Cada etapa garante que a indicação seja qualificada e tenha alto potencial de conversão."}, {"tipo": "passo_a_passo", "titulo": "Como aplicar o FAREGE", "passos": [{"numero": 1, "titulo": "Filtrar", "descricao": "Identifique empresas com faturamento acima de R$ 500 mil/ano e necessidade de crédito."}, {"numero": 2, "titulo": "Abordar", "descricao": "Faça o primeiro contato apresentando a LOARA como parceira de soluções financeiras."}, {"numero": 3, "titulo": "Relacionar", "descricao": "Construa confiança antes de solicitar documentos. Entenda as dores do empresário."}, {"numero": 4, "titulo": "Entregar", "descricao": "Envie a indicação completa com dados da empresa e contato do decisor."}, {"numero": 5, "titulo": "Gerir", "descricao": "Acompanhe o status da indicação e mantenha o indicado informado."}, {"numero": 6, "titulo": "Evoluir", "descricao": "Aprenda com cada indicação para melhorar as próximas."}]}, {"tipo": "checklist", "titulo": "Checklist de indicação", "items": ["Nome completo da empresa", "CNPJ", "Nome do decisor", "Telefone de contato", "Faturamento estimado", "Demanda de crédito estimada"]}]', 0),
431: ('varredura', 'Varredura e Documentação', 'processo', '[{"tipo": "texto", "titulo": "O que é a Varredura?", "corpo": "A Varredura é o processo de análise documental que identifica o potencial de crédito do cliente. Uma varredura bem feita acelera a aprovação e aumenta o valor liberado."}, {"tipo": "checklist", "titulo": "Documentos necessários", "items": ["Contrato social atualizado", "Faturamento dos últimos 12 meses", "Balanço patrimonial", "DRE do último exercício", "Certidões negativas (Federal, Estadual, Municipal)", "Relação de faturamento mensal"]}, {"tipo": "alerta", "titulo": "Atenção", "corpo": "Nunca solicite documentos por canais inseguros. Use sempre o portal da LOARA para upload de documentos sensíveis."}]', 1),
431: ('inteligencia_credito', 'Inteligência de Crédito', 'credito', '[{"tipo": "texto", "titulo": "Inteligência de Crédito LOARA", "corpo": "Nossa equipe de inteligência analisa cada operação para encontrar as melhores condições. Entenda como funciona para orientar melhor seus indicados."}, {"tipo": "passo_a_passo", "titulo": "Fluxo de análise", "passos": [{"numero": 1, "titulo": "Recebimento", "descricao": "A documentação é recebida e conferida pela equipe."}, {"numero": 2, "titulo": "Análise preliminar", "descricao": "Score de crédito e viabilidade são avaliados em até 48h."}, {"numero": 3, "titulo": "Proposta", "descricao": "As melhores opções de crédito são apresentadas ao cliente."}, {"numero": 4, "titulo": "Formalização", "descricao": "Documentos são assinados e a operação é concluída."}]}]', 2),
431: ('assessoria_mkt', 'Assessoria de Marketing', 'marketing', '[{"tipo": "texto", "titulo": "Assessoria de Marketing", "corpo": "A LOARA oferece suporte de marketing para parceiros Prata e Ouro. Utilize os materiais disponíveis para fortalecer sua marca e atrair mais indicações."}, {"tipo": "checklist", "titulo": "Materiais disponíveis", "items": ["Templates de posts para redes sociais", "Apresentação institucional personalizada", "Cases de sucesso para compartilhar", "Material para eventos e palestras"]}]', 3),
431: ('processo_vendas', 'Processo de Vendas', 'vendas', '[{"tipo": "texto", "titulo": "Processo de Vendas", "corpo": "O sucesso na indicação depende de um processo de vendas consistente. Siga o ritmo recomendado para maximizar seus resultados."}, {"tipo": "passo_a_passo", "titulo": "Ciclo de vendas", "passos": [{"numero": 1, "titulo": "Prospecção", "descricao": "Identifique potenciais clientes na sua rede de contatos."}, {"numero": 2, "titulo": "Qualificação", "descricao": "Verifique se o potencial cliente tem perfil para crédito."}, {"numero": 3, "titulo": "Apresentação", "descricao": "Apresente as soluções da LOARA de forma consultiva."}, {"numero": 4, "titulo": "Indicação", "descricao": "Formalize a indicação com todos os dados necessários."}]}, {"tipo": "alerta", "titulo": "Dica", "corpo": "Mantenha um ritmo constante de prospecção. O modelo 4x4x4x4 ajuda a manter a disciplina necessária."}]', 4),
431: ('prazos_sla', 'Prazos e SLAs', 'processo', '[{"tipo": "texto", "titulo": "Prazos e SLAs", "corpo": "Conheça os prazos de cada etapa para gerenciar expectativas com seus indicados."}, {"tipo": "passo_a_passo", "titulo": "Prazos por etapa", "passos": [{"numero": 1, "titulo": "Análise preliminar", "descricao": "Até 48 horas úteis após recebimento da documentação completa."}, {"numero": 2, "titulo": "Proposta de crédito", "descricao": "Até 5 dias úteis após aprovação preliminar."}, {"numero": 3, "titulo": "Formalização", "descricao": "Até 10 dias úteis após aceite da proposta."}, {"numero": 4, "titulo": "Liberação do crédito", "descricao": "Até 5 dias úteis após formalização completa."}]}, {"tipo": "alerta", "titulo": "Importante", "corpo": "Prazos podem variar conforme complexidade da operação. Documentação incompleta é a principal causa de atrasos."}]', 5),
431: ('comissionamento', 'Comissionamento e Pagamentos', 'processo', '[{"tipo": "texto", "titulo": "Como funciona o comissionamento", "corpo": "Sua comissão é calculada sobre o volume de crédito efetivamente liberado. Entenda a fórmula e os prazos de pagamento."}, {"tipo": "texto", "titulo": "Fórmula de cálculo", "corpo": "Comissão = Volume de crédito x Taxa de comissão bruta x (1 - Imposto). Exemplo: R$ 800.000 x 1,415% x (1 - 21,38%) = R$ 8.902"}, {"tipo": "checklist", "titulo": "Para receber", "items": ["Nota fiscal emitida corretamente", "Dados bancários atualizados no sistema", "Operação finalizada e confirmada"]}]', 6)
ON CONFLICT (slug) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  categoria = EXCLUDED.categoria,
  conteudo = EXCLUDED.conteudo,
  ordem = EXCLUDED.ordem;
