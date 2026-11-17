# Test 4 · prospective-decision-v1 — preregistrazione

**Obiettivo**: dimostrare o smentire se il flusso StokIQ di analisi economica documentale produce segnali di acquisto virtuale che, **a parità di date e costi**, hanno rendimento netto superiore a un controllo SPY e un potere predittivo superiore a un indicatore semplice basato sui soli prezzi. Non viene presunta alcuna superiorità. Nessun ordine reale.

## Origine e primo istante
Il protocollo si crea esclusivamente con il primo ciclo autorizzato `test4_cycle` o con il ciclo `parallel_cycle` (che esegue poi Test 4). Il timestamp è server-side; sono candidati solo nuovi `parallel_cases` creati **dopo** quel timestamp. I casi dei test precedenti non vengono importati come esiti di Test 4. I casi osservati dopo una prima chiusura successiva alla pubblicazione sono registrati come esclusi per `late_shadow_registration`, non retrodatati.

## Decisione
Fonte: casi qualificati del Test 3 con emittente attribuito, citazioni primarie e direzione positiva, usando le probabilità e i valori di feature registrati al momento della previsione. Il protocollo misura tutti i casi idonei e marca come `selected` solo quelli con probabilità di riferimento almeno 0,55, congelata al momento della pubblicazione. Non promuove automaticamente versioni adattive. Il controllo *price-only* usa un modello euristico a pesi [0,0.25,0.2,0,0,0], fissato prima dei risultati, e viene valutato tramite Brier sugli stessi casi.

## Fonti/ingresso
Fase iniziale USD su `api.nasdaq.com` con prezzi di chiusura effettivamente acquisiti e registrati; nessun provider commerciale o diritto di rivendita è dichiarato. Prezzo iniziale solo alla **prima chiusura completa** successiva al giorno UTC della previsione, acquisita il giorno successivo; benchmark SPY alla **stessa data**, non alla data più comoda. Il ciclo non cerca dati retroattivi per creare una nuova previsione. Entrata/controllo vengono congelati in un registro append-only. Se una chiusura manca, si attende o si registra una lacuna; non si inventa un prezzo.

## Maturazione
Orizzonte a 30 giorni calendario dall'ingresso; chiusura alla prima seduta completa non precedente la scadenza, al massimo 7 giorni dopo, con SPY nella stessa seduta. Prezzi grezzi, valuta USD, provenienza fissa per simbolo, split/dividendi solo se nel registro documentato; anomalie e gap bloccano la conclusione. Costo convenzionale 10 bps in entrata e 10 bps in uscita per entrambe le braccia. Nessuna imposta, dividendi senza copertura certa, liquidità remunerata o verifica di eseguibilità dell'ordine.

## Decisione scientifica
Non parlare di vantaggio finché non ci sono almeno **30 esiti selezionati appaiati**, almeno **5 coorti temporali**, almeno **5 simboli distinti** e copertura almeno **90%** fra casi appaiati e lacune già determinabili. Richiedere contemporaneamente: rendimento netto medio selezionato positivo, alpha positivo con limite inferiore indicativo 95% per media delle coorti maggiore di zero, Brier economico minore del controllo price-only. Le coorti correlate e gli intervalli temporali sovrapposti rendono l'intervallo solo indicativo; una dichiarazione investibile richiederebbe anche verifica di slippage, costi reali, regime di mercato, universo, controllo settoriale, licenze e revisione indipendente. Nessuna promozione o trading automatico.

## Conservazione e separazione
Tabelle `t4_*` nuove, append-only, nessuna migrazione distruttiva. Nessuna modifica ai record congelati di Test 1/2/3 o ai 6 portafogli capital-v3.1. Il Test 1 non viene cancellato né proclamato fallito senza esiti a 30 giorni. Il benchmark e i prezzi storici sono materia di copertura, non dati certi quando il provider fallisce.

## Maturità attuale
Al momento del commit del protocollo non ci sono esiti propri del Test 4. La validazione CI prova comportamento del software e controlli anti-retrodatazione; NON prova capacità di prevedere il mercato né copertura commerciale dei fornitori.

## Attivazione
Dopo migrazione append-only e deploy del codice, invocare **una volta** `refresh_pattern_calibration` con `{ "test4_cycle": true }`; leggere `list_research` con `{ "test4_status": true }`. I cicli `parallel_cycle` successivi lo alimentano automaticamente; per la valorizzazione servono anche acquisizioni attendibili dei prezzi AMD/SPY e degli altri titoli. Non riavviare i protocolli se cambia il codice: nuovo protocollo/versione, non reset di hash.
