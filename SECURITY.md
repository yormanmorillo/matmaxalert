# Seguridad de Alertool

## Modelo de confianza

- **Admin / supervisor**: JWT HS256 (12 h). El usuario y sus permisos se
  recargan de la base en cada petición.
- **Kioskos** (`/press`, `/technical`, `/driver`, `*-watch`): no tienen login.
  nginx inyecta `X-Kiosk-Key` en `/api/alerts` y el backend no está publicado
  al host. La clave es **compartida**: cualquier equipo que pueda abrir el
  panel en la LAN puede escribir. Para aislarlo de verdad hace falta una de
  estas opciones:
  1. VLAN/firewall que solo permita los equipos de planta contra el puerto 80.
  2. Lista de IPs de kioskos en nginx (`allow`/`deny`).
  3. Token por dispositivo (recomendado a medio plazo): tabla `devices`,
     token hasheado, prensa asignada y pantalla de emparejamiento.
- **SOS**: solo `admin`/`supervisor` pueden cambiar estado, notas o
  `assignedTo`. Un kiosko recibe 403.
- **Socket.io**: canal de solo lectura, detrás de nginx; no autentica el
  handshake. No se usa para escribir en la base.

## Transporte

El despliegue actual es HTTP dentro de la LAN. Los tokens viajan en claro y
el navegador no habilita service worker ni Wake Lock en `http://IP`. Antes de
planta:

1. Emitir un certificado de una CA interna e instalarla en los kioskos, o usar
   un dominio con Let's Encrypt.
2. Servir 443 en nginx, redirigir 80 → 443 y cerrar 80 salvo para el redirect.
3. Verificar que `wss://` funciona a través de nginx.

## Sirena y audio

Los navegadores bloquean el autoplay hasta un gesto. La app tiene un indicador
`🔇 Activar sonido` / `🔊 Sonido activo`; en un televisor de pared nadie lo
toca. Para kiosko dedicado:

```bash
chrome --kiosk --autoplay-policy=no-user-gesture-required http://HOST/
```

Esto es una mitigación, **no** un sistema de seguridad certificado. Para
emergencias reales hace falta sirena/baliza física por relé y paro de
emergencia cableado.

## Límites de peticiones

- Login: 10 intentos / 15 min por IP+usuario.
- API general: 600/min por IP.
- Creación de alertas: 120/min por IP.
- **Los SOS se saltan el límite** para que un 429 no impida una emergencia.
- Si Docker/NAT oculta la IP real, todos los clientes comparten cupo: revisar
  `X-Forwarded-For` en los logs y usar `trust proxy` correcto.

## Dependencias

`npm audit --audit-level=high` debe quedar en 0 en frontend y backend; el CI lo
verifica. Las actualizaciones se hacen dentro de la misma rama cuando hay
parche y se prueban con `npm run check` antes de desplegar.

## Secretos

- `.env` solo en el servidor, `chmod 600`; nunca en git.
- Rotar `JWT_SECRET`, `KIOSK_API_KEY` y contraseñas de Mongo si se comparten
  fuera del servidor.
- Los backups de Mongo se guardan fuera del repositorio (`/root/alertool-backups`).

## Reportar

Abre un issue privado o contacta al responsable del sistema. No publiques
detalles de una vulnerabilidad explotable en un repositorio público.
