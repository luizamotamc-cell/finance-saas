# Contêiner único: a API NestJS também entrega o site React.
# Serve para hospedagens com um serviço só (como o Render). No Docker Compose do dia a dia
# continuam valendo os Dockerfiles de apps/api e apps/web.

# --- 1. compila o site ---
FROM node:20-alpine AS web
WORKDIR /web
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web ./
RUN npm run build

# --- 2. compila a API ---
FROM node:20-alpine AS api
RUN apk add --no-cache openssl
WORKDIR /app
COPY apps/api/package*.json ./
COPY apps/api/prisma ./prisma
RUN npm ci
COPY apps/api ./
RUN npm run build

# --- 3. imagem final ---
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production \
    WEB_DIST_DIR=/app/public
COPY --from=api /app/node_modules ./node_modules
COPY --from=api /app/dist ./dist
COPY --from=api /app/prisma ./prisma
COPY apps/api/package*.json ./
COPY --from=web /web/dist ./public
USER node
EXPOSE 3000
# O db push usa DIRECT_URL (conexão direta, necessária no Neon) quando ela existir; senão, DATABASE_URL.
# Ele cria/atualiza as tabelas e recusa mudanças que apagariam dados (nesse caso o contêiner para, sem perda).
CMD ["sh", "-c", "DATABASE_URL=\"${DIRECT_URL:-$DATABASE_URL}\" npx prisma db push --skip-generate && node dist/main.js"]
