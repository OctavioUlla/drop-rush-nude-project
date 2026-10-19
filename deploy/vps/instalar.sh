#!/usr/bin/env bash
# Prepara un VPS de DonWeb recién creado para recibir los deploys de GitHub Actions. Pensado para AlmaLinux 10
# (sirve igual en Rocky o RHEL 9/10, y en Ubuntu o Debian). Se corre UNA vez, como root:
#
#   scp deploy/vps/instalar.sh drop-rush-deploy.pub root@IP_DEL_VPS:
#   ssh root@IP_DEL_VPS bash instalar.sh drop-rush-deploy.pub [dominio]
#
# El primer argumento es la clave PÚBLICA con la que entra GitHub Actions (la privada va al secreto VPS_SSH_KEY):
# la ruta a su archivo .pub o la clave misma entre comillas ("ssh-ed25519 AAAA… github-actions").
# Sin dominio usa la IP en sslip.io (por ejemplo 200-58-1-2.sslip.io), que también tiene HTTPS de verdad.
# Instala Docker, crea el usuario `deploy`, abre solo SSH, 80 y 443 y deja /opt/drop-rush listo.
# Se puede volver a correr: no rompe nada de lo que ya está.

set -euo pipefail

CLAVE_PUBLICA="${1:-}"
if [ -f "$CLAVE_PUBLICA" ]; then CLAVE_PUBLICA="$(head -n1 "$CLAVE_PUBLICA" | tr -d '\r')"; fi
DOMINIO="${2:-}"
USUARIO=deploy
DIR=/opt/drop-rush

if [ "$(id -u)" -ne 0 ]; then
  echo "Correr como root (o con sudo)." >&2
  exit 1
fi
if [ -z "$CLAVE_PUBLICA" ] || [[ "$CLAVE_PUBLICA" != ssh-* ]]; then
  echo "Uso: bash instalar.sh CLAVE.pub [dominio]   (o la clave entre comillas en lugar del archivo)" >&2
  exit 1
fi

. /etc/os-release
if command -v dnf >/dev/null; then
  FAMILIA=rhel
elif command -v apt-get >/dev/null; then
  FAMILIA=debian
else
  echo "Distribución no soportada: $PRETTY_NAME" >&2
  exit 1
fi
echo "==> $PRETTY_NAME"

# Puertos en los que escucha SSH de verdad (no siempre es el 22): se abren para no quedar afuera.
PUERTOS_SSH="$(sshd -T 2>/dev/null | awk '$1 == "port" {print $2}' || true)"
PUERTOS_SSH="${PUERTOS_SSH:-22}"

echo "==> Paquetes del sistema"
if [ "$FAMILIA" = rhel ]; then
  dnf -y -q upgrade
  dnf -y -q install ca-certificates curl firewalld policycoreutils
else
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -q
  apt-get upgrade -yq
  apt-get install -yq ca-certificates curl ufw unattended-upgrades
fi

IP=$(curl -fsS4 --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
if [ -z "$DOMINIO" ]; then
  DOMINIO="${IP//./-}.sslip.io"
fi

echo "==> Docker"
if ! command -v docker >/dev/null || docker --version | grep -qi podman; then
  if [ "$FAMILIA" = rhel ]; then
    # AlmaLinux trae Podman, que choca con Docker. El repositorio oficial de Docker para RHEL sirve para Alma.
    dnf -y -q remove podman-docker podman buildah runc >/dev/null 2>&1 || true
    curl -fsSL https://download.docker.com/linux/rhel/docker-ce.repo \
      | sed "s|\$releasever|${VERSION_ID%%.*}|g" > /etc/yum.repos.d/docker-ce.repo
    dnf -y -q install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  else
    curl -fsSL https://get.docker.com | sh
  fi
fi
systemctl enable --now docker

echo "==> Usuario $USUARIO"
if ! id "$USUARIO" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$USUARIO"
fi
usermod -aG docker "$USUARIO"
install -d -m 700 -o "$USUARIO" -g "$USUARIO" "/home/$USUARIO/.ssh"
CLAVES="/home/$USUARIO/.ssh/authorized_keys"
touch "$CLAVES"
grep -qxF "$CLAVE_PUBLICA" "$CLAVES" || echo "$CLAVE_PUBLICA" >> "$CLAVES"
chown "$USUARIO:$USUARIO" "$CLAVES"
chmod 600 "$CLAVES"
# Con SELinux, sshd solo lee authorized_keys si tiene la etiqueta correcta.
if command -v restorecon >/dev/null; then restorecon -R "/home/$USUARIO/.ssh"; fi

echo "==> Carpeta $DIR"
install -d -o "$USUARIO" -g "$USUARIO" "$DIR"
if [ -f "$DIR/.env" ] && grep -q '^DOMINIO=' "$DIR/.env"; then
  sed -i "s|^DOMINIO=.*|DOMINIO=$DOMINIO|" "$DIR/.env"
else
  echo "DOMINIO=$DOMINIO" >> "$DIR/.env"
fi
chown "$USUARIO:$USUARIO" "$DIR/.env"

echo "==> Firewall (SSH, 80 y 443)"
if [ "$FAMILIA" = rhel ]; then
  # Con firewalld apagado se configura en frío y recién después se prende, para no cortar la sesión SSH.
  if systemctl is-active --quiet firewalld; then fw="firewall-cmd --permanent"; else fw="firewall-offline-cmd"; fi
  for puerto in $PUERTOS_SSH; do $fw --add-port="$puerto/tcp" >/dev/null; done
  for servicio in ssh http https; do $fw --add-service="$servicio" >/dev/null; done
  $fw --add-port=443/udp >/dev/null
  if [ "$fw" = firewall-offline-cmd ]; then systemctl enable --now firewalld; else firewall-cmd --reload >/dev/null; fi
else
  for puerto in $PUERTOS_SSH; do ufw allow "$puerto/tcp" >/dev/null; done
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw allow 443/udp >/dev/null
  ufw --force enable >/dev/null
fi

# Caddy necesita el 80 (para sacar el certificado) y el 443. Algunas imágenes traen Apache o Nginx prendidos.
for servicio in httpd apache2 nginx; do
  if systemctl is-active --quiet "$servicio"; then
    echo "==> Apagando $servicio, que ocupa el puerto 80"
    systemctl disable --now "$servicio"
  fi
done

echo
echo "Listo. Dominio: https://$DOMINIO"
echo "Claves del servidor para el secreto VPS_KNOWN_HOSTS de GitHub (copiar las líneas siguientes):"
echo
for f in /etc/ssh/ssh_host_*_key.pub; do
  echo "$IP $(awk '{print $1, $2}' "$f")"
done
echo
echo "Ahora correr el workflow \"Deploy al VPS\" en GitHub (o hacer push a main)."
