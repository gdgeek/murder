# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy workspace root files for npm install
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

RUN npm ci --workspace=packages/shared --workspace=packages/server --ignore-scripts

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

# Build shared and server
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/server

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

RUN npm ci --workspace=packages/shared --workspace=packages/server --ignore-scripts --omit=dev

# Copy built output
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/server/dist ./packages/server/dist

EXPOSE 4000

CMD ["node", "packages/server/dist/app.js"]
