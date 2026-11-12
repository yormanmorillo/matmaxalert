# Alertool

Sistema de alertas y SOS en tiempo real para planta industrial: paneles de operador de prensa, técnicos, montacarguistas y supervisores, con mapa de planta, reportes y avisos por WebSocket.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind (compilado, sin CDN) |
| Backend | Node 20 + Express + Mongoose + Socket.io |
| Base de datos | MongoDB 7 (sin puerto publicado) |
| Servido | nginx 1.27 (proxy `/api` y `/socket.io`) |
| Despliegue | Docker Compose |

## Estructura

```
.
├── App.tsx, index.tsx, index.css      # entrada SPA
├── components/  pages/  contexts/     # UI y estado
├── hooks/  services/  types.ts  constants.tsx
├── backend/src/                       # API, modelos, socket, seed
│   ├── config/ middleware/ models/ routes/ socket/
│   └── index.js
├── nginx.conf.template                # nginx + CSP + claves de kiosko
├── nginx/security-headers.conf
├── Dockerfile.frontend / backend/Dockerfile
├── docker-compose.yml
└── .env.example                       # plantilla de producción
```

## Desarrollo local

```bash
# Requisitos: Node >= 20, MongoDB local
npm ci
cd backend && npm ci && cd ..

cp backend/.env.example backend/.env     # ajustar Mongo/JWT
npm run dev                              # Vite en :5173 (proxy /api → :3000)
cd backend && npm run dev                # API en :3000
```

Comprobaciones:

```bash
npm run lint     # tsc --noEmit
npm run check    # typecheck + build de producción
```

> En este entorno `NODE_ENV=production` está exportado por defecto; si `npm ci`
> omite devDependencies, usa `npm ci --include=dev`.

## Producción

El servidor de producción es `192.0.2.10` y el proyecto vive en `/root/alertool`.

### Variables de entorno

El compose lee `.env` (nunca versionado, `chmod 600`):

```bash
cp .env.example .env
# MONGO_USER, MONGO_PASS, MONGODB_URI, JWT_SECRET, KIOSK_API_KEY,
# CORS_ORIGIN, ADMIN_INITIAL_PASSWORD, ADMIN_USERNAME, SEED_ON_START
```

Genera secretos con `openssl rand -hex 32`. En el primer arranque, si la base no
tiene ningún admin, se crea con `ADMIN_INITIAL_PASSWORD` (no hay contraseña por
defecto).

### Despliegue

```bash
# Local: construir el frontend
npm ci --include=dev
npm run check
tar czf /tmp/alertool-dist.tar.gz -C . dist

# Servidor
scp /tmp/alertool-dist.tar.gz root@192.0.2.10:/root/
ssh root@192.0.2.10
cd /root/alertool
rm -rf dist && tar xzf /root/alertool-dist.tar.gz -C /root/alertool

docker compose build frontend && docker compose up -d frontend   # solo UI
docker compose build backend  && docker compose up -d backend    # solo API
docker compose up -d --build                                     # todo
```

El backend instala dependencias con `npm ci` dentro de la imagen; el frontend se
compila fuera y la imagen solo empaqueta `dist` + nginx.

### Verificación

```bash
curl -s http://192.0.2.10/api/health          # {"status":"ok",...}
docker compose ps                               # los 3 healthy
docker compose logs -f --tail=100 backend
```

### Operación

| Elemento | Dónde |
|---|---|
| Panel | `http://192.0.2.10/` |
| Credenciales admin | `/root/alertool/ADMIN_CREDENTIALS.txt` (`chmod 600`) |
| Backups Mongo | `/root/alertool-backups/mongo/` (diario 02:15, retención 14 días) |
| Cron backup | `/etc/cron.d/alertool-backup` |
| Monitor salud | `/etc/cron.d/alertool-health` (reinicia contenedores `unhealthy`) |
| Rollback imágenes | tags `alertool-backend:pre-fix`, `alertool-frontend:pre-fix` |

Restaurar un backup:

```bash
docker cp /root/alertool-backups/mongo/mongo-YYYYMMDD-HHMMSS.gz alertool-mongodb-1:/tmp/r.gz
docker exec alertool-mongodb-1 mongorestore --gzip --archive=/tmp/r.gz \
  -u admin -p "$MONGO_PASS" --authenticationDatabase admin --drop
```

## Seguridad

- **Red**: solo se publica `80`. MongoDB y la API viven en la red interna de
  Docker; no hay puertos `27017`/`3000` expuestos.
- **Sesión**: JWT HS256 de 12 h; el usuario y sus permisos se recargan de la BD
  en cada request (un rol revocado aplica al instante).
- **Permisos**: `admin` total; `supervisor` solo las secciones de
  `allowedSections`; los kioskos no inician sesión.
- **Escrituras de kiosko**: nginx inyecta `X-Kiosk-Key` en `/api/alerts`; el
  backend rechaza escrituras directas (probado: 401 sin cabecera). El backend no
  está publicado al host.
- **SOS**: solo `admin`/`supervisor` pueden pasar un SOS a `WORKING`/cerrarlo; la
  sirena sigue hasta `RESOLVED`/`CANCELLED`.
- **Cabeceras**: CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` y
  `Permissions-Policy` en nginx.
- **Rate limit**: login 10/15 min por IP+usuario; API 300/min por IP.

### Pendiente de seguridad (requiere decisión/ventana)

1. **TLS**: no hay certificado; el tráfico va en claro dentro de la LAN. Montar
   443 con CA interna instalada en los kioskos (o Let's Encrypt con dominio).
2. **Firewall del host**: no hay `ufw`/reglas `drop`. Al no haber puertos
   publicados, la exposición es mínima, pero conviene limitar 22/80/443 a la LAN.
3. **SSH**: `PermitRootLogin yes` con contraseña. Migrar a clave + `fail2ban`
   (no se aplicó para no bloquear el acceso remoto).
4. **Identidad por dispositivo**: la clave de kiosko es compartida y la inyecta
   nginx. Un equipo de la LAN que abra el panel puede escribir. Para aislamiento
   real, token por dispositivo/PIN de turno.
5. **Socket.io**: el canal es de solo lectura y va tras nginx, pero no autentica
   el handshake; cualquiera en la LAN recibe el broadcast de alertas.
6. **Tests/CI**: no hay suite automatizada; el workflow recomendado es
   `npm run check` + E2E de los 5 portales en CI.
7. **Tipos de alerta estables**: `Alert.type` guarda el nombre visible. Renombrar
   se bloquea si hay alertas abiertas, pero lo definitivo es un `typeId` inmutable.
8. **Reportes**: el cliente carga hasta 2000 alertas; para históricos grandes,
   agregados y paginación en servidor.

## Notas

- La auditoría original y el registro de cambios están en
  `AUDITORIA-ALERTOOL-2026-11-12.md` y `CAMBIOS-APLICADOS.md`.
- `server.ts` (backend duplicado sin uso) y los restos de macOS fueron eliminados.
- **Alertool no usa Supabase.** Los restos encontrados (`env.js`, una entrada
  `@supabase/supabase-js` en el importmap y un historial de prompts con claves de
  un proyecto Supabase ajeno) eran de la plantilla original de AI Studio y no se
  importaban en ningún punto del runtime. Se eliminaron; el backend es Express +
  Mongoose sobre MongoDB, como confirma `/api/health`.
