#!/usr/bin/env bash
# Run on the Ubuntu 24.04 EC2 instance after cloning the repo to /opt/cloudtunes.
# Assumes /etc/cloudtunes.env already exists (see AWS.md).
set -euo pipefail

sudo apt-get update
sudo apt-get install -y nginx mysql-client curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# RDS CA bundle — required for the TLS connection to MySQL.
sudo curl -sS -o /opt/rds-ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# npm workspaces: install once at the repo root, which covers both packages.
cd /opt/cloudtunes
npm ci

set -a && . /etc/cloudtunes.env && set +a
npm run init-db

npm run build
sudo mkdir -p /var/www/cloudtunes
sudo cp -r packages/frontend/dist/* /var/www/cloudtunes/

sudo cp /opt/cloudtunes/deploy/cloudtunes.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cloudtunes

sudo cp /opt/cloudtunes/deploy/nginx.conf /etc/nginx/sites-available/cloudtunes
sudo ln -sf /etc/nginx/sites-available/cloudtunes /etc/nginx/sites-enabled/cloudtunes
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "Done. Health check:"
curl -s localhost/api/health
