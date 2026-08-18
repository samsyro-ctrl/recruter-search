#!/bin/bash
set -e

echo "🚀 RECRUTER-SEARCH DEPLOYMENT START"
echo "=================================="

# 1. Update system
echo "📦 Updating system..."
apt update && apt upgrade -y

# 2. Install Node.js
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Install SQLite
echo "📦 Installing SQLite..."
apt install -y sqlite3

# 4. Verify installations
echo "✓ Node: $(node --version)"
echo "✓ NPM: $(npm --version)"
echo "✓ SQLite: $(sqlite3 --version)"

# 5. Create recruter user
echo "👤 Creating recruter user..."
useradd -m -s /bin/bash recruter 2>/dev/null || echo "User recruter already exists"
mkdir -p /opt/recruter-search
chown -R recruter:recruter /opt/recruter-search

# 6. Clone repo
echo "📥 Cloning repository..."
cd /opt/recruter-search
sudo -u recruter git clone https://github.com/samsyro-ctrl/recruter-search.git . 2>/dev/null || (sudo -u recruter git pull origin main)

# 7. Install dependencies
echo "📦 Installing npm dependencies..."
cd /opt/recruter-search
sudo -u recruter npm install --production

# 8. Create systemd service
echo "⚙️  Setting up systemd service..."
cat > /etc/systemd/system/recruter-search.service <<'EOF'
[Unit]
Description=Recruter Search - Construction Worker Finder PWA
After=network.target

[Service]
Type=simple
User=recruter
WorkingDirectory=/opt/recruter-search
ExecStart=/usr/bin/node /opt/recruter-search/src/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="ALERTA_EMAIL=samsyro@gmail.com"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable recruter-search
systemctl start recruter-search

# 9. Create backup directory
echo "📁 Creating backup directory..."
mkdir -p /opt/recruter-search/backups
chown -R recruter:recruter /opt/recruter-search/backups

# 10. Setup backup cron (daily at 2 AM)
echo "⏰ Setting up daily backup cron..."
cp /opt/recruter-search/backup-daily.sh /opt/recruter-search/backup-daily.sh
chmod +x /opt/recruter-search/backup-daily.sh

# Add cron job
(crontab -l 2>/dev/null | grep -v "recruter-backup" || true; echo "0 2 * * * /opt/recruter-search/backup-daily.sh >> /var/log/recruter-backup.log 2>&1") | crontab -

# 11. Verify service
echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "=================================="
echo ""
echo "Service status:"
systemctl status recruter-search --no-pager

echo ""
echo "📋 Next steps:"
echo "1. Check logs: journalctl -u recruter-search -n 50"
echo "2. Test app: curl http://localhost:3000"
echo "3. Setup Nginx reverse proxy (optional)"
echo "4. Setup SSL with certbot (optional)"
echo ""
echo "App running on: http://cautare.buildandfix.ai:3000"
echo "Database: /opt/recruter-search/memorie.db"
echo "Backups: /opt/recruter-search/backups/"
echo ""
