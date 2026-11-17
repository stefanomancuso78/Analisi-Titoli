# Intervenire su StokIQ senza crediti dell'assistente

Il proprietario mantiene accesso al codice GitHub anche senza crediti ChatGPT. La copia non contiene database, credenziali o chiavi di produzione. GitHub, Codespaces e hosting hanno quote e condizioni proprie: non sono servizi illimitati gratuiti.

## Correggere il codice

1. Aprire `https://github.com/stefanomancuso78/Analisi-Titoli` e creare un branch dalla versione corrente di `main`.
2. Usare l'editor GitHub per piccole modifiche oppure **Code > Codespaces > Create codespace** per terminale e ambiente Node 24. Si può anche clonare il repository sul proprio computer.
3. In locale copiare `.openai/hosting.example.json` in `.openai/hosting.json` se manca. È una configurazione di esempio: non usare un ID fittizio per pubblicare sul sito reale.
4. Eseguire `npm test` e `npm run build`. Non è richiesto un servizio AI per eseguire questi comandi. Non ci sono dipendenze npm da installare nel progetto corrente.
5. Aprire una pull request, controllare Actions > Verify StokIQ, poi integrare la correzione. Ogni push/PR esegue test e build. Actions può essere avviato anche con **Run workflow**. Il Worker compilato è scaricabile come artefatto per sette giorni; il sorgente rimane nei commit.
6. Per una prova del browser usare `docs/COLLAUDO_BROWSER.md` con un database isolato e gli strumenti indicati. Non usare il database di produzione come ambiente di prova.

## Pubblicazione: limite da conoscere

**Un merge su GitHub non aggiorna automaticamente stokiq.online.** Il sito attuale usa il servizio Sites; questo repository non possiede una credenziale permanente o un'API pubblica documentata per pubblicare sul progetto Sites dall'esterno. Il workflow di questo repository verifica e compila: NON esegue il deploy di produzione. La copia su GitHub non sostituisce il servizio hosting o il suo pannello.

Per la pubblicazione sul progetto attuale occorrono un canale Sites accessibile al proprietario e le relative autorizzazioni. Se quel canale non è disponibile senza assistente/crediti, rimane un vincolo operativo: non viene nascosto da questo documento. Il dominio va mantenuto sul progetto esistente finché una migrazione non è stata provata.

Per eliminare anche questa dipendenza bisogna predisporre un hosting sotto il controllo diretto del proprietario (ad esempio Cloudflare Workers con D1/R2) e un deploy GitHub Actions autorizzato da quel proprietario. Prima del cambio servono: account/permessi hosting, importazione verificata del database, chiave di cifratura originale conservata fuori da GitHub, configurazione di autenticazione affidabile e prova del dominio/password/ruoli/backup. Il sorgente attuale usa identità verificate Sites: non esporlo su un Worker generico senza adattare l'autenticazione e rimuovere gli header d'identità non fidati. Questa migrazione NON è completata da un semplice `wrangler deploy`.

## Se si rompe qualcosa

- UI: `worker/product-ui.js`, `worker/evidence-ui.js`, `worker/changes.js`.
- Rendimenti dei tre test: `worker/index.js` (`parallelStatus`, `performance_cycle`), `worker/parallel.js`, `worker/performance-charts.js`, `worker/performance-diagnostics.js`.
- Ingressi Test 2: `worker/semantic.js`. Test 3: `worker/parallel.js`.
- Code/acquisizioni: `worker/acquisition-screen.js`, `worker/acquisition-batch.js`, `worker/flow-health.js`.
- Schemi: `drizzle/`; test automatici: `tests/`.
- Ripristino dati: `docs/BACKUP_E_RIPRISTINO.md` e `scripts/restore-paged.mjs`.

Prima di un intervento conservare ID versione/commit, stato dei test, messaggio d'errore e un backup verificato. Non cancellare dati o riscrivere gli esiti per correggere un indicatore. Ripristinare codice e ripristinare database sono due operazioni diverse; uno snapshot Git non contiene i dati del sito.

## Cosa custodire fuori dal repository

Accesso amministratore all'hosting, accesso al registrar/DNS, copie dei backup cifrati e chiavi necessarie al ripristino, credenziali dei provider e procedure di rinnovo. Mai nei commit, negli screenshot di issue o nei log Actions. Revocare e ruotare una credenziale se viene pubblicata per errore: eliminarla dall'ultimo file non la cancella dalla storia Git.

## Comandi operativi dal browser, senza chiamare un assistente

Aprire il sito ufficiale, autenticarsi e aprire gli strumenti sviluppatore del browser (F12 > Console). Leggere il file `scripts/maintenance-console.js` nel proprio repository, poi eseguirne il contenuto nella console del sito. Non incollare codice proveniente da terzi non verificati. Il file rifiuta domini diversi da StokIQ e non richiede o esporta token.

Comandi disponibili:

```js
await StokIQMaintenance.status()          // stato operativo
await StokIQMaintenance.tests()           // Test 1–3 e Test 4 distinti, in sola lettura
await StokIQMaintenance.downloadStatus()  // salva il report JSON sul proprio dispositivo
await StokIQMaintenance.sourceRefresh()   // una fonte dovuta, con rotazione equa
await StokIQMaintenance.performance()     // calcolo/registrazione delle performance
await StokIQMaintenance.portfolioStep()    // una valorizzazione dalla rotazione esistente
await StokIQMaintenance.portfolioBatch()   // massimo tre valorizzazioni in sequenza
await StokIQMaintenance.operations()      // controlli operativi
await StokIQMaintenance.backupStep()      // un avanzamento del backup, se dovuto
```

La valorizzazione dei portafogli è distinta dall'acquisizione delle quotazioni. Un risultato `completed` significa che è stato eseguito il calcolo con i dati già acquisiti, non che siano arrivati nuovi prezzi. La rotazione completa deve essere eseguita con budget e frequenza sostenibili; evitare richieste parallele. Il pannello del gestore distingue ora i testi in attesa di lettura dagli approfondimenti economici ancora da completare, e segnala anche le valorizzazioni non recenti.

I comandi di scrittura richiedono l'autenticazione proprietario del sito: la password condivisa o un profilo con sola visualizzazione admin non bastano. Il server continua a verificare ruolo e origine. Un HTTP 403 indica permessi insufficienti: non aggirarlo modificando header o ruoli. Un timeout non prova che il lavoro sia annullato: rileggere lo stato prima di ripetere.

`backupStep()` può restituire running: è un singolo avanzamento, non un backup riuscito. Ripeterlo soltanto secondo il cursore/stato previsto dalla guida backup. Questi comandi non pubblicano nuove versioni di codice e non effettuano lettura economica con un modello AI.

La lettura automatica attuale dipende dal task ChatGPT e dalle sue quote. Avere il repository non fornisce token AI né un servizio di lettura indipendente. Per eliminare quella dipendenza occorre un servizio schedulato proprio e un provider AI/API pagato dal proprietario, con chiavi fuori da GitHub. Prezzi e monitoraggio tecnico non sostituiscono l'analisi economica se quel lettore si ferma.
