# In sospeso

Elenco permanente di quello che resta da fare su ZeroStack e non dipende solo dal codice, o è stato rimandato.
Si aggiorna a ogni chiusura: la voce resta, con la data e come è stata chiusa, nella sezione "Chiuse".
Le voci sul server e sulla posta che non devono finire su GitHub (il repository è pubblico) stanno in
`vps/IN-SOSPESO-SERVER.md`, nella cartella del progetto ma fuori da git.

Ultimo aggiornamento: 3 ottobre 2026.

## Aperte

### Da fare da Dario

| Voce | Cosa serve | Dove | Dal |
|---|---|---|---|
| Accesso con Google | Creare le credenziali OAuth (applicazione web) nella Google Cloud Console, indirizzo di ritorno `https://zerostack.it/api/auth/google/callback`; poi `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` in Coolify e Redeploy. Il pulsante compare da solo | Google Cloud Console, Coolify | 2/10 |
| Pagamenti | Chiavi Stripe e segreti dei webhook in Coolify (`STRIPE_*`), conto Connect della piattaforma | Stripe, Coolify | 1/10 |
| Email della piattaforma | Scegliere il provider (turboSMTP, Brevo o Resend), chiavi in Coolify, SPF e DKIM del provider nel DNS di zerostack.it. Oggi le email (conferme, newsletter) sono solo scritte nel log | Provider, Coolify, Zone Editor | 1/10 |
| Cifratura dei backup | `BACKUP_PASSPHRASE` in Coolify (frase lunga conservata fuori dal server: senza, i backup cifrati non si aprono) | Coolify | 2/10 |
| Copia dei backup fuori dal VPS | Google Drive è pronto ma spento ("per ora no", 2/10): si accende con `vps/backup-esterno/configura-drive.sh`. Nel frattempo i backup si scaricano a mano in `backup/` | VPS, PC | 2/10 |
| Pagina di cortesia | Spegnerla da `/admin` quando si apre al pubblico | `/admin` | 1/10 |

### Da decidere o verificare con altri

| Voce | Con chi | Note | Dal |
|---|---|---|---|
| Fatturazione della commissione dell'8% agli autori | Commercialista | Chi emette la fattura (AbsoluteZero), con quale cadenza, e se la piattaforma deve generarla. Oggi la commissione si incassa via Stripe ma non si fattura | 2/10 |
| Revisione legale dei testi | Legale | Privacy (con l'accesso Google), Termini (con la commissione), Cookie. La data "Aggiornato al" si muove da `/admin` | 1/10 |

### Da fare nel codice (rimandate)

Delle funzioni vere che sostituiscono quelle finte tolte il 2/10 restano solo podcast (T8) e trascrizione (T9),
in fondo per scelta di Dario (3/10: troppo pesanti per il VPS di oggi). Commenti, mi piace, posta del lettore,
squadra, note, Fediverso e mance sono fatti e in produzione dal 3/10. Dettagli in
[STATO-FUNZIONI-E-AUDIT.md](STATO-FUNZIONI-E-AUDIT.md), sezione 4.

Altre voci di codice:
- Fediverso: mai provato con un Mastodon vero (solo con quello finto dei test). Da fare a dominio raggiungibile,
  seguendo `@slug@<dominio>` da un account Mastodon.
- Mance e abbonamenti: provati solo con lo Stripe finto. Da rifare con le chiavi vere in modalità test.
- Barra in alto su telefono: «Note» e «Studio» non compaiono per mancanza di spazio (proposta: «Esci» nel menu
  dell'avatar).
- Certificato di un sottodominio d'autore: non ancora visto dal vivo, perché nessuna pubblicazione vera è stata creata sul sito.
  Da controllare alla prima pubblicazione.
- Immagini: due `<img>` (logo nella home e nella pagina della pubblicazione) segnalate dal lint come più lente di
  `next/image`. Non bloccante.

## Chiuse

| Voce | Chiusa il | Come |
|---|---|---|
| Gestione dei cookie e registro dei consensi | 2/10 | Commit 4a9dccf, fa40a14 |
| Dati legali modificabili senza deploy | 2/10 | Pannello `/admin`, commit 840c264 |
| Nuovo stile e aspetto scelto dagli autori | 2/10 | Commit 98b5d79, cd8956b |
| Audit esterno, blocchi 1-4 | 2/10 | Commit 33b7e77, dde50d4; dettagli in STATO-FUNZIONI-E-AUDIT.md |
| Commissione lievemente sotto Substack | 2/10 | 8%, commit 799f6fd |
| Prova di ripristino dei backup | 2/10 | `vps/zs-prova-ripristino.sh`: stesse righe della produzione |
| Funzioni vere T1-T7 (commenti, mi piace, posta, squadra, note, Fediverso, mance) | 3/10 | Commit fino a 6ff4383, in produzione |
