# One image, one process: the API serves the built front end.
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# better-sqlite3 needs its build toolchain only if no prebuild matches.
RUN npm ci --omit=dev --workspace @gummybears/api --include-workspace-root
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist
# The bookings live here. Mount a volume on it.
VOLUME /app/apps/api/data
ENV PORT=4000 DATABASE_URL=/app/apps/api/data/gummybears.db
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
