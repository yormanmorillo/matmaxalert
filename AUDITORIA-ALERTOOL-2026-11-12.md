# Auditoría técnica — Alertool

> **Publicado en GitHub:** las IPs internas y las credenciales históricas de este documento están redactadas.

**Fecha:** 12-nov-2026 · **Alcance:** código local (`/home/alex/Proyectos/alertool`) + servidor `192.0.2.10` (root)
**Método:** lectura estática de las ~80 piezas de código propio, ejecución de `tsc`, y verificación en vivo del despliegue (SSH de solo lectura).
**No se modificó ningún archivo ni se arrancó la aplicación.** Solo se arrancó y volvió a parar el contenedor de Mongo para inspeccionar datos; el estado final es el mismo que al entrar.

> **Actualización 12-nov-2026:** este documento es el registro original de la auditoría. Las correcciones aplicadas, la verificación end-to-end y lo que queda pendiente están en [`CAMBIOS-APLICADOS.md`](CAMBIOS-APLICADOS.md).

---

## 0. Resumen para decidir en 5 minutos

| # | Qué pasa | Severidad |
|---|----------|-----------|
| 1 | **La aplicación lleva 3 semanas caída.** Los 3 contenedores (`frontend`, `backend`, `mongodb`) están `Exited (255)` desde el 15-oct 21:44, cuando se reinició el host. No tienen política de reinicio, así que no volvieron. Los datos están intactos. | 🔴 CRÍTICO |
| 2 | **La API de Docker está abierta sin autenticación** en `192.0.2.10:2375` (verificado desde mi equipo, sin credenciales). Cualquiera en la red puede crear un contenedor privilegiado y tomar el servidor como root. | 🔴 CRÍTICO |
| 3 | **El admin de producción sigue con `********`** (verificado contra el hash bcrypt de la BD) y el `JWT_SECRET` está escrito en el `docker-compose.yml`. | 🔴 CRÍTICO |
| 4 | **MongoDB está publicado en `0.0.0.0:27017`** con `admin/********`, y no hay firewall; SSH de root con contraseña está habilitado. | 🔴 CRÍTICO |
| 5 | **Guardar la configuración de botones de alerta falla siempre**: el código usa transacciones, pero Mongo corre standalone. Reproducido: `Transaction numbers are only allowed on a replica set member or mongos`. | 🔴 CRÍTICO (bug funcional) |
| 6 | **Cualquiera puede crear, tomar, resolver o cancelar alertas — incluido un SOS falso** (`POST`/`PATCH /api/alerts` sin autenticación). El "kiosco sin login" no tiene ninguna frontera de seguridad. | 🔴 CRÍTICO |
| 7 | **El SOS se silencia al tomar la alerta** (pasa a `WORKING` y la sirena/banner solo miran `ACTIVE`), y el operador de prensa puede cancelarlo con un clic. | 🔴 CRÍTICO (seguridad/safety) |
| 8 | **Un 403 legítimo ("sin permisos") borra la sesión y expulsa al login**; el frontend trata 401 y 403 igual. | 🟠 ALTO |
| 9 | **Las alertas activas desaparecen si se desactiva su tipo** o se le quita un rol en la configuración. | 🟠 ALTO |
| 10 | **El build no es reproducible**: `node_modules/.bin` son archivos de texto `XSym` de macOS (17 shims rotos), `npm run lint` falla con 8 errores y el `dist` no se puede reconstruir desde este árbol. | 🟠 ALTO |

**Lo bueno:** la arquitectura es razonable para el problema (SPA + API + WebSocket), el modelo de datos es simple y coherente, hay detalles de producto bien pensados (hold-to-SOS, wake lock, patrón de vibración por tipo, rollback optimista, anti-escalada de roles). El código tiene comentarios de fixes previos; la base no está mal, lo que falta es endurecer y operar.

---

## 1. Mapa del sistema

```
Kioskos / tablets / PCs de planta
        │ HTTP :80 / WS
        ▼
   nginx (contenedor)  ── /api, /socket.io ──►  Express :3000 (contenedor)
        │                                            │
        └── estáticos de ./dist (bind-mount)         ▼
                                                MongoDB :27017 (volumen)
```

- **Frontend:** React 19 + TypeScript + Tailwind por CDN, `HashRouter`, Context API, `socket.io-client`. Rutas de kiosco públicas (`/driver`, `/press`, `/technical`, `*-watch`) y rutas protegidas (`/admin`, `/supervisor`).
- **Backend:** Express 4 + Mongoose 8 + JWT + bcryptjs + Socket.io. 15 archivos, 872 líneas.
- **Infra:** docker-compose con 3 servicios, nginx, volumen `alertool_mongodb_data` (502 MB).
- **Deuda estructural:** `server.ts` (383 líneas) es un **segundo backend completo** que no se usa, con `cors: "*"` y JWT sin expiración.

---

## 2. Estado verificado del servidor (evidencia)

| Comprobación | Resultado |
|---|---|
| Host | `alertool` · Debian 13 · 2 GB RAM · disco 15 GB (36 % usado) · uptime 27 días |
| Arranque | `2026-10-15 21:43 EDT`; `docker.service` activo a las `21:44:25` |
| Contenedores | `alertool-frontend-1`, `alertool-backend-1`, `alertool-mongodb-1` → **`Exited (255)` 3 semanas** · `RestartPolicy=no` |
| Causa | Reboot del host; los contenedores murieron y **no tenían `restart`**, por lo que nunca volvieron. El historial de root muestra `reboot` y ediciones de `docker-compose`. |
| Datos | Volumen intacto: **3 usuarios, 107 alertas, 6 configs, 5 prensas, 3 áreas, 5 roles** |
| Mongo | **Standalone** (`hello().setName = null`). Test de transacción → falla. |
| Admin | `bcrypt.compare("********", hash)` → **`true`** |
| Índices | `db.alerts.getIndexes()` → **solo `_id`** |
| Backups | Tarballs de código de ago/sep y 3 `mongodump` manuales; **sin cron ni backup automático** |
| Docker API | `curl http://192.0.2.10:2375/version` → responde **sin auth** (Docker 29.5.2) |
| `dockhand` | UI de Docker en `0.0.0.0:3320`, con `/var/run/docker.sock` **rw**; `/api/health` responde sin credenciales |
| Firewall | `nft` con política `accept`; **no hay ufw**. Puertos 80/3000/27017/3320/2375 accesibles desde la LAN |
| SSH | `PermitRootLogin yes`; entré con contraseña. `fail2ban` inactivo |
| Código desplegado | `/root/alertool` — los md5 de `backend/src/index.js`, `routes/alerts.js` y `dist/index.html` **coinciden** con el árbol local |

> **Contexto operativo:** durante 3 semanas no hubo sistema de alertas ni botón SOS en planta. Eso es, en sí mismo, el hallazgo más grave: no hay monitorización que avise cuando el servicio se cae.

---

## 3. Hallazgos

### 3.1 🔴 CRÍTICOS

#### C1 — Servicio caído por reboot, sin política de reinicio
**Evidencia:** `docker ps -a` → los 3 contenedores `Exited (255)` desde `2026-10-16T01:44:24Z`; `docker inspect` → `RestartPolicy: no`. `docker-compose.yml` no tiene `restart` ni `healthcheck`.
**Impacto:** cualquier reinicio del host, corte eléctrico o `systemctl restart docker` deja la planta sin alertas indefinidamente. Ya ocurrió.
**Fix inmediato (sin tocar archivos):**
```bash
docker update --restart unless-stopped \
  alertool-frontend-1 alertool-backend-1 alertool-mongodb-1
```
> Ese `update` se pierde si luego recreas los contenedores con `docker compose up -d`; hay que aplicar también el compose corregido.
**Fix definitivo:** `restart: unless-stopped` + `healthcheck` + `depends_on: condition: service_healthy` en el compose (§5.1). Y un monitor externo que avise (Uptime Kuma, cron con `curl /api/health` y Telegram/correo).

#### C2 — Docker Engine API expuesta sin TLS ni auth
**Evidencia:** `/etc/docker/daemon.json` incluye `"tcp://0.0.0.0:2375"`; desde mi equipo: `curl http://192.0.2.10:2375/version` → 200 con el JSON del engine, y `GET /containers/json` lista contenedores. No hay firewall.
**Impacto:** control total del host. Un `POST /containers/create` con `Privileged:true` y `HostConfig.Binds:["/:/host"]` da root en el servidor y en la red de planta. `dockhand` (3320) añade otra vía con el socket montado en rw.
**Fix:**
```bash
# 1) primero, que los contenedores vuelvan solos tras el reinicio de docker
docker update --restart unless-stopped alertool-frontend-1 alertool-backend-1 alertool-mongodb-1
# 2) daemon solo por socket UNIX
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "journald" }
EOF
systemctl restart docker
# 3) apagar (o al menos publicar solo en 127.0.0.1) el panel dockhand
docker update --restart=no dockhand && docker stop dockhand
# 4) firewall mínimo: 22, 80 y (después) 443 desde la LAN; nada más
```
> Ojo: reiniciar `docker` mata los contenedores; hazlo **después** del paso 1.

#### C3 — MongoDB publicado con credenciales triviales
**Evidencia:** `docker-compose.yml:29-33` → `ports: "27017:27017"` + `admin/********`; la URI con esa contraseña está en el compose y en `backend/.env`, `.env.example:6`, y el README.
**Impacto:** con el stack levantado, cualquiera en la LAN lee/escribe/borra toda la base (usuarios, hashes, historial). Sin TLS.
**Fix:** eliminar `ports` de `mongodb` (solo red interna de compose), crear usuario de aplicación con permisos solo sobre `alert_system`, contraseña de 32+ bytes en un `env_file` con `chmod 600`, y rotar la actual.

#### C4 — `admin/********` activo en producción
**Evidencia:** hash del usuario `admin` en la BD; `bcrypt.compareSync('********', hash) === true`. El seed (`backend/src/seed.js:65-67`) crea esa cuenta y la imprime en el log.
**Impacto:** quien llegue al login (LAN, o Internet si hay forward del 80) entra como administrador. Sumado a C2/C3, el sistema está efectivamente abierto.
**Fix:** cambiar la contraseña **hoy** desde la UI (Admin → Users) o por API; después, que el seed lea `ADMIN_INITIAL_PASSWORD` del entorno y falle si no está, y forzar cambio en el primer login.

#### C5 — `JWT_SECRET` hardcodeado y débil
**Evidencia:** `docker-compose.yml:22` → `JWT_SECRET=********`; `backend/src/routes/auth.js:21-25` firma con ese secreto y `expiresIn: '24h'`. El token no tiene `iss/aud` ni revocación.
**Impacto:** con el secreto (está en el repo, en los tarballs de backup y en la imagen) se puede forjar `{role:"admin"}` y llamar a toda la API. Además, un cambio de rol tarda hasta 24 h en aplicar porque `requireRole` confía en el claim del token (`backend/src/middleware/auth.js:9-13`).
**Fix:** secreto aleatorio (`openssl rand -hex 32`) fuera del compose, rotación ahora (invalida sesiones), `expiresIn: '15m'` + refresh o `tokenVersion` por usuario, y `requireRole` que recargue el rol de la BD.

#### C6 — Sin TLS en todo el stack
**Evidencia:** `nginx.conf:2` → `listen 80;`; no hay 443 ni redirección; el backend también se publica en `:3000` sin TLS.
**Impacto:** usuario y contraseña de admin, JWT y notas de alertas viajan en claro por la LAN/WiFi de planta. Cualquiera con acceso a la red los captura.
**Fix:** certificado (CA interna instalada en los kioskos, o Let's Encrypt si hay dominio), `listen 443 ssl http2` + `80 → 301`, TLS 1.2/1.3, y dejar de publicar `:3000`.

#### C7 — Alertas sin autenticación: control anónimo total
**Evidencia:** `backend/src/routes/alerts.js:56` (`POST /` público) y `:93` (`PATCH /:id` público, acepta `status`, `notes`, `assignedTo`). `GET /api/users` también es público (`routes/users.js:9-14`) y devuelve usuarios y roles.
**Impacto:** cualquier dispositivo de la red (sin credenciales, con un simple `curl`) puede:
- crear una alerta **SOS falsa** y hacer sonar todas las sirenas;
- marcar como `RESOLVED` una emergencia real sin dejar rastro;
- suplantar `assignedTo`/`reportedBy`;
- enumerar usuarios para fuerza bruta.
**Fix:** autenticar `POST/PATCH` con token de dispositivo/kiosko (cabecera firmada que nginx añade y que el backend valida) o JWT; derivar `reportedBy`/`assignedTo` del token, nunca del body; cerrar `GET /users` a autenticados (o devolver solo `id`/`username` del turno); rate limit; registrar auditoría.

#### C8 — Guardar la configuración de alertas falla siempre (transacción sobre Mongo standalone)
**Evidencia:** `backend/src/routes/alertConfig.js:17,31-34` usa `session.withTransaction(...)`. Mongo corre standalone (`setName: null`). Reproducido:
```
TX_ERROR: Transaction numbers are only allowed on a replica set member or mongos
```
**Impacto:** el admin edita los botones, recibe "Failed to save configuration" y no se guarda nada. Es una función central del producto, muerta.
**Fix (inmediato, sin infra):** sustituir la transacción por un reemplazo idempotente (la colección son ~6 documentos):
```js
await AlertButtonConfig.deleteMany({});
configs = await AlertButtonConfig.insertMany(req.body);
```
**Fix robusto:** arrancar Mongo como replica set de 1 nodo (`--replSet rs0` + `rs.initiate()`), que además habilita change streams y backups consistentes.

#### C9 — El SOS se silencia al "tomarlo" o al cancelarlo
**Evidencia:** `hooks/useSosAlarm.ts:16-20` filtra `status === ACTIVE`; `SosAlarmBanner` consume solo ese `activeSos`. `AlertCard`/`WatchAlertCard` permiten pasar una alerta `ACTIVE` (incluida SOS) a `WORKING` con un toque; `PressDashboard.tsx:265-270` permite cancelar el SOS con un clic.
**Impacto:** un técnico toca la tarjeta SOS para "atenderla" → la sirena y el banner global desaparecen en toda la planta aunque la emergencia siga abierta. El panel de prensa sigue mostrando "SOS Activo", pero el resto ya no. Además, cualquier anónimo puede cancelarlo (C7).
**Fix:**
```ts
// useSosAlarm.ts — SOS activo hasta que se resuelva o cancele
const activeSos = alerts
  .filter(a => a.type === SOS_ALERT_TYPE &&
    a.status !== AlertStatus.RESOLVED && a.status !== AlertStatus.CANCELLED)
  .sort((a, b) => a.timestamp - b.timestamp)[0] || null;
```
Y bloquear `take/resolve/cancel` de SOS a supervisor/admin con confirmación explícita, también en backend.

#### C10 — Host sin firewall, root por contraseña, sin fail2ban
**Evidencia:** `nft list ruleset` → `policy accept` en input/forward/output; `PermitRootLogin yes`; `fail2ban` inactivo; contraseña de root compartida en el chat.
**Impacto:** si el 22 o el 80 están alcanzables desde fuera de la LAN (router/NAT), el servidor es un objetivo trivial. Aunque no lo estén, cualquier equipo comprometido de la planta tiene root.
**Fix:** firewall por defecto `drop` salvo 22/80/443 desde la LAN; claves SSH y `PermitRootLogin prohibit-password`; `fail2ban`; cambiar la contraseña de root; segmentar la red de kioskos.

---

### 3.2 🟠 ALTOS

| ID | Hallazgo | Evidencia | Impacto | Fix |
|----|----------|-----------|---------|-----|
| A1 | **Un 403 cierra la sesión** | `services/api.ts:38-47` borra token/usuario y redirige ante 401 **o** 403 | Un supervisor que intenta una acción no permitida pierde la sesión; cualquier 403 de negocio expulsa | Tratar solo 401 como expiración; en 403 lanzar error de permisos y mostrar toast |
| A2 | **Sesión restaurada sin verificar** | `contexts/AuthContext.tsx:21-33` hace `JSON.parse(localStorage.user)` y confía en `role`; `/auth/verify` existe y no se usa | Basta editar `localStorage.user = {"role":"admin"}` para abrir la UI de admin; una sesión revocada sigue | Guardar solo el token y llamar a `/api/auth/me` (usuario desde BD) al arrancar; limpiar si falla |
| A3 | **Sin rate limit ni helmet** | `backend/src/index.js:51-53` solo `cors` + `express.json` | Fuerza bruta ilimitada al login; sin cabeceras de seguridad | `helmet()`, `express-rate-limit` (5/15 min en login), `trust proxy 1` |
| A4 | **Socket.io sin auth y broadcast global** | `backend/src/socket/index.js:5-25`; `alerts.js:85,124` usan `io.emit` | Cualquiera recibe todas las alertas en tiempo real, incluso tras logout; no se puede limitar por rol/prensa | Autenticar handshake, salas por rol/prensa, `socket.disconnect()` en logout |
| A5 | **Todas las alertas, sin índice** | `AlertContext.tsx:32` llama `getAlerts()` sin límite; `alerts.js:24-35` devuelve todo; `models/index.js:45-57` sin índices (verificado: solo `_id`) | Cada kiosko descarga el historial completo al arrancar y en cada reconexión; con años de datos la UI se degrada y Mongo hace COLLSCAN | `limit` por defecto + paginación; índices `{timestamp:-1}`, `{status:1,timestamp:-1}`, `{pressId:1,status:1}` |
| A6 | **Supervisor no puede editar usuarios** | `UserManagementTable.tsx:85-96` envía siempre `role`; `users.js:68-69` lo rechaza con 403 | La sección Usuarios delegada a supervisor está rota para editar; el error se ve como "Error updating user" | Enviar solo el diff (omitir `role` si no cambió) y validar en backend; ocultar roles no asignables |
| A7 | **Permisos de supervisor: se borran y no se aplican** | `GET /users` excluye `allowedSections` (`users.js:11`), pero `SupervisorPermissionsTable.tsx:33` inicializa desde ese campo → guarda un set vacío; el backend autoriza por rol sin mirar secciones | Pérdida silenciosa de permisos; la delegación es cosmética (un supervisor sin secciones puede llamar igual a las APIs) | Cargar el usuario completo con `GET /users/:id` antes de editar; validar `allowedSections` en cada ruta; no confiar en localStorage |
| A8 | **Desactivar un tipo oculta alertas activas** | `AlertContext` + `SupervisorDashboard.tsx:42-50`, `TechnicalDashboard.tsx:30-33`, `DriverDashboard.tsx:37-41`, `WatchDashboard.tsx:59-74`, `PressStatusGrid.tsx:33-47` filtran por `enabled` + `allowedRoles` | Una falla mecánica activa desaparece de los paneles si el admin desactiva el tipo o cambia roles; el operador de prensa sigue viéndola | La config debe limitar solo la **creación**; incluir siempre alertas ACTIVE/WORKING existentes y marcarlas "tipo deshabilitado" |
| A9 | **Fallo de carga = "todo en orden"** | `AlertContext.tsx:39-43` captura y deja `alerts=[]`; los paneles muestran "Sin alertas / Todo operativo"; `HomePage.tsx:85-89` pinta "Conectado" fijo | Una caída de backend/red se presenta como planta sana: falso negativo peligroso | Exponer `error` en los contextos, mostrar estado "sin conexión / no se pudieron cargar alertas" con reintento; usar `isConnected` real |
| A10 | **Dependencia de CDNs de Internet** | `index.html:8` Tailwind CDN, `:19` Google Fonts, `:122-132` importmap a `esm.sh`; el `dist` desplegado lo conserva | En una LAN industrial sin salida a Internet, la UI queda sin estilos; además es superficie de supply chain | Compilar Tailwind en el build, self-hostear fuentes, borrar el importmap y `@supabase` |
| A11 | **Build no reproducible y typecheck roto** | `node_modules/.bin` son texto `XSym` (17 shims); `npm run lint` falla; `tsc` da 10 errores (`import.meta.env` y `server.ts`); `Dockerfile` hace `COPY . .` sin `npm ci` | No se puede reconstruir el `dist` desplegado desde este árbol; cualquier parche urgente queda bloqueado | `rm -rf node_modules backend/node_modules && npm ci`; añadir `vite-env.d.ts`, `types: ["vite/client","node"]`, excluir `server.ts`; build multi-stage con `npm ci` |
| A12 | **Sin backups automáticos** | No hay cron; solo tarballs manuales y 3 dumps de ago/sep | Pérdida del historial (evidencia de incidentes) ante corrupción, `down -v` o fallo de disco | `mongodump --gzip --archive` diario a disco externo + retención + prueba de restore |
| A13 | **La sirena puede no sonar** | `notificationService.ts:72-103` crea `AudioContext` sin gesto del usuario; `useSosAlarm.ts:25-32`; `SosAlarmBanner` solo muestra el SOS **más antiguo** (`useSosAlarm.ts:16-20`) | Autoplay bloquea el audio en un kiosko recién abierto; si el primer SOS se silencia, un segundo SOS no suena | Botón "Activar sonido" persistido; `AudioContext.resume()` tras el primer toque; alarmar por **lista** de SOS activos, no por el primero |
| A14 | **Renombrar un tipo deja huérfanas las alertas** | `AlertConfigForm.tsx:191-198` permite editar el nombre; `Alert.type` guarda el nombre y todos los filtros comparan `c.name` | Alertas activas con el nombre viejo desaparecen de paneles/mapa; se pueden duplicar reportes | Usar un `typeId` inmutable en `Alert`; o bloquear rename si hay alertas ACTIVE/WORKING y migrarlas |
| A15 | **Sin ErrorBoundary** | No hay `componentDidCatch` en el frontend | Un error de render deja el kiosko en pantalla blanca sin diagnóstico | Añadir boundary global con "recargar" y reporte |
| A16 | **Secretos en `migrated_prompt_history/`** | `prompt_2025-12-18T02…json:1386` contiene `POSTGRES_PASSWORD`, `SERVICE_ROLE_KEY`, `SECRET_KEY_BASE`, `DASHBOARD_PASSWORD` de un Supabase | Si ese proyecto sigue vivo, `service_role` bypassa RLS; `SECRET_KEY_BASE` permite forjar sesiones | Rotar esas claves, borrar la carpeta y excluirla de git/Docker |

---

### 3.3 🟡 MEDIOS (agrupados)

**Producto / flujos**
- **M1** Error de red en login se muestra como "Credenciales inválidas" (`AuthContext.tsx:59-61`, `LoginPage.tsx:51-53`).
- **M2** Bucle de redirección: tras login navega a `from` sin comprobar rol (`LoginPage.tsx:48-49` + `App.tsx:32-34`); un supervisor que entra por `/admin` rebota al login.
- **M3** Duplicados de alertas: deduplicación solo de UI, sin idempotencia ni índice único parcial por `(pressId, type)` (`PressDashboard.tsx:66-80`, backend `alerts.js:56-88`).
- **M4** El mapa de planta atiende/resuelve **todas** las alertas de una prensa con un clic, sin confirmación; SOS visible pero no accionable (`PressStatusGrid.tsx:96-116`); `pressAlerts[0]` puede no ser la más reciente (`:51`).
- **M5** Timers sin cleanup: `PressDashboard.tsx:79,91,97-111`, `WatchAlertCard.tsx:86-90` (puede resolver una alerta después de desmontar).
- **M6** Rollback optimista frágil: snapshot dentro del updater de `setState` (`AlertContext.tsx:142-172`), con StrictMode puede guardar el estado ya optimista.
- **M7** Coste O(prensas × alertas) y O(configs × alertas) por render sin memo (`AlertCard` no es `memo`, value del contexto se recrea).
- **M8** Roles personalizados sin portal → 404; los roles core se pueden editar y romper el acceso (`RoleManagementTable.tsx:149,166-188`).
- **M9** Usuarios sin turno no aparecen en el selector de identidad (`UserSelectorScreen.tsx:25-28`), aunque el formulario permite dejarlos "Unassigned".
- **M10** Borrar prensa/área no valida alertas activas ni limpia referencias.
- **M11** Se puede borrar el último admin o a uno mismo; `DELETE /users` solo protege el rol `admin` (`users.js:94-107`).
- **M12** Supervisores pueden crear/editar/borrar roles (`roles.js:14,23,32`) pese al comentario "admin only".
- **M13** `Alert.type` = nombre visible (español) y los iconos se mapean por subcadenas inglesas (`PressDashboard.tsx:35-43`): "Mecánica"/"Eléctrica" no muestran su icono.
- **M14** `AlertCard` congela el tiempo transcurrido (`AlertCard.tsx:89-90`).
- **M15** Reportes: fechas en UTC (`ReportsTab.tsx:28-37`) pueden excluir el turno; CSV con `encodeURI` sin BOM (`:96-104`) se corta con `#` y rompe tildes en Excel.

**Seguridad / datos**
- **M16** `errorHandler` devuelve `err.message` de Mongo al cliente (`middleware/errorHandler.js:18-20`).
- **M17** `startDate`/`endDate` se convierten con `Number()` sin validar (`alerts.js:20-21`); un valor inválido genera `NaN`.
- **M18** CORS: fallback `'*'` con `credentials:true` (`index.js:38-51`) y `CORS_ORIGIN=http://192.0.2.20` obsoleto en el compose.
- **M19** `JWT` 24 h sin revocación; rol del token desactualizado hasta 24 h.
- **M20** Seed no idempotente y solo comprueba `User.countDocuments()` (`seed.js:42-46`): si hay usuarios pero faltan roles/configs, no se repara.

**Infra / entrega**
- **M21** `dist` bind-mount sobre la imagen: la imagen no es la fuente de verdad (`docker-compose.yml:8-9`); `nginx.conf` sí va horneado → dos mecanismos de despliegue.
- **M22** Backend Dockerfile sin `USER`, `HEALTHCHECK`, `npm ci`; `.dockerignore` no excluye `node_modules` → imagen con node_modules de macOS.
- **M23** nginx: `Connection 'upgrade'` incondicional, sin `proxy_read_timeout`, sin `X-Forwarded-For`, sin `client_max_body_size`.
- **M24** Contenedores root, sin `cap_drop`, `read_only`, límites de memoria/CPU (host de 2 GB).
- **M25** PWA rota: `manifest.json` referencia `/logo192.png` y `/logo512.png` inexistentes; `sw.js` nunca se registra; `/index.css` y `/env.js` no están en `dist` y nginx devuelve `index.html` con 200 (404 disfrazado).
- **M26** `index.html:15` escribe siempre el tema en `localStorage`, así que el listener de `prefers-color-scheme` de `ThemeContext.tsx:29` nunca se ejecuta.
- **M27** Formularios que no guardan con Enter, botones sin `type` (`AreaManagementTable`, `ShiftManagementTable`, `PressManagementTable`, `RoleManagementTable`, `UserManagementTable`).
- **M28** Estado mutado directamente en `AlertConfigForm.tsx:57-76` y `RoleManagementTable.tsx:67-68` (copia superficial).
- **M29** Doble recarga tras cada mutación (contexto + `refresh*` en las tablas) y borrados que ignoran el resultado.
- **M30** `Modal` sin Escape, sin foco inicial ni focus-trap (`Modal.tsx:15-43`).

---

### 3.4 🔵 BAJOS / higiene

- **B1** 82 archivos `._*` de macOS + `.DS_Store`; `database.sql` (36 bytes binarios), `alertool.tar.gz` (29 bytes), `check_env.js`, `env.js`, `metadata.json`, `Photobooth/` vacío: ruido y confusión.
- **B2** `.gitignore` solo ignora `*.local`; `.env`, `backups/` y `migrated_prompt_history/` no están excluidos (y el proyecto no es un repo git: no hay historial ni posibilidad de revertir).
- **B3** `LoginPage.tsx:23-30` precarga `admin` / `supervisor1` en el campo usuario.
- **B4** `Navbar.tsx` es código muerto con bugs (`location.hash` comparado mal, logout que sombrea).
- **B5** Textos mezclados inglés/español ("Tap to take", "No active alerts", "Unknown Area"); `index.html` con `lang="en"`.
- **B6** `logo.png` de 384 KB (PWA/kiosko).
- **B7** Sin ESLint/Prettier ni tests; `npm run lint` es solo `tsc` y hoy falla.
- **B8** `server.ts` + `server/models.ts` duplican el backend con `cors:"*"`, JWT sin expiración y endpoints sin auth. Borrar.
- **B9** README describe la API como pública y el `********`, y no refleja el despliegue real.

---

## 4. Lo que está bien (para no romperlo)

- Modelo de datos simple y suficiente; nombres denormalizados (`pressName`, `areaName`) bien resueltos en servidor.
- Timeline de la alerta con `timestamp/workingTimestamp/resolvedTimestamp` calculados en servidor.
- Anti-escalada de roles en `POST/PATCH /users` (supervisor no puede crear admins ni tocar `allowedSections`).
- Optimistic UI con rollback y reconciliación socket/HTTP (aunque frágil, la intención es correcta).
- UX de planta cuidada: hold-to-SOS, long-press para resolver, wake lock, vibración distinta por tipo, banner global.
- `helmet` ausente, pero no hay `dangerouslySetInnerHTML` ni `eval`: no encontré XSS directo.
- El bundle actual **sí** corresponde al código fuente (md5 y cadenas verificadas); el problema es que no es reproducible.

---

## 5. Plan de acción

### 5.1 Fase 0 — hoy (≈ 1 h): recuperar y cerrar la puerta

```bash
ssh root@192.0.2.10
cd /root/alertool

# 1. Política de reinicio ANTES de tocar docker
docker update --restart unless-stopped \
  alertool-frontend-1 alertool-backend-1 alertool-mongodb-1

# 2. Levantar (Mongo primero; el backend espera)
docker start alertool-mongodb-1
sleep 5
docker start alertool-backend-1 alertool-frontend-1
docker ps
curl -s localhost/api/health   # {"status":"ok","database":"connected"}

# 3. Cerrar la API de Docker y el panel dockhand
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "journald" }
EOF
docker update --restart=no dockhand && docker stop dockhand
systemctl restart docker          # los 3 vuelven por el restart policy
docker ps                          # comprobar que siguen arriba

# 4. Rotar secretos (elige valores nuevos)
openssl rand -hex 32                # JWT_SECRET
openssl rand -base64 24             # password de Mongo
# editar docker-compose.yml / env_file y `docker compose up -d`

# 5. Cambiar la contraseña de admin desde la UI (Admin → Users)
```

**Compose corregido** (referencia; sustituir el actual):

```yaml
services:
  frontend:
    build: { context: ., dockerfile: Dockerfile.frontend }
    restart: unless-stopped
    ports: ["80:80"]
    depends_on:
      backend: { condition: service_healthy }

  backend:
    build: { context: ./backend, dockerfile: Dockerfile }
    restart: unless-stopped
    # sin ports: solo se llega por nginx
    env_file: [./backend/.env.production]   # MONGODB_URI, JWT_SECRET, CORS_ORIGIN
    depends_on:
      mongodb: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

  mongodb:
    image: mongo:7.0
    restart: unless-stopped
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]  # habilita transacciones
    # sin ports
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASS}
      MONGO_INITDB_DATABASE: alert_system
    volumes: [mongodb_data:/data/db]
    healthcheck:
      test: ["CMD-SHELL", "mongosh --quiet --eval 'db.adminCommand({ping:1})' || exit 1"]
      interval: 20s
      timeout: 10s
      retries: 5

volumes:
  mongodb_data:
```

> Si se adopta `--replSet`, hay que iniciar el set una vez:
> `docker exec alertool-mongodb-1 mongosh -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"mongodb:27017"}]})'`
> Si no se quiere tocar Mongo, aplicar el fix de C8 (quitar la transacción).

### 5.2 Fase 1 — 24–72 h: endurecer

1. **Firewall** (nft/ufw) por defecto `drop`, solo 22/80/443 desde la LAN; SSH con clave y sin root por contraseña; `fail2ban`.
2. **TLS + cabeceras** en nginx:
   ```nginx
   add_header X-Content-Type-Options nosniff always;
   add_header X-Frame-Options DENY always;
   add_header Referrer-Policy no-referrer always;
   add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
   # CSP tras eliminar Tailwind CDN:
   add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self' wss://alertool.local" always;
   ```
3. **Rate limit** en login y en `/api`; `helmet()`; `express.json({ limit: '256kb' })`.
4. **Autenticar alertas**: token de kiosko (cabecera que inyecta nginx y valida el backend) o JWT; `reportedBy` desde el token.
5. **Backup diario** de Mongo + prueba de restore; monitor de `/api/health` con aviso.
6. **Índices** y `limit` por defecto en `/api/alerts`.
7. **C8 y C9** (config de alertas y SOS) desplegados.

### 5.3 Fase 2 — 1–2 semanas: producto y calidad

- Arreglar A1 (403), A2 (sesión), A6/A7 (supervisores), A8 (tipos desactivados), A9 (estado de error), A14 (typeId).
- Quitar la dependencia de CDNs (Tailwind/fuentes locales) y limpiar `index.html` (importmap, `/index.css`, `/env.js`).
- ErrorBoundary + estado "offline" + reintento; PWA real o eliminar `sw.js`/manifest.
- Tests: unitarios del ciclo de vida de alertas (ACTIVE→WORKING→RESOLVED/CANCELLED) y del anti-escalada; E2E de los 5 portales.
- CI: `tsc --noEmit`, ESLint, build, tests; build de imágenes en CI, no en el host.
- Limpieza: borrar `server.ts`, `server/models.ts`, `._*`, `database.sql`, `migrated_prompt_history/`; `.gitignore` real; inicializar git y etiquetar la versión desplegada.

---

## 6. Mejoras de arquitectura (siguiente nivel)

1. **Una sola fuente de verdad**: borrar `server.ts`; el backend es `backend/src`.
2. **Identidad de dispositivo**: cada kiosko con token propio, rol y prensa asignada; así los POST/PATCH dejan de ser anónimos sin obligar a login manual.
3. **ID estable de tipo de alerta** (`typeId`) además del nombre visible; permite renombrar y traducir sin romper historial.
4. **Máquina de estados en servidor**: transiciones permitidas `ACTIVE→WORKING→RESOLVED|CANCELLED`, timestamps y auditoría (`statusHistory`), no un `PATCH` libre.
5. **Idempotencia**: `Idempotency-Key` en la creación y único parcial `(pressId, typeId, status in ACTIVE/WORKING)` para evitar duplicados y SOS dobles.
6. **Paginación y agregados en servidor**: `/api/alerts?limit&cursor`, `/api/reports/summary` con `$group`; el cliente no debe descargar el histórico.
7. **Retención**: TTL/archivo de alertas resueltas > N meses; el volumen ya pesa 502 MB.
8. **Observabilidad**: logs JSON con `requestId`, rotación, healthcheck, uptime externo y alerta cuando el backend lleve > 2 min caído (el fallo de 3 semanas no debe repetirse).
9. **Secretos**: `.env.production` con `chmod 600` fuera del repo, o Docker secrets; nada de secretos en `docker-compose.yml`.
10. **Despliegue reproducible**: build multi-stage, imágenes por digest, `docker compose up -d --build`, staging en una VM/snapshot antes de planta.

---

## 7. Anexo: método y límites

**Verificado en vivo:** estado de contenedores, logs, política de reinicio, Mongo standalone y test de transacción, hash de `admin` contra `********`, índices de `alerts`, conteos, volumen, `daemon.json`, puertos, firewall, SSH, `dockhand`, `/api/health` vía nginx, y md5 de código local vs desplegado.

**No verificado:** explotación de la API de Docker (solo lectura), contenido del `service_role` de Supabase (no lo usé), comportamiento de la UI en navegador real, y si el 80/22 son alcanzables desde fuera de la LAN.

**Cambios de estado realizados:** `docker start alertool-mongodb-1` → consultas `mongosh` de solo lectura → `docker stop alertool-mongodb-1`. Estado final: Mongo `exited` como estaba; frontend/backend siguen `exited`. Ningún archivo del proyecto fue modificado.

**Recomendación de lectura:** C1–C10 primero; el resto puede esperar a la Fase 2 sin riesgo operativo inmediato.
