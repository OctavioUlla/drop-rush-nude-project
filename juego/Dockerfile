# Imagen del servidor de Drop Rush (sección 10): un solo proceso de Node sirve el juego y el tiempo real.
# Se construye desde la raíz del repositorio, porque el juego usa ../design-system:
#   docker build -f juego/Dockerfile -t drop-rush .
#   docker run -p 3000:3000 drop-rush

FROM node:22-alpine AS build
WORKDIR /app
COPY design-system ./design-system
COPY juego/package.json juego/package-lock.json ./juego/
RUN cd juego && npm ci
COPY juego ./juego
RUN cd juego && npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app/juego
COPY --from=build --chown=node:node /app/juego ./
# La presentación se sirve sin compilar, junto con el design system que importa.
COPY --chown=node:node design-system /app/design-system
COPY --chown=node:node presentacion /app/presentacion
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server/index.js", "--produccion"]
