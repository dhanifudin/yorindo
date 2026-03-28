# Stage 1: Install production dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

# Stage 2: Build the application
FROM node:24-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# Stage 3: Production runner
FROM node:24-alpine AS runner
WORKDIR /app

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S yorindo -u 1001
RUN mkdir -p /app/uploads && chown -R yorindo:nodejs /app/uploads

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/openapi.yaml ./openapi.yaml
COPY --chown=yorindo:nodejs uploads/.gitignore ./uploads/.gitignore

USER yorindo
EXPOSE 3000
CMD ["node", "dist/main.js"]
