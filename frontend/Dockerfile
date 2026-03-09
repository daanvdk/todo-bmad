FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json .
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:22-alpine AS development
WORKDIR /app
RUN apk add --no-cache curl
COPY --chown=node:node --from=base /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "--port", "5173"]

FROM base AS build
COPY . .
RUN npm run build

FROM caddy:2-alpine AS production
RUN apk add --no-cache curl
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
USER nobody
EXPOSE 5173
