# ZeroStack - Pacchetto di Distribuzione di Produzione (VPS) 🚀

Questa cartella `dist/` contiene la configurazione di produzione ottimizzata per ospitare **ZeroStack** su qualsiasi VPS Linux (Hetzner, OVH, DigitalOcean, AWS EC2, ecc.).

---

## 📋 File Inclusi

| File | Scopo |
|---|---|
| `docker-compose.prod.yml` | Stack multi-container con riavvio automatico, healthcheck e isolamento di rete |
| `Caddyfile` | Reverse proxy con gzip, zstd e certificati SSL gratuiti on-demand |
| `.env.production.example` | File di esempio con tutte le variabili d'ambiente necessarie |
| `deploy.sh` | Script di installazione automatica (installa Docker se manca, genera chiavi e avvia) |
| `update-vps.sh` | Aggiornamento rapido con `git pull` e ricostruzione container senza downtime |
| `backup-vps.sh` | Backup automatico con cifratura GPG AES-256 e sincronizzazione offsite opzionale |
| `harden-vps.sh` | Hardening sicurezza Linux (UFW firewall, Fail2ban, SYN flood protect, unattended-upgrades) |

---

## 🛡️ Hardening Sicurezza Server (Consigliato prima del deploy)

Per blindare il server Linux appena acquistato contro attacchi brute-force e vulnerabilità di rete:

```bash
sudo bash harden-vps.sh
```

---

## ⚡ Installazione su VPS in 3 Passaggi

1. **Copia i file sul tuo server** (o clona l'intero repository):
   ```bash
   git clone https://github.com/dariodeleonardis/zerostack.git
   cd zerostack/dist
   ```

2. **Avvia il deploy automatico**:
   ```bash
   sudo bash deploy.sh
   ```

3. **Punta il tuo dominio**:
   * Crea un record DNS di tipo **A** puntando il tuo dominio (es. `zerostack.it`) all'IP pubblico del VPS.
   * Caddy rileverà il dominio ed emetterà il certificato SSL HTTPS Let's Encrypt in automatico in pochi secondi.

---

## 🔄 Backup Automatico Giornaliero (Cron Job) con Cifratura GPG

Per pianificare un backup automatico ogni notte alle 03:00 con cifratura AES-256:

```bash
# Modifica le variabili d'ambiente in crontab se desideri la cifratura:
sudo crontab -e
# Aggiungi in fondo:
GPG_PASSPHRASE="tua_passphrase_sicura"
0 3 * * * /bin/bash /percorso/a/zerostack/dist/backup-vps.sh >> /var/log/zerostack_backup.log 2>&1
```
