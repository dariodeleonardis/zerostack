# dist/: file per il server

ZeroStack si pubblica **solo con Coolify** (build pack Docker Compose, file `docker-compose.coolify.yml`
alla radice del repository). La vecchia via con `deploy.sh`, `update-vps.sh`, `backup-vps.sh` e
`docker-compose.prod.yml` è stata tolta il 2/10/2026: non era allineata alla produzione (niente volume per
gli upload, worker senza email, passphrase dei backup visibile nei processi) e mantenerla in parallelo
voleva dire lavoro doppio.

| File | A cosa serve |
|---|---|
| `coolify-proxy.Caddyfile` | Blocco on demand per il proxy Caddy di Coolify: certificati HTTPS per i sottodomini e i domini degli autori, chiesti a `/api/domains/check`. Va in `/data/coolify/proxy/caddy/dynamic/`, poi `docker restart coolify-proxy`. |
| `harden-vps.sh` | Messa in sicurezza di un VPS nuovo (UFW, Fail2ban, aggiornamenti automatici), da lanciare una volta prima di Coolify. |

## Backup

Li fa il servizio `zerostack-backup` del compose (`apps/worker/src/backup.ts`): `pg_dump` del database e
archivio degli upload ogni 24 ore, cifrati se c'è `BACKUP_PASSPHRASE`, copiati su S3 se ci sono le
variabili `BACKUP_S3_*`. Senza S3 restano sul VPS e non proteggono dalla perdita del server.

La prova di ripristino si fa sul VPS con `vps-zerostack/zs-prova-ripristino.sh` (fuori da questo
repository): ripristina l'ultimo dump in un Postgres usa e getta e confronta le righe con la produzione.
