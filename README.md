# Web Kivora Finance V2

Sistema web de gestão financeira da Web Kivora, desenvolvido com React + Vite + TypeScript.

## O que mudou na V2

A V2 mantém as funcionalidades da V1.2 e adiciona uma camada real de autenticação e persistência preparada para produção:

- Supabase Auth com e-mail e senha;
- criação de conta;
- confirmação de e-mail compatível com o fluxo do Supabase;
- recuperação e redefinição de senha;
- sessão persistente;
- PostgreSQL via Supabase;
- tabelas para perfis, transações, contas e metas;
- Row Level Security (RLS) em todas as tabelas financeiras;
- cada usuário acessa somente os próprios registros;
- perfil do usuário salvo no banco;
- modo demonstração ainda disponível e totalmente separado dos dados reais;
- exportação XLSX profissional preservada;
- interface e gráfico em SVG da tela de login preservados.

## 1. Instalar dependências

```bash
npm install
npm run dev
```

## 2. Criar o projeto no Supabase

Crie um projeto no Supabase e abra o **SQL Editor**.

Execute o arquivo:

```text
supabase/migrations/001_initial_schema.sql
```

Ele cria as tabelas, índices, gatilhos e políticas RLS necessárias.

## 3. Configurar as variáveis públicas

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

A aplicação também aceita `VITE_SUPABASE_ANON_KEY` como compatibilidade para projetos que ainda exibem a antiga chave `anon`.

**Nunca coloque `service_role` no frontend.**

## 4. Configurar URLs de autenticação

No painel do Supabase, em Authentication / URL Configuration, configure o endereço local e depois o domínio de produção.

Para desenvolvimento:

```text
http://localhost:5173
```

Adicione também como redirect permitido:

```text
http://localhost:5173/login
http://localhost:5173/redefinir-senha
```

Quando publicar na Vercel, inclua as mesmas rotas no domínio real.

## 5. Testar contas reais

1. Abra `/login`.
2. Clique em **Criar conta**.
3. Informe nome, e-mail e senha com pelo menos 8 caracteres.
4. Se a confirmação de e-mail estiver habilitada no Supabase, confirme o cadastro pelo e-mail recebido.
5. Entre normalmente.
6. Cadastre uma transação, uma conta e uma meta.
7. Saia da conta e entre novamente.
8. Verifique que os dados continuam no banco.
9. Crie um segundo usuário e confirme que ele não enxerga os dados do primeiro.

Esse último teste é essencial para validar o isolamento por RLS.

## 6. Modo demonstração

A tela de login possui **Entrar no modo demonstração**. Nesse modo, os dados continuam sendo armazenados localmente no navegador e nunca são misturados com as contas reais do Supabase.

## Segurança implementada

- nenhuma senha é armazenada pelo frontend;
- autenticação delegada ao Supabase Auth;
- chave `service_role` não é utilizada no navegador;
- RLS por `auth.uid()`;
- políticas separadas de SELECT, INSERT, UPDATE e DELETE;
- `user_id` indexado nas tabelas financeiras;
- constraints no banco para tipos, status e valores;
- exclusão em cascata dos dados quando a conta de autenticação é removida;
- sessão gerenciada pelo SDK oficial do Supabase.

## Estrutura principal da V2

```text
src/
├── contexts/
│   ├── AuthContext.tsx
│   └── FinanceContext.tsx
├── lib/
│   └── supabase.ts
├── services/
│   ├── databaseService.ts
│   └── storageService.ts
├── pages/
│   ├── Login.tsx
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   └── ...
supabase/
└── migrations/
    └── 001_initial_schema.sql
```

## Próxima etapa sugerida

Depois de validar a V2 com duas ou mais contas, a próxima fase é a V3 comercial: painel administrativo da Web Kivora, planos, assinatura, cobrança e controles de produto.
