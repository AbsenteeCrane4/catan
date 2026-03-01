# 1. Base Image - Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2. Builder - Rebuild the source code
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# This now runs both `next build` AND `tsup server.ts`
RUN npm run build 

# 3. Runner - Production image
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Next.js build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Your newly compiled, standalone Socket.io server
COPY --from=builder /app/dist-server/server.js ./server.js

EXPOSE 3000

# Run the raw Node binary, no transpilers required
CMD ["node", "server.js"]