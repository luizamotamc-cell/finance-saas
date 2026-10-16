# Caixa: SaaS de gestão financeira

Aplicação full stack para controle financeiro pessoal: cadastro e login, contas, categorias, transações e um dashboard com gráficos.

> **Projeto em desenvolvimento.** O código ainda não foi totalmente testado em execução. Se encontrar algum erro, abra uma *issue*.

## Funcionalidades

- Cadastro e login com JWT (access token de 15 minutos e refresh token de 7 dias, com rotação)
- Cada usuário vê apenas os próprios dados
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
| Infraestrutura | Docker e Docker Compose |

## Estrutura do projeto

```
finance-saas/
├── docker-compose.yml
├── .env.example
├── README.md
└── apps/
    ├── api/                  # NestJS + Prisma
    │   ├── prisma/schema.prisma
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
- API: http://localhost:3000/api
- Documentação (Swagger): http://localhost:3000/api/docs

Para parar: `Ctrl + C`. Para apagar também os dados do banco: `docker compose down -v`.

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
- Ainda não há testes automatizados, CI, limite de requisições (*rate limit*) nem recuperação de senha.

## Próximos passos

- [ ] Testes automatizados e CI com GitHub Actions
- [ ] Orçamentos e metas por categoria
- [ ] Transações recorrentes
- [ ] Importação de extratos (OFX e CSV)
- [ ] Planos pagos e cobrança (Stripe)
- [ ] Deploy

## Licença

Distribuído sob a licença MIT. Veja o arquivo `LICENSE`.
