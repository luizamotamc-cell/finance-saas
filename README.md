# Caixa: SaaS de gestão financeira

![CI](https://github.com/luizamotamc-cell/finance-saas/actions/workflows/ci.yml/badge.svg)

Aplicação full stack para controle financeiro pessoal: cadastro e login, contas, categorias, transações e um dashboard com gráficos.

> **Projeto em desenvolvimento.** A API e o front têm testes automatizados que rodam a cada envio (veja [Testes](#testes)), mas ainda é um beta: use-o junto com os seus próprios registros. Se encontrar algum erro, abra uma *issue*.

## Funcionalidades

- Cadastro e login com JWT (access token de 15 minutos e refresh token de 7 dias, com rotação)
- Cada usuário vê apenas os próprios dados (coberto por testes automatizados)
- Limite de tentativas: 5 por minuto no login e no cadastro, por IP
- Contas (conta corrente, carteira, cartão de crédito, poupança) com saldo calculado
- Categorias de receita e despesa, personalizáveis (com cor)
- Transações: criar, editar, excluir, filtrar por mês, conta, categoria e tipo, com paginação
- Dashboard: saldo total, receitas e despesas do mês, gastos por categoria e comparativo dos últimos 6 meses
- Valores guardados em **centavos (inteiro)**, para evitar erros de arredondamento

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Front-end | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, React Hook Form, Zod, Recharts |
| Back-end | NestJS 10, TypeScript, Prisma, Passport JWT, class-validator, Swagger |
| Banco de dados | PostgreSQL 16 |
| Testes | Jest e Supertest (API), Vitest (front) |
| Infraestrutura | Docker e Docker Compose, GitHub Actions (CI) |

## Estrutura do projeto

```
finance-saas/
├── docker-compose.yml
├── .env.example
├── README.md
├── .github/workflows/ci.yml   # testes a cada push
└── apps/
    ├── api/                  # NestJS + Prisma
    │   ├── prisma/schema.prisma
    │   ├── test/             # testes e2e (isolamento, regras, auth, limite)
    │   └── src/
    │       ├── auth/
    │       ├── accounts/
    │       ├── categories/
    │       ├── transactions/
    │       ├── dashboard/
    │       └── common/
    └── web/                  # React + Vite
        └── src/
            ├── components/
            ├── features/     # auth, dashboard, transactions, accounts, categories
            └── lib/          # cliente da API, autenticação, formatação
```

## Como rodar

### Opção 1: com Docker (mais simples)

Pré-requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop).

```bash
cp .env.example .env     # preencha os segredos (gere com: openssl rand -hex 32)
docker compose up --build
```

- Aplicação: http://localhost:8080
- API: http://localhost:8080/api (a API e o banco não ficam expostos direto: só o nginx, na porta 8080)
- Documentação (Swagger): http://localhost:8080/api/docs

Os dois segredos do `.env` são obrigatórios: sem eles o Docker se recusa a subir.

Para parar: `Ctrl + C` e depois `docker compose down`. Isso mantém os dados. Para apagar também os dados do banco: `docker compose down -v`.

### Opção 2: sem Docker (Node.js e PostgreSQL instalados)

Pré-requisitos: [Node.js](https://nodejs.org) 20 ou superior e [PostgreSQL](https://www.postgresql.org/download/) 14 ou superior.

**1. Crie o banco de dados**

```sql
CREATE DATABASE finance;
```

**2. Configure e rode a API**

Dentro de `apps/api`, crie um arquivo chamado `.env` com o conteúdo abaixo. Troque `SUASENHA` pela senha do seu PostgreSQL.

```env
DATABASE_URL="postgresql://postgres:SUASENHA@localhost:5432/finance?schema=public"
JWT_ACCESS_SECRET="troque-por-um-segredo-longo-1"
JWT_REFRESH_SECRET="troque-por-um-segredo-longo-2"
CORS_ORIGIN="http://localhost:5173"
PORT=3000
```

Depois, no terminal:

```bash
cd apps/api
npm install
npx prisma migrate dev --name init    # cria as tabelas
npm run start:dev
```

**3. Rode o front-end** (em outro terminal)

```bash
cd apps/web
npm install
npm run dev
```

Acesse http://localhost:5173. O Vite encaminha as chamadas de `/api` para a API na porta 3000.

> **Windows:** se o PowerShell bloquear o `npm` com a mensagem "a execução de scripts foi desabilitada", use o **Prompt de Comando (cmd)** ou rode `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

## Testes

Os testes da API usam um banco PostgreSQL **separado** (eles criam usuários de verdade). Com o Docker rodando:

```bash
docker run -d --name finance-test-db -p 5433:5432 \
  -e POSTGRES_USER=finance -e POSTGRES_PASSWORD=finance -e POSTGRES_DB=finance_test \
  postgres:16-alpine

cd apps/api
npm install
DATABASE_URL="postgresql://finance:finance@localhost:5433/finance_test?schema=public" npx prisma db push
npm run test:e2e
```

No PowerShell, defina a variável antes: `$env:DATABASE_URL="postgresql://finance:finance@localhost:5433/finance_test?schema=public"; npx prisma db push`.

Front-end: `cd apps/web && npm install && npm test`.

O que está coberto: isolamento entre usuários, saldo das contas, validações, dashboard na virada de mês e de ano, autenticação (rotação do refresh token, logout) e o limite de tentativas. O GitHub Actions roda tudo a cada `push`.

## Variáveis de ambiente (API)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão com o PostgreSQL |
| `JWT_ACCESS_SECRET` | Segredo do token de acesso |
| `JWT_REFRESH_SECRET` | Segredo do refresh token (diferente do anterior) |
| `CORS_ORIGIN` | Origem permitida do front-end (separe várias por vírgula) |
| `PORT` | Porta da API (padrão: 3000) |

Nunca versione o arquivo `.env`: ele contém senhas e segredos.

## Principais rotas da API

Todas começam com `/api`. Exceto cadastro, login e refresh, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cria usuário (e já cria a conta "Carteira" e categorias padrão) |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Renova os tokens |
| POST | `/auth/logout` | Encerra a sessão |
| GET | `/auth/me` | Dados do usuário logado |
| GET, POST, PATCH, DELETE | `/accounts` | Contas |
| GET, POST, PATCH, DELETE | `/categories` | Categorias |
| GET, POST, PATCH, DELETE | `/transactions` | Transações (filtros: `from`, `to`, `accountId`, `categoryId`, `type`, `page`, `limit`) |
| GET | `/dashboard/summary?month=YYYY-MM` | Resumo do mês e série dos últimos 6 meses |

A documentação interativa completa fica em `/api/docs`.

## Limitações conhecidas

- Há um único refresh token por usuário: entrar em outro dispositivo encerra a sessão do anterior.
- Os tokens ficam no `localStorage`, que é vulnerável a XSS. Em produção, considere cookie `httpOnly`.
- O Docker usa `prisma db push`. Em produção, versione as migrations e use `prisma migrate deploy`.
- O limite de tentativas fica na memória da API e é por IP. Com várias instâncias da API ou atrás de outro proxy, ele precisa de ajuste (por exemplo, Redis).
- Ainda não há recuperação de senha, nem exportação e exclusão dos dados pelo próprio usuário.

## Próximos passos

- [x] Testes automatizados e CI com GitHub Actions
- [x] Limite de tentativas no login e no cadastro
- [ ] Recuperação de senha
- [ ] Exportar e excluir os próprios dados (LGPD)
- [ ] Orçamentos e metas por categoria
- [ ] Transações recorrentes
- [ ] Importação de extratos (OFX e CSV)
- [ ] Planos pagos e cobrança (Stripe)
- [ ] Deploy

## Licença

Distribuído sob a licença MIT. Veja o arquivo `LICENSE`.