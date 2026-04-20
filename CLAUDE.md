# CLAUDE.md v2.1 — Condutor de RPI

## Visão Geral
Webapp standalone para conduzir RPIs (Reuniões de Planejamento Individual) com parceiros de negócios da LOARA.

- **Fase Atual:** Premium UI & Modelo de Produtividade (Sprint 3 concluída).
- **Design:** Glassmorphism, Inter font, Micro-animações, Tema Dark-ish (Sidebar).

---

## Stack
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilização | Vanilla CSS + Tailwind CSS 4 (Theme variables) |
| Gráficos | Recharts |
| Backend/DB | Supabase (PostgreSQL) + LocalStorage Fallback |
| Ícones | Lucide React |
| State | Zustand + React Hooks customizados |

---

## CONVENÇÕES E PADRÕES
1. **Design System**: Use as classes `.glass-card` e `.glass-panel` definidas em `src/index.css`.
2. **Hooks**: Use `useDashboard` para estatísticas globais e `useSettings` para configurações.
3. **Moeda**: Use `formatCurrency()` de `src/lib/format.ts`.
4. **Data Model**: SEMPRE incluir `dentro_farege: boolean` ao criar leads.
5. **RPI Flow**: O condutor deve seguir o fluxo de blocos dinâmicos definidos em `CondutorRPI.tsx`.

---

## MODELO DE DADOS (Destaques)
- **Parceiro**: `meta_receita_mensal` (DECIMAL) adicionado.
- **Lead**: `dentro_farege` (BOOLEAN) para conformidade.
- **RPI**: `funil_vendas_ritmo`, `funil_vendas_snapshot`, `playbooks_usados`.

---

## STATUS DAS SPRINTS

### ✅ Sprint 1: Fundações & Correções
- [x] Bug 1: Campo `meta_receita_mensal` no schema.
- [x] Bug 4: Modo focus do Condutor (sem sidebar).
- [x] Bug 5: Formatação profissional de entregáveis.
- [x] Feature 1: Checklist de Dúvidas atualizado.

### ✅ Sprint 2: Funil & Playbooks
- [x] Componente `<FunilVendas />` interativo.
- [x] Integração de Playbooks no fluxo da RPI.
- [x] Sistema de Playbooks Condicionais.

### ✅ Sprint 3: Deliverables Polish & AI
- [x] Replaced manual modal with Radix Dialog (Accessibility).
- [x] Integrated Anthropic SDK for AI-assisted action plans.
- [x] High-fidelity PDF Export (jsPDF + html2canvas).
- [x] Premium Document Previews in CondutorRPI.

### 🚀 Sprint 4: Secondary App Improvements
- [ ] Dashboard LocalStorage fallback & Real Performance Data.
- [ ] Agenda optimization (Fix N+1 queries).
- [ ] Functional Search Bar & Notifications Bell.
- [ ] Performance Evolution Tab in Partner Profile.

---

## NOTAS DE DESENVOLVIMENTO
- **start-dev.bat**: Use para iniciar o ambiente localmente.
- **Views do Supabase**: O sistema agora depende das views `vw_parceiro_ytd`, `vw_pipeline_parceiro` e `vw_proximas_rpis`. Certifique-se de que estão criadas no DB.
- **Dual Mode**: Manter compatibilidade com localStorage caso o Supabase não esteja configurado.
