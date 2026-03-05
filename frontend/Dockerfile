FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json .
RUN --mount=type=cache,target=/root/.npm npm ci

FROM base AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "--port", "5173"]

FROM base AS build
COPY . .
RUN npm run build

FROM caddy:2-alpine AS production
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 5173
