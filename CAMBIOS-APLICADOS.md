# Cambios aplicados — Alertool (12-nov-2026)

> **Publicado en GitHub:** las IPs internas y las credenciales históricas de este documento están redactadas.

Este documento registra qué se corrigió tras la auditoría
[`AUDITORIA-ALERTOOL-2026-11-12.md`](AUDITORIA-ALERTOOL-2026-11-12.md), cómo se
verificó y qué queda pendiente por decisión o ventana de mantenimiento.

## Estado final

| Comprobación | Resultado |
|---|---|
| Servicio | **Arriba** en `http://192.0.2.10/` |
| Contenedores | `frontend`, `backend`, `mongodb` → **healthy**, `restart: unless-stopped` |
| Base de datos | Intacta: 3 usuarios, 107 alertas, 6 configs, 5 prensas, 3 áreas |
| Puertos publicados | **22 y 80** (y nada más) |
| Docker API `:2375` | **Cerrada** (probada desde la LAN) |
| Dockhand `:3320` | Detenido |
| Backend directo `:3000` | No publicado |
| MongoDB `:27017` | No publicado; contraseña rotada |
| Admin | Contraseña rotada (`********` ya no funciona) |
| JWT / kiosko | Secretos nuevos de 64 hex |
| Backups | Diario 02:15, retención 14 días, primer dump verificado |
| Monitor | Cron cada 5 min reinicia contenedores `unhealthy` |

Las credenciales nuevas están en `/root/alertool/ADMIN_CREDENTIALS.txt`
(`chmod 600`) y en `backups/credenciales-produccion.txt` del equipo local. No se
escriben en este documento.

---

## 1. Disponibilidad (C1)

- `docker-compose.yml`: `restart: unless-stopped` en los 3 servicios,
  `healthcheck` de Mongo/backend/frontend y `depends_on: condition: service_healthy`.
- `backend/src/config/db.js`: reintentos con backoff en lugar de `process.exit(1)`
  si Mongo tarda en arrancar.
- `backend/src/index.js`: cierre ordenado con `SIGTERM`/`SIGINT`.
- Backup automático + verificación de salud en el servidor.

**Verificado:** un `docker compose up -d` recrea Mongo → espera `healthy` → arranca
backend → espera `healthy` → arranca frontend.

## 2. Seguridad de infraestructura (C2, C3, C4, C5, C10)

| Antes | Ahora |
|---|---|
| Docker API `0.0.0.0:2375` sin auth | `/etc/docker/daemon.json` solo socket UNIX; puerto cerrado |
| `dockhand` con `docker.sock` rw en `:3320` | contenedor detenido y sin restart |
| Mongo `27017` publicado, `admin/********` | sin `ports`; contraseña aleatoria de 48 hex |
| `JWT_SECRET=********` | secreto aleatorio de 64 hex en `.env` (600) |
| admin/******** | contraseña aleatoria de 20 caracteres; login viejo → 401 |
| `:3000` publicado | backend solo en la red interna de Docker |

**Verificado desde la LAN:** `2375`, `3000`, `27017` y `3320` cerrados; solo 22/80.

## 3. Autenticación y permisos (C7, A1, A2, A3, A6, A7, M12, M19)

- `backend/src/middleware/auth.js`
  - JWT recargado desde la BD en cada request → rol/permisos revocados aplican al
    instante.
  - `authenticateKiosk`: exige `X-Kiosk-Key` para escrituras de alertas (nginx la
    inyecta; no viaja en el bundle).
  - `requireSection(...)`: los supervisores solo acceden a sus secciones.
  - 401 para token inválido (antes 403), 403 solo para permisos.
- `backend/src/routes/users.js`
  - `GET /users` público devuelve solo `username, role, shiftId, assignedPressIds`;
    con sesión autorizada devuelve además `allowedSections`.
  - Supervisores ya no fallan al editar: el frontend envía solo el diff y el
    backend acepta `role` sin cambios.
  - No se puede borrar el último admin ni a uno mismo; se protege el cambio de rol.
- `backend/src/routes/roles.js`: roles core no editables; no se borra un rol con
  usuarios.
- `backend/src/routes/auth.js`: login con comparación de tiempo constante,
  `/auth/me`, JWT 12 h, rate limit 10/15 min.
- `services/api.ts`: solo 401 cierra sesión; un 403 muestra error y **no** expulsa.
- `contexts/AuthContext.tsx`: la sesión se valida contra `/api/auth/me`; ya no se
  confía en `localStorage.user`.

**Verificado:** supervisor temporal sin secciones → `PUT /alert-config` 403,
`GET /users/:id` ajeno 403; usuario eliminado después. Login nuevo 200, viejo 401.

## 4. Alertas: integridad y SOS (C8, C9, M3, M4, M14)

- `backend/src/routes/alerts.js`
  - Máquina de estados `ACTIVE→WORKING→RESOLVED|CANCELLED`; reabrir devuelve 409.
  - `statusHistory` con autor y fecha.
  - Duplicado activo por prensa+tipo → 409 (incluye SOS doble).
  - SOS solo lo gestiona `admin`/`supervisor`; un kiosko recibe 403.
  - `limit` por defecto 2000, máximo 10 000; fechas validadas.
- `hooks/useSosAlarm.ts`: el SOS sigue sonando hasta `RESOLVED`/`CANCELLED`
  (antes se silenciaba al pasar a `WORKING`); silencio por id, no global.
- `components/SosAlarmBanner.tsx`: muestra el SOS más reciente, contador `+N`,
  `role="alert"` y spacer para no tapar controles.
- `components/AlertCard.tsx` / `WatchAlertCard.tsx`: SOS bloqueado para roles de
  kiosko, reloj de antigüedad, toast si falla la actualización, timers con cleanup.
- `components/PressStatusGrid.tsx`: agrupa alertas por prensa (O(n) en vez de
  O(n²)), incluye SOS en las acciones, confirma antes de resolver varias y avisa
  de fallos.

**Verificado:** crear 201, duplicado 409, `ACTIVE→CANCELLED` 200,
`CANCELLED→ACTIVE` 409, borrar 200. E2E WebSocket: `connect | created | deleted`.

## 5. Configuración de botones (C8)

- `backend/src/routes/alertConfig.js`: se eliminó `session.withTransaction`
  (fallaba en Mongo standalone). Ahora `bulkWrite` con upsert + borrado de las que
  ya no están, sin ventana de colección vacía.
- `PATCH /:id` usa el `id` de negocio, no el ObjectId.
- `AlertConfigForm`: bloquea el nombre reservado `SOS`, bloquea renombrar un tipo
  con alertas abiertas y actualiza el estado de forma inmutable.

**Verificado:** `PUT /api/alert-config` con las 6 configs → **200** (antes 500).

## 6. Rendimiento y datos (A5, M15)

- `models/index.js`: índices `{timestamp:-1}`, `{status,timestamp}`, `{pressId,status}`,
  `{type,status}`, `{areaId}`. **Verificado en Mongo:** 5 índices además de `_id`.
- `GET /api/alerts` acota a 2000 por defecto; el frontend pide esa ventana.
- Reportes: fechas en hora local, validación de rango y CSV con `Blob` + BOM
  (antes `encodeURI` truncaba con `#` y rompía tildes en Excel).

## 7. UI y build reproducible (A8, A9, A10, A11, A13, A15, M21, M25, M26)

- Una alerta **activa siempre se muestra** aunque su tipo esté deshabilitado o se
  le haya quitado el rol (Supervisor, Técnico, Driver, Watch y mapa).
- `DataStateBanner`: si falla la carga o el socket, aviso rojo con reintento; la
  home ya no dice "Conectado" si no lo está.
- `ErrorBoundary` global con recarga/reinicio de sesión.
- Tailwind **compilado** (43 KB CSS): fuera `cdn.tailwindcss.com`, Google Fonts y
  el importmap de `esm.sh`. La app ya no depende de Internet para verse.
- `index.html` limpio (sin `/env.js` ni `/index.css` fantasma), `lang="es"`,
  manifest e iconos 192/512 reales, service worker registrado en producción.
- Tema: `theme-init.js` + `ThemeContext` respetan la preferencia del sistema y no
  la sobrescriben.
- `tsconfig` con `vite/client`, `@types/react` instalados y `server.ts` fuera;
  `npm run lint` pasa con **0 errores** (antes 10).
- `node_modules` reparado con `npm ci`; build reproducible (`npm run check`).

**Verificado en Chromium headless:** home con 5 roles, login admin, pestañas
Usuarios/Permisos/Reportes y panel de prensa con SOS y botones; **0 errores de
consola**.

## 8. Operación (A12, M22, M23)

- `docker-compose.yml`: imágenes con tag fijo (`mongo:7.0`, `nginx:1.27-alpine`,
  `node:20-alpine`), sin bind-mount de `dist`, límites de memoria y logs rotados.
- `backend/Dockerfile`: `npm ci --omit=dev`, `USER node`, healthcheck,
  `chmod` para que el usuario no-root lea el código.
- `Dockerfile.frontend`: nginx + `dist` + plantilla envsubst.
- `nginx.conf.template`: CSP y cabeceras, timeouts de WebSocket, `X-Forwarded-*`,
  `client_max_body_size` y `X-Kiosk-Key`.
- Backups diarios y monitor de salud en el servidor.

## 9. Limpieza

Limpieza adicional (segunda pasada): `components/Navbar.tsx` (no se importaba
en ningún sitio), `backend/README.md` (desactualizado), constantes e iconos sin
uso en `constants.tsx` (`ALERT_STATUS_BADGE_COLORS`, `INITIAL_PRESS_BUTTON_CONFIG`,
`XCircleIcon`, `PaperAirplaneIcon`, `WarningIcon`), backups de código antiguos y
capturas duplicadas. `public/logo.png` pasó de 1024 px/384 KB a 512 px/59 KB.

Eliminados: `server.ts` y `server/models.ts` (backend duplicado), `env.js`,
`check_env.js`, `metadata.json`, `database.sql` (binario), `alertool.tar.gz`,
`manifest.json`/`sw.js` de raíz (movidos a `public/`), `.env.local`,
`migrated_prompt_history/` (contenía claves de Supabase), `Photobooth/`, 82
archivos `._*` de macOS y `.DS_Store`. `.gitignore`/`.dockerignore` reales.

**Aclaración:** Alertool **nunca usó Supabase en runtime**. `env.js` no se
importaba desde ningún módulo, el importmap de `@supabase/supabase-js` era
vestigial (Vite ya empaqueta React) y `migrated_prompt_history/` era el historial
de prompts de la plantilla de AI Studio, no una integración. Tras la limpieza no
queda ninguna referencia en código, dependencias ni bundle; el backend es
Express + Mongoose sobre MongoDB.

> `migrated_prompt_history/` incluía `SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD` y
> `SECRET_KEY_BASE` de un Supabase. Si ese proyecto sigue vivo, **rota esas
> claves**; el archivo ya no está en el árbol.

---

## Verificación end-to-end ejecutada

```
health                200 {"status":"ok","database":"connected"}
login admin (nueva)   200
login admin (vieja)   401
PUT alert-config      200
POST alerta           201
POST duplicada        409
PATCH CANCELLED→ACTIVE 409
DELETE alerta         200
GET alerts            total 107, limit aplicado
POST backend sin key  401 "Dispositivo no autorizado"
supervisor sin sección 403
índices alerts        timestamp, status+timestamp, pressId+status, type+status
socket.io (nginx)     200 handshake
E2E WebSocket         connect | alert:created | alert:deleted → PASS
Browser E2E           0 errores de consola
Backup                mongo-20261112-142038.gz (6.2 KB, 107 alertas)
```

---

## Pendiente (no aplicado en esta ventana)

| Tema | Motivo | Recomendación |
|---|---|---|
| **TLS/HTTPS** | No hay certificado ni dominio; un autofirmado rompería los kioskos sin CA instalada | Montar 443 con CA interna o Let's Encrypt y redirigir 80 |
| **Firewall host** | Riesgo de perder SSH al aplicar reglas a ciegas | `ufw`/nft con 22/80/443 desde la LAN + regla de rollback |
| **SSH root con contraseña** | Sin clave instalada, desactivarla bloquearía el acceso | Instalar clave, `PermitRootLogin prohibit-password`, `fail2ban` |
| **Identidad por dispositivo** | La clave de kiosko es compartida (la inyecta nginx) | Token por dispositivo o PIN de turno |
| **Auth de Socket.io** | El canal es de solo lectura y va tras nginx | Handshake con token y salas por rol/prensa |
| **Tests/CI** | No existía suite; se priorizó el despliegue | `npm run check` + E2E de los 5 portales en CI |
| **`typeId` inmutable** | Cambio de modelo con migración de datos | Añadir `typeId` a `Alert` y migrar |
| **Reportes en servidor** | Con 107 alertas es suficiente | Agregados/paginación cuando crezca el histórico |
| **Retención de alertas** | No se borra histórico | TTL/archivo de resueltas > N meses |


---

## 10. Segunda iteración — auditoría externa (13-nov-2026)

| Hallazgo | Estado | Cambio |
|---|---|---|
| Clave de kiosko compartida (SOS/notas suplantables) | **Parcial** | Un SOS ya no se puede tocar sin `admin`/`supervisor` (403 en notas y estado, verificado). La clave sigue siendo compartida: requiere VLAN/lista de IPs o token por dispositivo. |
| Sin HTTPS | **Pendiente** | Documentado en `SECURITY.md`; no se activa TLS sin CA instalada en los kioskos. |
| Sirena puede no sonar | **Mitigado** | Indicador `🔇/🔊` en todas las pantallas + guía de Chrome kiosko. Sigue sin ser un sistema certificado; hace falta sirena física. |
| Dependencias vulnerables | **Resuelto** | Backend de 10 (3 críticas) a **0**; frontend de 7 a **0**. Express 4.22.3, Mongoose 8.24.9, Socket.io 4.8.4, React Router 7.18.5 y overrides de `ws`/`qs`/`body-parser`/`proxy-addr`. |
| 429 puede bloquear un SOS | **Resuelto** | Límite general 600/min; POST de alertas 120/min; **SOS exento**. Verificado: 120 POST → 404, el 121 → 429, SOS → 404 (no 429). |
| Carga de 2000 alertas por reconexión | **Resuelto para kioskos** | Kioskos: activas + últimas 24 h (`includeActive`); admin/supervisor conservan 2000 para reportes. Verificado: 2 activas antiguas siguen visibles con 0 alertas en la ventana de 24 h. |
| Usuarios admin/supervisor listados sin login | **Resuelto** | `GET /api/users` anónimo solo devuelve `technical`/`driver`/`press`. Verificado: `jose`, `driver1`; sin `admin`. |
| Un toque resuelve la alerta | **Resuelto** | Resolver exige mantener presionado 800 ms; probado con una alerta temporal que pasó a `RESOLVED` solo con el long-press. |
| SOS sin reintento | **Resuelto** | 3 intentos con backoff, refresco de estado y botón persistente "Reintentar SOS". Probado con POST abortado: aviso visible y 0 SOS creados. |
| Sin tests/CI | **Resuelto** | `backend/test/alertStatus.test.js` (5 tests) + `.github/workflows/ci.yml` con typecheck, build, tests y `npm audit --audit-level=high`. |

### Verificación de esta iteración

```
npm run check (frontend)                  OK
npm test (backend)                        5/5
npm audit --audit-level=high              frontend 0, backend 0
GET /api/users anónimo                    jose, driver1 (sin admin/supervisor)
GET alerts includeActive + 24h             2 activas antiguas, 0 en ventana
PATCH SOS notas/estado sin JWT            403 (antes 200)
POST 120 alertas / 121 / SOS              404 / 429 / 404 (SOS exento)
Long-press en alerta WORKING              RESOLVED
SOS con POST abortado                     aviso + reintento, 0 SOS creados
Navegador (React Router 7)                home, login, admin, prensa y técnico sin errores
```

---

## Rollback

Las imágenes anteriores están etiquetadas y el compose previo respaldado:

```
/root/alertool-backups/pre-deploy-20261112/docker-compose.yml.bak
alertool-backend:pre-fix
alertool-frontend:pre-fix
/root/alertool-backups/pre-fix-20261112/mongo-pre-fix.gz
```

Rollback solo de código (mantiene datos y compose nuevo):

```bash
cd /root/alertool
docker tag alertool-backend:pre-fix alertool-backend
docker tag alertool-frontend:pre-fix alertool-frontend
docker compose up -d --no-build backend frontend
```

La contraseña de Mongo y la del admin son las nuevas; el código antiguo las usa
sin problema porque las toma de `.env`.
