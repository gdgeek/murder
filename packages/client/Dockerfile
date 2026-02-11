# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy workspace root files for npm install
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/client/package.json ./packages/client/

RUN npm ci --workspace=packages/shared --workspace=packages/client --ignore-scripts

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/client/ ./packages/client/

# Build shared and client
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/client

# Production stage
FROM nginx:alpine

COPY --from=build /app/packages/client/dist /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
