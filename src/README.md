# Web Kivora Finance V2.8

Sistema web de gestão financeira desenvolvido com React, Vite, TypeScript e Supabase.

## Destaques da V2.8

- Planejamento e metas reformulado.
- Registro de aportes com data e observação.
- Histórico individual de aportes por meta.
- Remoção de aporte com recálculo automático do valor acumulado.
- Atualização de aporte e saldo da meta feita de forma atômica no PostgreSQL.
- Indicadores de aporte planejado, aporte ideal e previsão de conclusão.
- Status automáticos: **No ritmo**, **Ajustar plano**, **Prazo vencido**, **Sem aporte mensal** e **Concluída**.
- Resumo de valores acumulados, valores restantes, aportes do mês e plano mensal.
- Filtros para metas em andamento, concluídas e que precisam de atenção.
- Mantidas as melhorias anteriores de Dashboard, Relatórios e integração Contas ↔ Transações.

## Recursos principais

- Dashboard financeiro.
- Receitas e despesas.
- Contas a pagar e receber com baixa integrada às transações.
- Planejamento, metas e histórico de aportes.
- Estratégia financeira.
- Calendário financeiro.
- Relatórios analíticos e exportação XLSX.
- Modo demonstração local.
- Supabase Auth e PostgreSQL.
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

Para uma instalação nova, execute no SQL Editor do Supabase, nesta ordem:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_accounts_transactions_link.sql
supabase/migrations/003_goal_contributions.sql
```

Se você já está usando a V2.7 com as migrações anteriores aplicadas, execute **somente**:

```text
supabase/migrations/003_goal_contributions.sql
```

A migração V2.8 cria `goal_contributions`, aplica RLS por usuário e adiciona funções seguras para registrar e remover aportes. O valor acumulado da meta e o histórico são alterados na mesma operação do banco.

## Observação sobre metas existentes

O valor que já estava salvo em `saved_amount` continua intacto. O histórico passa a registrar os **novos aportes realizados a partir da V2.8**. No modal de histórico, a aplicação diferencia o valor inicial/ajustes anteriores dos aportes registrados.

## Verificação recomendada

Após atualizar, teste:

1. Login e logout.
2. Cadastro de uma transação.
3. Cadastro de uma conta e baixa automática.
4. Reabertura da conta e remoção da transação vinculada.
5. Criação de uma meta.
6. Registro de um aporte em uma meta.
7. Conferência do progresso, aporte ideal e previsão de conclusão.
8. Abertura do histórico de aportes.
9. Remoção de um aporte e recálculo do saldo da meta.
10. Relatórios e exportação XLSX.
11. Recuperação de senha.

## Segurança

A aplicação utiliza uma chave pública do Supabase no frontend. A proteção dos dados depende das políticas de RLS no PostgreSQL, que restringem cada registro ao usuário autenticado. Credenciais administrativas não devem ser expostas no navegador.
