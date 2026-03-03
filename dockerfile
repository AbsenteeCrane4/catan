# 1. Base Image - Install dependencies and prepare for build
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS deps-prod
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# 2. Builder - Rebuild the source code
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build 

# 3. Runner - Production image
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Next.js build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Server.js output
COPY --from=builder /app/dist-server/server.js ./server.js

EXPOSE 3000

CMD ["node", "server.js"]