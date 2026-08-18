# Deploy Recruter-Search pe Hetzner

## 🔧 Setup Initial (RUN ONCE)

### 1. Conectare SSH
```bash
ssh root@cautare.buildandfix.ai
```

### 2. Instalare Node.js + SQLite
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install SQLite
apt install -y sqlite3

# Verify
node --version
npm --version
sqlite3 --version
```

### 3. Creare user pentru app
```bash
useradd -m -s /bin/bash recruter
sudo -u recruter mkdir -p /opt/recruter-search
```

### 4. Clone Repo
```bash
cd /opt/recruter-search
sudo -u recruter git clone https://github.com/samsyro-ctrl/recruter-search.git .
```

### 5. Install Dependencies
```bash
cd /opt/recruter-search
sudo -u recruter npm install --production
```

### 6. Setup Systemd Service
```bash
# Copy service file
cp recruter-search.service /etc/systemd/system/

# Enable & start service
systemctl daemon-reload
systemctl enable recruter-search
systemctl start recruter-search

# Verify running
systemctl status recruter-search
```

### 7. Setup Backup Cron (Daily 2 AM)
```bash
# Copy backup script
cp backup-daily.sh /opt/recruter-search/
chmod +x /opt/recruter-search/backup-daily.sh

# Add to crontab
crontab -e
```

**Paste this line:**
```
0 2 * * * /opt/recruter-search/backup-daily.sh >> /var/log/recruter-backup.log 2>&1
```

### 8. Setup Nginx Reverse Proxy (Optional but Recommended)
```bash
apt install -y nginx

# Create config
cat > /etc/nginx/sites-available/recruter-search <<'EOF'
server {
    listen 80;
    server_name cautare.buildandfix.ai;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/recruter-search /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 9. Setup SSL (Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d cautare.buildandfix.ai
```

---

## 📊 Verify Deployment

### Check Service Status
```bash
systemctl status recruter-search
journalctl -u recruter-search -n 50  # Last 50 logs
```

### Check Backup
```bash
ls -lh /opt/recruter-search/backups/
sqlite3 /opt/recruter-search/backups/memorie-$(date +%Y-%m-%d).db "SELECT COUNT(*) FROM cautari;"
```

### Test App
```bash
curl http://localhost:3000
# Should return HTML
```

### Test Nginx
```bash
curl http://cautare.buildandfix.ai
# Should return app
```

---

## 🔄 Updates & Maintenance

### Pull Latest Code
```bash
cd /opt/recruter-search
sudo -u recruter git pull origin main
sudo -u recruter npm install
systemctl restart recruter-search
```

### View Live Logs
```bash
journalctl -u recruter-search -f  # Follow logs (Ctrl+C to exit)
```

### Manual Backup (Anytime)
```bash
/opt/recruter-search/backup-daily.sh
```

### Restart App
```bash
systemctl restart recruter-search
```

---

## 🚨 Troubleshooting

### App won't start
```bash
journalctl -u recruter-search -n 100
# Check logs for errors
```

### Port 3000 in use
```bash
lsof -i :3000
kill -9 <PID>
```

### Permission denied on backup
```bash
chmod +x /opt/recruter-search/backup-daily.sh
chmod 755 /opt/recruter-search/backups
```

### Nginx not proxying
```bash
nginx -t  # Check config
systemctl restart nginx
curl -v http://cautare.buildandfix.ai  # Verbose test
```

---

## 📈 Monitoring

### CPU/Memory Usage
```bash
top -p $(pgrep -f "node src/server.js")
```

### Disk Space
```bash
df -h /opt/recruter-search
du -sh /opt/recruter-search/backups
```

### Request Logs (via app)
```bash
tail -f /var/log/syslog | grep recruter-backup
```

---

## 🔐 Security

- ✅ Firewall: Only allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- ✅ SSH: Use SSH keys, disable password login
- ✅ App runs as `recruter` user (not root)
- ✅ Database backups are readable only by `recruter`
- ✅ Input validation + rate limiting (see src/server.js)

---

**Questions?** Check logs: `journalctl -u recruter-search -n 100`
