# Backup e ripristino StokIQ

Il formato v2 salva pagine compresse e cifrate separatamente in R2. Non ha il precedente limite complessivo di 12 MiB o di 20.000 righe per tabella. La dimensione di ogni pagina è contenuta e le righe molto grandi sono controllate esplicitamente; non si dichiara capacità illimitata.

Ogni avanzamento elabora fino a 12 pagine o tabelle vuote. Il cursore viene salvato dopo ogni pagina verificata. Un lease impedisce due backup concorrenti. Il backup rimane `running` e il precedente verificato resta disponibile fino alla conclusione. Errori crittografici o riferimenti incoerenti impediscono la promozione a `verified`.

Il processo orario deve ripetere la fase `backup` con un ID operativo diverso per ciascun avanzamento fino a `verified`; `backup_progress` espone lo stato senza righe private. Una richiesta interrotta si riprende dal cursore persistito. Il manifest finale è cifrato e associa a ogni pagina identità, tabella, numero di righe e hash. Il formato è un export logico con limiti di rowid per tabella, non una fotografia atomica del database. I riferimenti archiviati vengono verificati prima della conclusione.

I vecchi archivi v1 restano leggibili. Le sessioni, i lease e gli stati temporanei vengono esclusi e ricreati vuoti. I dati dei clienti e le credenziali cifrate rimangono riservati al proprietario.

## Recupero isolato

Il proprietario può esportare il manifest tramite `backup_recovery_export` e i bundle di pagine con `part: bundle, start: 0`, poi 8, 16 e così via. Ogni trasporto ha hash gzip e offset. Non stampare dati dei bundle, password o chiavi. Salvare il manifest come `manifest.json.gz` e i bundle come `bundle-N.json.gz` in una directory privata.

Eseguire `node scripts/restore-paged.mjs <directory-trasporto> <nuova-directory-database>`. Lo script rifiuta sovrascritture, parti mancanti o duplicate, hash incoerenti, schema non ammesso e conteggi diversi. Verifica tutte le righe, lo schema, l’integrità SQLite e le API applicative offline. Il report contiene metadati e hash, non i contenuti delle righe.

Il download owner del formato v2 restituisce il manifest cifrato; per avere l’archivio completo occorrono anche tutte le parti indicate, scaricabili con `part=N`. Un solo manifest non basta per ripristinare i dati. La chiave runtime deve essere conservata separatamente, senza inserirla nel repository o nei report.

Ricreare hosting, binding D1/R2 e configurazione è una procedura distinta. Il collaudo su SQLite e sulle API non prova un cambio DNS o un failover completo del provider.
