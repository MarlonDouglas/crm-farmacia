# 🚀 CRM Farmácia - WhatsApp Edition

Sistema de gestão de relacionamento com cliente (CRM) com interface inspirada no **WhatsApp Web (Dark Mode)**, projetado para rodar na sidebar lateral do navegador. Unifica atendimento ágil e inteligência de dados robusta.

## 🛠️ Stack Tecnológico
- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS
- **Ícones:** Lucide React
- **Gráficos:** Recharts
- **Backend/DB:** Supabase (PostgreSQL)

## 📂 Estrutura do Projeto

### `/app/vendedor` (Interface Operacional)
- **Design:** Cópia fiel do WhatsApp Web Dark (`#111b21`, `#202c33`, `#00a884`).
- **Função:** Onde o vendedor passa 100% do tempo.
- **Features:** - Kanban Vertical (Chat List).
  - Cronômetros de SLA coloridos.
  - Modais de fechamento rápido.
  - Atalhos de teclado (Enter flow).

### `/app/dashboard` (Inteligência & Admin)
- **Função:** Visão da Dona/Gerência.
- **Features:**
  - Filtros temporais robustos (Hoje / Mês / Ano).
  - KPIs Financeiros (Faturamento, Ticket Médio).
  - Análise de Churn (Gráfico de Pizza com motivos de perda).
  - Mapa de Calor de horários (Para alocação de equipe).

## 🗄️ Banco de Dados (Supabase)

A estrutura atual suporta histórico de longo prazo (anos). Não delete registros antigos; o sistema usa timestamps para filtrar estatísticas.

**Tabelas Principais:**
- `atendimentos`: Núcleo do sistema. Contém `data_inicio`, `data_fim`, `valor_total`, `status`.
- `clientes`: Dados demográficos (`bairro`, `nome`, `telefone`).

## 🚀 Como Rodar

1. Clone o repositório.
2. Configure `.env.local` com suas chaves do Supabase.
3. Instale: `npm install`
4. Rode: `npm run dev`
5. Acesse:
   - Vendedor: `http://localhost:3000/vendedor`
   - Admin: `http://localhost:3000/dashboard`