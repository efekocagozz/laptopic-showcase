# Vendure server and worker share one image; the compose file picks the command.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The compiled seed scripts need their data files next to them.
RUN npm run build \
    && cp src/seed/products.csv dist/seed/ && cp -r src/seed/assets dist/seed/ \
    && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production APP_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Vendure writes uploaded assets and (without SMTP) emails under static/, so the app user must own it.
COPY --from=build --chown=node:node /app/static ./static
RUN mkdir -p static/assets static/email/test-emails && chown -R node:node static
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
