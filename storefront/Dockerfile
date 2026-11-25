# The production build prerenders pages with data from the Shop API, so the backend must be reachable while
# building: pass VENDURE_SHOP_API_URL as a build argument (see docker-compose.prod.yml).
FROM node:24-bookworm-slim AS build
WORKDIR /app
ARG VENDURE_SHOP_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG ASSET_HOSTNAME
ENV VENDURE_SHOP_API_URL=$VENDURE_SHOP_API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL ASSET_HOSTNAME=$ASSET_HOSTNAME NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./
USER node
EXPOSE 3001
CMD ["npx", "next", "start", "--port", "3001"]
