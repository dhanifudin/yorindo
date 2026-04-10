# Stage 1: Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY scripts/ ./scripts/
RUN npm ci

# Stage 2: Build the application
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Sentry DSN is baked into the client bundle at build time
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
# MSW mocks — defaults to 'false' (safe for production/demo).
# Set to 'true' only for local preview builds:
#   docker build --build-arg NEXT_PUBLIC_ENABLE_MOCKS=true ...
ARG NEXT_PUBLIC_ENABLE_MOCKS=false
ENV NEXT_PUBLIC_ENABLE_MOCKS=$NEXT_PUBLIC_ENABLE_MOCKS
# API URL — baked into Next.js rewrites at build time.
ARG API_URL
ENV API_URL=$API_URL
RUN npm run build

# Stage 3: Production runner (Next.js standalone output)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
