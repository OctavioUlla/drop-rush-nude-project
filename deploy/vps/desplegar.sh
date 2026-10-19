#!/usr/bin/env bash
# Cambia el juego del VPS a una imagen nueva. Lo corre GitHub Actions por SSH como el usuario `deploy`
# (ver .github/workflows/deploy-vps.yml), pero también se puede correr a mano dentro del VPS:
#
#   bash /opt/drop-rush/desplegar.sh ghcr.io/octavioulla/drop-rush:SHA        (no reinicia si hay gente conectada)
#   bash /opt/drop-rush/desplegar.sh ghcr.io/octavioulla/drop-rush:SHA si     (reinicia igual)
#
# El estado de la partida vive en memoria: reiniciar en medio de una clase la corta. Por eso, si el juego que
# está corriendo tiene celulares, proyectores o presentaciones conectados, el deploy se frena salvo que se fuerce.
# Si la imagen nueva no arranca sana, vuelve sola a la anterior.

set -euo pipefail

IMAGEN="${1:?Uso: desplegar.sh IMAGEN [si]}"
FORZAR="${2:-no}"
cd "$(dirname "$0")"

poner() { # poner CLAVE VALOR: escribe o reemplaza una línea de .env
  if grep -q "^$1=" .env 2>/dev/null; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi
}
leer() { grep "^$1=" .env 2>/dev/null | cut -d= -f2- || true; }

ANTERIOR="$(leer IMAGEN)"

# 1. ¿Hay alguien jugando?
if [ "$FORZAR" != "si" ] && [ -n "$(docker compose ps --status running -q juego 2>/dev/null)" ]; then
  salud="$(docker compose exec -T juego wget -qO- http://127.0.0.1:3000/api/health 2>/dev/null || true)"
  conectados="$(echo "$salud" | sed -n 's/.*"conectados":\([0-9]*\).*/\1/p')"
  if [ "${conectados:-0}" -gt 0 ]; then
    echo "::error::Hay $conectados conexiones abiertas en el juego (¿una clase en curso?). No se reinicia." \
      "Cerrar el proyector y la presentación, o correr el workflow a mano con \"forzar\"."
    exit 1
  fi
fi

# 2. Bajar la imagen nueva antes de tocar lo que corre.
echo "==> Bajando $IMAGEN"
docker pull -q "$IMAGEN"

# 3. Cambiar y esperar a que el healthcheck dé bien.
poner IMAGEN "$IMAGEN"
echo "==> Levantando"
if ! docker compose up -d --wait --wait-timeout 90 --remove-orphans; then
  echo "::error::La imagen nueva no arrancó sana. Últimas líneas del juego:"
  docker compose logs --tail 40 juego || true
  if [ -n "$ANTERIOR" ] && [ "$ANTERIOR" != "$IMAGEN" ]; then
    echo "==> Volviendo a $ANTERIOR"
    poner IMAGEN "$ANTERIOR"
    docker compose up -d --wait --wait-timeout 90 || true
  fi
  exit 1
fi

# El Caddyfile se monta como archivo: si cambió, Caddy lo toma recién con un reload.
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || true

poner IMAGEN_ANTERIOR "${ANTERIOR:-}"
# Se borran las imágenes sin usar de más de 3 días (para volver atrás, el workflow la vuelve a bajar de GHCR).
docker image prune -af --filter "until=72h" >/dev/null || true

echo "==> Listo: $IMAGEN en https://$(leer DOMINIO)"
