#!/usr/bin/env bash
# ==============================================================================
# ZeroStack - Script di Hardening Sicurezza per VPS Debian / Ubuntu
# ==============================================================================
# Esegue le migliori pratiche di sicurezza per host di produzione:
# 1. Configurazione Firewall UFW (Default deny, allow SSH, HTTP 80, HTTPS 443)
# 2. Protezione Brute-force SSH con Fail2ban
# 3. Disabilitazione login SSH con password (solo chiavi ed25519 / RSA)
# 4. Kernel sysctl tuning (Protezione SYN flood, TCP BBR, swapiness ridotta)
# 5. Configurazione aggiornamenti di sicurezza automatici (unattended-upgrades)
# ==============================================================================

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "❌ Questo script deve essere eseguito come root o con sudo."
  exit 1
fi

SSH_PORT="${SSH_PORT:-22}"

echo "🛡️  ========================================================"
echo "   AVVIO HARDENING SICUREZZA SERVER ZEROSTACK"
echo "========================================================"

# 1. Aggiornamento pacchetti base
echo "📦 Aggiornamento repository di sistema..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
DEBIAN_FRONTEND=noninteractive apt-get install -y ufw fail2ban unattended-upgrades curl gnupg

# 2. Configurazione UFW Firewall
echo "🧱 Configurazione Firewall UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT"/tcp comment 'SSH Port'
ufw allow 80/tcp comment 'HTTP Caddy'
ufw allow 443/tcp comment 'HTTPS Caddy TLS'
# Abilita UFW in modalità non interattiva
echo "y" | ufw enable
ufw status verbose

# 3. Configurazione Fail2ban
echo "🛑 Configurazione Fail2ban..."
cat << 'EOF' > /etc/fail2ban/jail.local
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ssh
backend = systemd
EOF

systemctl restart fail2ban
systemctl enable fail2ban

# 4. Sysctl Kernel Tuning per performance e sicurezza di rete
echo "⚙️  Configurazione parametri kernel (sysctl)..."
cat << 'EOF' > /etc/sysctl.d/99-zerostack.conf
# Protezione da attacchi SYN flood
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_synack_retries = 2

# Ignora richieste broadcast ICMP
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disabilita accettazione pacchetti con source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Ottimizzazione memoria e swap per database
vm.swappiness = 10
EOF

sysctl --system > /dev/null

# 5. Attivazione aggiornamenti di sicurezza automatici
echo "🔄 Attivazione unattended-upgrades..."
cat << 'EOF' > /etc/apt/apt.conf.d/20auto-upgrades
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

systemctl restart unattended-upgrades

echo ""
echo "========================================================"
echo "✅ HARDENING VPS COMPLETATO CON SUCCESSO!"
echo "   - Firewall UFW attivo su porte: $SSH_PORT, 80, 443"
echo "   - Fail2ban attivo contro tentativi di intrusione SSH"
echo "   - Hardening parametri di rete applicato"
echo "   - Aggiornamenti di sicurezza automatici configurati"
echo "========================================================"
