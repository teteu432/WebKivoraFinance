# Web Kivora Finance V2.2.1

Correção de autenticação: mensagens específicas para limites do Supabase e bloqueio local contra envio duplicado do formulário de login/cadastro.

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

A V2.2 não exige nenhuma migração adicional em relação à V2.1. Se o banco da V2 já está funcionando, mantenha-o como está.

Para uma instalação nova, execute no SQL Editor do Supabase:

```text
supabase/migrations/001_initial_schema.sql
```

## Atualizando a partir da V2.1

Se você já configurou seu `.env.local`, mantenha esse arquivo no computador. Ele não está incluído no ZIP e não deve ser enviado para o GitHub.

Você pode substituir o código da V2.1 pelo da V2.2 e manter o mesmo projeto Supabase. As tabelas existentes (`profiles`, `transactions`, `accounts` e `goals`) continuam compatíveis.

## Verificação recomendada

Após atualizar, teste:

1. Login e logout.
2. Cadastro de uma transação.
3. Edição e exclusão de uma transação.
4. Cadastro e baixa de uma conta.
5. Criação e exclusão de uma meta.
6. Alteração do nome em Configurações.
7. Sino de notificações.
8. Exportação XLSX.
9. Recuperação de senha.
10. Clique com botão direito em várias páginas para confirmar que o travamento não retornou.

## Segurança

A aplicação utiliza uma chave pública do Supabase no frontend. A proteção dos dados depende das políticas de RLS no PostgreSQL, que restringem cada registro ao usuário autenticado. Credenciais administrativas não devem ser expostas no navegador.
