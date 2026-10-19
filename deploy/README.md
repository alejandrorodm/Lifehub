# Despliegue de LifeHub en un VPS (systemd, sin Docker)

Mismo patrón que `ViperTrade/deploy/` en este mismo VPS: proceso Node directo
gestionado por systemd, sin contenedores. LifeHub no tiene base de datos
externa (SQLite local), así que no hay un servicio de BD que levantar.

## 1. Conéctate por SSH

```bash
ssh usuario@<IP_O_DOMINIO_DEL_VPS>
node -v   # necesitas Node 22+ (probado con Node 24) — `better-sqlite3` exige >=22;
          # con Node 20 el proceso arranca pero se cae (segfault) al abrir la base de datos.
          # Si tienes Node 20 vía NodeSource, cambia de repo:
          #   curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
          #   apt-get install -y nodejs
```

## 2. Clona el repo e instala

```bash
sudo mkdir -p /opt/lifehub && sudo chown $USER /opt/lifehub
git clone <url-del-repositorio> /opt/lifehub
cd /opt/lifehub
npm install   # incluye devDependencies: el build de Vite y `tsx` (servidor) las necesitan en runtime
npm run build
```

## 3. Configura el `.env`

```bash
cp .env.example .env
nano .env
```

Variables a revisar para producción detrás de un dominio propio:

```
LIFEHUB_HOST=127.0.0.1          # solo el reverse proxy habla con el proceso directamente
LIFEHUB_PORT=3131               # cambia si ya usas este puerto para otra cosa en el VPS
LIFEHUB_DATA_DIR=/opt/lifehub/data   # explícito: evita depender de $HOME bajo systemd
LIFEHUB_PUBLIC_URL=https://tu-dominio.com   # ver nota abajo — sin esto, el login de Google redirige mal
```

Si vas a usar Google Calendar, Calendar API, GitHub o notificaciones push, sigue
las mismas instrucciones del `README.md` principal ("Integraciones
(opcionales)") pero con **tu dominio en vez de `127.0.0.1`**:

- `GOOGLE_REDIRECT_URI=https://tu-dominio.com/api/integrations/google/callback`
  (y el mismo valor, exacto, en "URIs de redireccionamiento autorizados" en
  Google Cloud Console — Google exige HTTPS en producción, `localhost`/`127.0.0.1`
  son la única excepción).

**Por qué `LIFEHUB_PUBLIC_URL`:** el servidor escucha en `127.0.0.1` (solo el
reverse proxy le habla); sin esta variable, tras conectar Google Calendar la
redirección de vuelta a la SPA apuntaría a `http://127.0.0.1:3131/...`, que el
navegador del usuario no puede alcanzar. Esta variable le dice al servidor cuál
es su origen público real. No es necesaria si accedes directo por IP:puerto
sin reverse proxy ni dominio.

## 4. Instala el servicio systemd

```bash
which npm   # confirma la ruta; edita deploy/lifehub.service si no es /usr/bin/npm
sudo cp deploy/lifehub.service /etc/systemd/system/
# Si tu usuario no es 'ubuntu', edítalo: sudo nano /etc/systemd/system/lifehub.service
sudo systemctl daemon-reload
sudo systemctl enable --now lifehub
sudo systemctl status lifehub --no-pager
journalctl -u lifehub -f        # logs en vivo (Ctrl+C para salir)
```

Las migraciones de base de datos se aplican solas al arrancar
(`runMigrations()` en `src/server/index.ts`); no hay un paso manual de
`db:migrate` en el despliegue.

## 5. Dominio y HTTPS (Caddy, recomendado)

```bash
sudo apt install -y caddy   # o el método que ya uses para ViperTrade/Caddy
```

En el Caddyfile:

```
tu-dominio.com {
    reverse_proxy localhost:3131
}
```

```bash
sudo systemctl reload caddy
```

Recuerda: firewall/Security Group del VPS debe permitir 443 entrante (y 80 si
Caddy lo usa para el reto ACME de Let's Encrypt).

## Actualizar LifeHub

Si el VPS tiene acceso de `git clone`/`git pull` al repo (una SSH key o deploy key con permiso sobre él):

```bash
cd /opt/lifehub && git pull
npm install
npm run build
sudo systemctl restart lifehub
```

Si no (p. ej. la SSH key del VPS es un *deploy key* de otro repo y no tiene acceso a este), transfiere el commit directamente desde tu máquina, sin pasar por GitHub:

```bash
# desde tu máquina, en el repo local:
git archive --format=tar HEAD | ssh usuario@tu-dominio-o-ip 'tar -x -C /opt/lifehub'
ssh usuario@tu-dominio-o-ip 'cd /opt/lifehub && npm install && npm run build && systemctl restart lifehub'
```

## Backups

Viven en `LIFEHUB_DATA_DIR` (`/opt/lifehub/data/backups` con la config de
arriba), rotación automática de 14. Haz una copia externa de ese directorio
(o del export JSON desde **Ajustes → Datos**) con tu mecanismo de backup
habitual del VPS — LifeHub no sube nada a ningún sitio por sí mismo.
