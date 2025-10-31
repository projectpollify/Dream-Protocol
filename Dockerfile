# Dream Protocol - Identity Module Dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/01-identity/package.json ./packages/01-identity/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/01-identity ./packages/01-identity
COPY tsconfig.json ./

# Build
RUN pnpm --filter @dream/identity build

# Production image
FROM node:18-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy built application
COPY --from=base /app/packages/01-identity/dist ./dist
COPY --from=base /app/packages/01-identity/package.json ./
COPY --from=base /app/node_modules ./node_modules

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/index.js"]
