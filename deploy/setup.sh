#!/usr/bin/env bash
# Run on the Amazon Linux 2023 EC2 instance after cloning the repo to /opt/cloudtunes.
# Assumes /etc/cloudtunes.env already exists (see AWS.md step 12).
set -euo pipefail

echo "==> Installing packages"
sudo dnf update -y
sudo dnf install -y nginx git

# MySQL client: RDS runs MySQL 8.4, whose caching_sha2_password auth plugin the
# MariaDB client cannot handle, so use MySQL's own client package.
sudo dnf install -y https://dev.mysql.com/get/mysql84-community-release-el9-1.noarch.rpm || true
sudo dnf install -y mysql-community-client || echo "MySQL client unavailable; the app itself does not need it"

# Node 20 from the Amazon Linux repositories; fall back to the default nodejs package.
sudo dnf install -y nodejs20 nodejs20-npm || sudo dnf install -y nodejs npm
# nodejs20 installs as node-20/npm-20 when the default nodejs is also present.
if ! command -v node >/dev/null; then
  sudo alternatives --install /usr/bin/node node /usr/bin/node-20 90
  sudo alternatives --install /usr/bin/npm npm /usr/bin/npm-20 90
fi
node --version

echo "==> Fetching the RDS CA bundle (TLS to MySQL)"
sudo curl -sS -o /opt/rds-ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

echo "==> Installing dependencies (npm workspaces: install once at the root)"
cd /opt/cloudtunes
npm ci

echo "==> Applying the database schema"
# Must be its own statement: inside an && chain, a failure here would not trip set -e.
if [ ! -f /etc/cloudtunes.env ]; then
  echo "ERROR: /etc/cloudtunes.env is missing. Create it first (see AWS.md step 12)." >&2
  exit 1
fi
set -a
. /etc/cloudtunes.env
set +a
: "${DB_HOST:?DB_HOST is not set in /etc/cloudtunes.env}"
: "${S3_BUCKET:?S3_BUCKET is not set in /etc/cloudtunes.env}"
npm run init-db

echo "==> Building the client"
npm run build
sudo mkdir -p /var/www/cloudtunes
sudo cp -r packages/frontend/dist/* /var/www/cloudtunes/
sudo chmod -R a+rX /var/www/cloudtunes

echo "==> Installing the API service"
sudo cp /opt/cloudtunes/deploy/cloudtunes.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cloudtunes

echo "==> Configuring nginx"
# Amazon Linux ships a default server on port 80; replace nginx.conf with a
# minimal one that just includes conf.d, so our server block is the only one.
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak 2>/dev/null || true
sudo cp /opt/cloudtunes/deploy/nginx-main.conf /etc/nginx/nginx.conf
sudo cp /opt/cloudtunes/deploy/nginx.conf /etc/nginx/conf.d/cloudtunes.conf
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl restart nginx

echo
echo "==> Health check"
sleep 2
curl -s localhost/api/health || {
  echo "Health check failed. Application logs:"
  sudo journalctl -u cloudtunes -n 30 --no-pager
  exit 1
}
echo
echo "Done. Open http://$(curl -s ifconfig.me)/ and register the first account."
