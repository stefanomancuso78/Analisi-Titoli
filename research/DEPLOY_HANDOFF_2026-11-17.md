# StokIQ — consegna per pubblicazione unica (17 novembre 2026)

## Scopo
Questo documento prepara **solo il rilascio** del codice già integrato nel ramo `main`. Non autorizza nuove funzionalità, modifiche ai modelli, reset di database o cambiamenti all'automazione ChatGPT. Il merge GitHub non aggiorna il sito Sites.

## Stato verificato prima del rilascio
- PR #3, #4, #5, #6, #7, #8, #9, #10, #11 e #12 integrate in `main` (correzioni performance, recovery, backpressure, provenienza, lettura semantica, fallback SEC/IR e feed aggregati).
- CI `Verify StokIQ` della PR #12: **272 test superati, build superata**. Rieseguire CI sull'ultimo commit di `main` prima della pubblicazione.
- Fonti RSS ufficiali: Nasdaq Nordic e GlobeNewswire; interrogazione iniziale ogni 6 ore, priorità inferiore alle fonti societarie, titolo attribuito solo con corrispondenza univoca dell'emittente, dedup e link consentiti per provider.
- La raggiungibilità del catalogo RSS e il successo dei test **non provano** che il Worker Sites riesca a scaricare e acquisire nuovi documenti. Non presentare copertura 59/59 né feed end-to-end come certificati.
- Backup R2 cifrato verificato del 16 novembre: 99 tabelle, 13.994 righe, SHA-256 `956230cbcf34ceeb2b6f9edf4d94896f61e8b40ed884427fc1df7af12fbca317`. Esiste una prova di ripristino SQLite isolato del 13 novembre, 99 tabelle/9.177 righe, foreign key e integrità OK, 3 protocolli intatti; **non** è stata eseguita una prova di failover completo dell'hosting.
- Stato pre-rilascio rilevato il 17 novembre: 59 emittenti, 8 gap primari riportati dalla versione in produzione, 2 prezzi mancanti/datati, 17 acquisizioni e 4 letture in coda. La metrica 51/59 in produzione è precedente alla correzione degli indici emittente e non va trattata come copertura reale.

## Istruzione unica per Codex — solo pubblicazione
> Pubblica su StokIQ Sites **esclusivamente il contenuto già presente nel ramo `main` del repository `stefanomancuso78/Analisi-Titoli`**, come un unico rilascio. Non sviluppare funzionalità, non modificare codice, test, esperimenti, task ChatGPT, modelli, credenziali, DNS, provider o fonti. Prima di distribuire, verifica che l'ultimo commit `main` abbia CI verde (`npm test` e `npm run build`), che esista un backup cifrato verificato e che lo schema/migrazioni siano compatibili. Conserva binding e segreti Sites esistenti, inclusi DB, R2 `ARCHIVE` e `CREDENTIAL_MASTER_KEY`. Non cancellare o ricreare tabelle e non sovrascrivere record storici. Se un prerequisito manca, **fermati senza pubblicare** e riferisci l'ostacolo; non correggere codice autonomamente. Dopo la pubblicazione esegui soltanto verifiche in lettura su health, fonti, code, backup, permessi e tre protocolli sperimentali; verifica che i feed RSS possano essere interrogati e che gli errori di acquisizione restino visibili, senza inventare successi. Comunica commit, orario, esito e eventuali anomalie.

## Checklist di rilascio
1. Controllare commit `main`, test e build, nessuna PR non concordata inclusa. PR #1 storica aperta: non includerla automaticamente.
2. Verificare l'ultimo backup R2 cifrato e la possibilità di decifrarlo con la chiave master del runtime, senza esportare la chiave.
3. Applicare soltanto migrazioni append-only effettivamente richieste dall'artefatto; non ripristinare backup sopra i dati attuali.
4. Distribuire una sola volta, conservando ambiente, identità, segreti e binding.
5. Leggere stato connettori: `sec-company`, `company`, `aggregator-rss`; non contare `issuer-index` come IR operativo. Distinguere feed valido senza match da documento realmente acquisito.
6. Controllare code e backpressure; nessun reset o replay dei cicli interrotti senza audit. La lettura economica resta affidata al task ChatGPT orario e alle quote del piano, non a una nuova API LLM.
7. Controllare che esperimenti 1/2/3, campioni, portafogli, rendimenti, date di ingresso e storico previsioni siano invariati, salvo il comportamento corretto delle nuove esecuzioni.
8. Per i prezzi MA e CURLF non creare prezzi fittizi né convertire mercati/valute senza prova. Registrare eventuali gap.
9. Registrare esito di download, HTTP, numero di articoli attribuiti e documenti leggibili per ciascun feed; se un feed è bloccato o non restituisce articoli, mantenerlo come copertura **non dimostrata**.
10. Se emerge regressione, preferire rollback del **solo codice** a un commit compatibile, conservando DB e dati append-only; documentare il rollback.

## Limiti noti che non bloccano il codice ma impediscono dichiarazioni di copertura completa
- Feed Nasdaq/GlobeNewswire: URL pubblici documentati, ma nessuna acquisizione end-to-end sul Worker attuale prima del rilascio. I titoli che non contengono il nome completo dell'emittente non vengono associati automaticamente (scelta prudenziale).
- Le pagine IR europee dinamiche possono ancora fallire; i feed sono complementari, non sostituzioni garantite.
- Licenze/redistribuzione di contenuti e prezzi: verificare diritti prima di un uso commerciale esteso.
- L'ultima prova di restore è logica e isolata, non disaster recovery completo del sito.
- Nessun modello è dichiarato statisticamente validato dal solo passaggio di CI.
