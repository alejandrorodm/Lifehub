#!/usr/bin/env bash
# Despliega un commit de LifeHub en el VPS (mismo procedimiento que deploy/README.md, sin pasos manuales).
#
# Uso:   deploy/deploy.sh [ref]          (ref por defecto: HEAD)
# Host:  LIFEHUB_VPS=vps (alias de ~/.ssh/config por defecto)
#
# Pasos: copia de seguridad del código actual en el VPS -> extraer el commit -> npm install -> build
#        -> reinicio de lifehub -> comprobación de que responde. Se detiene al primer error.
set -euo pipefail

REF="${1:-HEAD}"
HOST="${LIFEHUB_VPS:-vps}"
APP_DIR="/opt/lifehub"
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST")

cd "$(dirname "$0")/.."

if ! git rev-parse --verify --quiet "$REF^{commit}" >/dev/null; then
  echo "Ref no válida: $REF" >&2
  exit 1
fi
SHORT="$(git rev-parse --short "$REF")"
echo "Desplegando $SHORT en $HOST"

echo "1/4 Copia de seguridad del código actual"
"${SSH[@]}" "cd /opt && tar -czf /root/lifehub-pre-\$(date +%Y%m%d-%H%M%S).tar.gz --exclude=lifehub/node_modules --exclude=lifehub/data lifehub"

echo "2/4 Extrayendo $SHORT"
git archive --format=tar "$REF" | "${SSH[@]}" "tar -x -C $APP_DIR"

echo "3/4 Dependencias y build"
"${SSH[@]}" "cd $APP_DIR && npm install --no-audit --no-fund >/dev/null 2>&1 && npm run build >/tmp/lifehub-build.log 2>&1 || { tail -30 /tmp/lifehub-build.log; exit 1; }"

echo "4/4 Reinicio y comprobación"
"${SSH[@]}" "systemctl restart lifehub && for i in \$(seq 1 20); do c=\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3131/api/integrations/google/status); [ \"\$c\" != 000 ] && break; sleep 3; done; echo \"HTTP \$c (401 sin sesión es lo esperado)\"; systemctl is-active lifehub"
echo "Desplegado $SHORT"
