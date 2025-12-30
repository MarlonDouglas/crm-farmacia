# CRM Farmácia

Sistema de CRM desenvolvido para farmácia, otimizado para uso em desktop (sidebar ao lado do WhatsApp Web) e mobile.

## 🚀 Tecnologias

- **Next.js 16** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones
- **Supabase** - Backend e banco de dados

## 📋 Estrutura de Usuários

### Vendedor
- Acesso via Desktop
- Registra novos atendimentos
- Gerencia status de vendas
- Copia scripts de mensagem para WhatsApp

### Dona
- Acesso via Mobile
- Visualiza pedidos aguardando confirmação de PIX
- Aprova pagamentos
- Interface focada em aprovações financeiras

## 🔄 Fluxo de Status

1. **Novo** → Atendimento recém-criado
2. **Em Negociação** → Cliente em negociação
3. **Aguardando PIX** → Aguardando confirmação de pagamento
4. **Em Separação** → Produtos sendo separados
5. **Aguardando Motoboy** → Aguardando motoboy para entrega
6. **Em Rota** → Produto em trânsito
7. **Concluído** → Entrega finalizada

## 🗄️ Estrutura do Banco de Dados

O projeto utiliza as seguintes tabelas no Supabase:

- `funcionarios` - Usuários do sistema (vendedor/dona)
- `clientes` - Cadastro de clientes
- `atendimentos` - Registro de atendimentos/vendas
- `scripts_msg` - Scripts de mensagem para WhatsApp

## ⚙️ Configuração

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente. Crie um arquivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

5. Acesse [http://localhost:3000](http://localhost:3000)

## 📱 Funcionalidades

### Painel do Vendedor
- ✅ Criar novo atendimento (modal com telefone e nome)
- ✅ Visualizar atendimentos em Kanban vertical
- ✅ Alterar status rapidamente
- ✅ Copiar scripts de mensagem para área de transferência
- ✅ Layout compacto otimizado para sidebar

### Painel da Dona
- ✅ Visualizar apenas pedidos aguardando PIX
- ✅ Confirmar pagamento com um clique
- ✅ Interface mobile-first
- ✅ Atualização automática a cada 10 segundos

## 🔐 Autenticação

O sistema utiliza autenticação simples via localStorage. Os usuários são autenticados através da tabela `funcionarios` com usuário e senha.

## 📝 Notas

- O sistema foi projetado para uso em janela estreita (sidebar) ao lado do WhatsApp Web
- A interface do vendedor é otimizada para desktop
- A interface da dona é mobile-first para uso em dispositivos móveis
- Todos os scripts de mensagem podem ser copiados com um clique para facilitar o atendimento no WhatsApp
