FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci

FROM base AS build

COPY . .

RUN npm run build

RUN npm prune --production && npm cache clean --force

FROM node:22-alpine AS development

WORKDIR /app

ENV NODE_ENV=development
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

USER node

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main"]
