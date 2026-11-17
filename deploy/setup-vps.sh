#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 22.04/24.04 VPS for Pure CRM (crm.pure.vn).
# Run as root:   bash setup-vps.sh <git-repo-url>
#
# Installs Node 20, PostgreSQL, nginx, certbot, PM2; creates the database and a
# `deploy` user; clones the fmcg-crm branch to /var/www/purecrm; writes .env with
# fresh random secrets; builds; starts PM2; configures nginx. Safe to re-run:
# existing DB / .env / clone are kept.
set -euo pipefail

REPO="${1:?Usage: bash setup-vps.sh <git-repo-url>}"
BRANCH="${BRANCH:-fmcg-crm}"
DOMAIN="${DOMAIN:-crm.pure.vn}"
APP_DIR=/var/www/purecrm
DB_NAME=purecrm
DB_USER=purecrm
DEPLOY_USER=deploy

echo "==> Packages"
apt-get update -y
apt-get install -y curl git ca-certificates gnupg nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw
if ! command -v node >/dev/null || ! node -v | grep -q '^v2[0-9]'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2

echo "==> Firewall (SSH + HTTP/HTTPS only)"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Deploy user"
id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
mkdir -p /var/www && chown "$DEPLOY_USER":"$DEPLOY_USER" /var/www

echo "==> PostgreSQL"
DB_PASS_FILE=/root/.purecrm-db-password
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  openssl rand -hex 24 > "$DB_PASS_FILE"; chmod 600 "$DB_PASS_FILE"
  sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$(cat "$DB_PASS_FILE")';"
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

echo "==> Code"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$DEPLOY_USER" git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

if [ ! -f .env ]; then
  [ -f "$DB_PASS_FILE" ] || { echo "No DB password file ($DB_PASS_FILE) — create .env by hand"; exit 1; }
  ADMIN_PASS="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)"
  sed \
    -e "s#^DATABASE_URL=.*#DATABASE_URL=\"postgresql://$DB_USER:$(cat "$DB_PASS_FILE")@127.0.0.1:5432/$DB_NAME\"#" \
    -e "s#^JWT_SECRET=.*#JWT_SECRET=\"$(openssl rand -hex 32)\"#" \
    -e "s#^AUTH_BOOTSTRAP_EMAIL=.*#AUTH_BOOTSTRAP_EMAIL=\"admin@pure.vn\"#" \
    -e "s#^AUTH_BOOTSTRAP_PASSWORD=.*#AUTH_BOOTSTRAP_PASSWORD=\"$ADMIN_PASS\"#" \
    -e "s#^APP_URL=.*#APP_URL=\"http://$DOMAIN\"#" \
    .env.example > .env
  chown "$DEPLOY_USER":"$DEPLOY_USER" .env; chmod 600 .env
  echo
  echo "  Admin login:  admin@pure.vn  /  $ADMIN_PASS"
  echo "  (also saved in $APP_DIR/.env — change it after first login)"
  echo
fi

echo "==> Build"
sudo -u "$DEPLOY_USER" bash -c "cd $APP_DIR && npm ci --include=dev && npm run build"

echo "==> PM2"
sudo -u "$DEPLOY_USER" bash -c "cd $APP_DIR && (pm2 describe purecrm >/dev/null 2>&1 && pm2 reload deploy/ecosystem.config.cjs || pm2 start deploy/ecosystem.config.cjs) && pm2 save"
env PATH="$PATH" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" >/dev/null
sudo -u "$DEPLOY_USER" pm2 install pm2-logrotate >/dev/null 2>&1 || true

if [ "${SKIP_NGINX:-}" = "1" ]; then
  # Another reverse proxy (e.g. a Caddy container) already owns 80/443.
  # Let containers on Docker bridge networks reach the app port; the public
  # internet still can't (ufw default-deny).
  echo "==> SKIP_NGINX=1 — using the existing reverse proxy"
  systemctl disable --now nginx >/dev/null 2>&1 || true
  ufw allow from 172.16.0.0/12 to any port 3000 proto tcp comment 'purecrm from docker proxy'
else
echo "==> nginx"
cp deploy/nginx/crm.pure.vn.conf "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default
nginx -t
# Fresh installs may leave nginx stopped (e.g. port 80 was busy during apt install).
systemctl enable nginx >/dev/null 2>&1 || true
if systemctl is-active --quiet nginx; then systemctl reload nginx; else
  systemctl start nginx || {
    echo "!! nginx failed to start. Something else probably holds port 80:"
    ss -ltnp 'sport = :80' || true
    echo "   Stop it (e.g. systemctl disable --now apache2) and re-run this script,"
    echo "   or if it is another reverse proxy you keep (Caddy/Traefik in Docker), re-run with SKIP_NGINX=1."
    exit 1
  }
fi
fi

echo "==> Daily DB backup (03:00, keep 14)"
mkdir -p /home/$DEPLOY_USER/backups && chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/backups
cat > /etc/cron.d/purecrm-backup <<EOF
0 3 * * * $DEPLOY_USER pg_dump "postgresql://$DB_USER:$(cat "$DB_PASS_FILE" 2>/dev/null)@127.0.0.1:5432/$DB_NAME" | gzip > /home/$DEPLOY_USER/backups/purecrm-\$(date +\%Y\%m\%d).sql.gz && ls -1t /home/$DEPLOY_USER/backups/*.sql.gz | tail -n +15 | xargs -r rm -f
EOF
chmod 600 /etc/cron.d/purecrm-backup

sleep 3
curl -fsS http://127.0.0.1:3000/api/health && echo
cat <<EOF

Done. Next:
  1. Point DNS:  $DOMAIN  A  →  this server's IP
  2. HTTPS:      certbot --nginx -d $DOMAIN --redirect -m <your-email> --agree-tos
  3. Then set    APP_URL="https://$DOMAIN"  in $APP_DIR/.env  and  sudo -u $DEPLOY_USER pm2 restart purecrm --update-env
EOF
