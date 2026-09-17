# Web Kivora Finance V2.3

Revisão funcional focada em consistência financeira e experiência de uso:

- Saldo atual, receitas, despesas, categorias e séries mensais consideram apenas transações confirmadas.
- Transações pendentes passam a compor o saldo projetado, sem inflar o saldo atual.
- Filtro e identificação visual de status na tela de Transações.
- Datas padrão geradas no horário local, evitando mudança indevida de dia no Brasil.
- Contas a receber atrasadas agora recebem prioridade visual correta.
- Calendário diferencia itens liquidados, atrasados e previstos.
- Validação de datas e valores de metas reforçada.
- Login atualiza a sessão local imediatamente após autenticação bem-sucedida.
- Baixa de contas agora deixa explícito que o saldo atual é movimentado pelas Transações, evitando dupla contabilização automática.

# Web Kivora Finance — V2.2

Sistema web de gestão financeira da Web Kivora, desenvolvido com React + Vite + TypeScript e integração opcional com Supabase.

## Novidades da V2.2

- Validações mais fortes em transações, contas, metas, perfil e autenticação.
- Salvamento assíncrono: formulários só fecham depois que o Supabase confirma a operação.
- Feedback visual com notificações de sucesso, erro e informação.
- Confirmações próprias para exclusões e ações críticas, sem `window.confirm`.
- Central de alertas no sino do topo para contas vencidas ou próximas do vencimento.
- Indicador de conexão offline.
- Tela de erro global para evitar uma tela quebrada caso ocorra uma exceção inesperada.
- Senha com indicador de força no cadastro e na redefinição.
- Mostrar/ocultar senha.
- Recuperação de senha com proteção contra envios repetidos em sequência.
- Configurações de perfil sincronizadas corretamente após o carregamento do Supabase.
- Estados de carregamento em salvar, excluir, baixar XLSX, marcar contas e recuperar senha.
- Melhorias de acessibilidade em botões, modais e navegação.
- Mantida a correção da V2.1 para o problema de travamento ao usar o botão direito.

## Recursos existentes

- Dashboard financeiro.
- Gráficos de pizza e colunas.
- Receitas e despesas.
- Contas a pagar e receber com prioridade por vencimento.
- Planejamento e metas.
- Estratégia financeira.
- Calendário financeiro.
- Relatórios profissionais em XLSX.
- Modo demonstração local.
- Supabase Auth.
- PostgreSQL no Supabase.
- Row Level Security (RLS) por usuário.
- Recuperação e redefinição de senha.

## Configuração

Instale as dependências:

```bash
npm install
```

Crie `.env.local` na raiz:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
```

Nunca coloque `service_role` ou secret keys no frontend.

Execute:

```bash
npm run dev
```

## Banco de dados

A V2.6 adiciona o vínculo entre **Contas** e **Transações**. Para uma instalação nova, execute no SQL Editor do Supabase, nesta ordem:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_accounts_transactions_link.sql
```

Se o banco da versão anterior já está funcionando, execute **somente**:

```text
supabase/migrations/002_accounts_transactions_link.sql
```

A migração adiciona `source_account_id` às transações e cria as funções seguras de baixa e reabertura de contas. A baixa ocorre de forma atômica no PostgreSQL: a conta é liquidada e a movimentação vinculada é criada na mesma operação.

## Atualizando a partir da versão anterior

Mantenha seu `.env.local` no computador. Ele não está incluído no ZIP e não deve ser enviado para o GitHub. Depois de substituir os arquivos do projeto, execute a migração `002_accounts_transactions_link.sql` no Supabase antes de testar a baixa automática de contas.

## Verificação recomendada

Após atualizar, teste:

1. Login e logout.
2. Cadastro de uma transação.
3. Edição e exclusão de uma transação.
4. Cadastro de uma conta e baixa automática, confirmando que a transação vinculada é criada.
5. Reabertura da conta, confirmando que a transação automática é removida.
6. Criação e exclusão de uma meta.
7. Alteração do nome em Configurações.
8. Sino de notificações.
9. Exportação XLSX.
10. Recuperação de senha.
11. Clique com botão direito em várias páginas para confirmar que o travamento não retornou.

## Segurança

A aplicação utiliza uma chave pública do Supabase no frontend. A proteção dos dados depende das políticas de RLS no PostgreSQL, que restringem cada registro ao usuário autenticado. Credenciais administrativas não devem ser expostas no navegador.
