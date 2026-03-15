# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

COPY vibe-architect-ui/package.json vibe-architect-ui/package-lock.json ./vibe-architect-ui/
RUN cd vibe-architect-ui && npm ci

COPY vibe-architect-ui ./vibe-architect-ui
RUN cd vibe-architect-ui && npm run build


FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S app && adduser -S -G app app && chown app:app /app

COPY --from=build --chown=app:app /app/vibe-architect-ui/dist ./dist
COPY --chown=app:app server.mjs ./server.mjs

# Run as non-root for container hardening; do any privileged setup before this.
USER app

EXPOSE 8080

# The server listens on $PORT (Cloud Run convention).
CMD ["node", "server.mjs"]
