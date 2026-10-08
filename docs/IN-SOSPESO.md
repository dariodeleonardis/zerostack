# In sospeso

Elenco permanente di quello che resta da fare su ZeroStack e non dipende solo dal codice, o è stato rimandato.
Si aggiorna a ogni chiusura: la voce resta, con la data e come è stata chiusa, nella sezione "Chiuse".
Le voci sul server e sulla posta che non devono finire su GitHub (il repository è pubblico) stanno in
`vps/IN-SOSPESO-SERVER.md`, nella cartella del progetto ma fuori da git.

Ultimo aggiornamento: 8 ottobre 2026.

## Aperte

### Da fare da Dario

| Voce | Cosa serve | Dove | Dal |
|---|---|---|---|
| Pagamenti | Chiavi Stripe e segreti dei webhook in Coolify (`STRIPE_*`, oggi tutte vuote), conto Connect della piattaforma. Senza, abbonamenti e mance non compaiono | Stripe, Coolify | 1/10 |
| Webhook di turboSMTP | Impostare in turboSMTP l'indirizzo `https://zerostack.it/api/email/webhook/turbosmtp?token=…` (token = `EMAIL_WEBHOOK_TOKEN`): senza, rimbalzi e segnalazioni di spam non tolgono gli iscritti | turboSMTP | 3/10 |
| Piano di turboSMTP | Il piano gratuito manda 200 email al giorno: basta per le email della piattaforma, non per le newsletter | turboSMTP | 3/10 |
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
| Email della piattaforma | 8/10 | turboSMTP con SPF, DKIM e DMARC verificati; `newsletter@zerostack.it` esiste (prima il controllo del mittente le faceva rifiutare) |
| Accesso con Google | 8/10 | Credenziali in Coolify, giro fino a Google verificato in produzione; con la pagina di cortesia accesa non crea account nuovi |
| Giro di debug | 8/10 | Intestazioni di sicurezza, www verso zerostack.it, robots e sitemap, proxy di immagini chiuso, react-email 6 (commit 06d7141, a9d4a47) |
