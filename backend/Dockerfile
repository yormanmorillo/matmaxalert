FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Instalación determinista: el lockfile manda y no se copia node_modules del host.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src ./src

# Los archivos generados en local pueden venir con modo 600; el usuario `node`
# debe poder leerlos dentro de la imagen.
RUN chmod -R a+rX /app/src

# El proceso no necesita root.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "src/index.js"]
