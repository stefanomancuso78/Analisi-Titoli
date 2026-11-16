# Test 3 · adaptive-study-v3

Protocollo prospettico separato dai test 1 e 2. L'avvio effettivo è registrato nel database dalla prima attivazione in produzione, senza retrodatazione.

Usa l'ultima analisi economica primaria disponibile e la sua eventuale rivalutazione. Conserva i requisiti economici v2; aggiunge come caratteristica il numero limitato di ulteriori documenti primari citati, che non costituisce conferma indipendente. I testi acquisiti prima dell'avvio possono essere input noti oggi: non vengono trasformati in previsioni storiche.

Ogni previsione ha una copia dei pesi, fonte, caratteristiche e data. Ingresso alla prima chiusura completa con data successiva alla pubblicazione. Esito a 30 giorni dall'ingresso, alla prima chiusura entro sette giorni dalla scadenza. Prezzi coerenti per fonte e valuta; registro documentato di operazioni societarie, copertura parziale. Costi convenzionali 10 bps all'ingresso e 10 bps all'uscita. Nessun ordine reale, dividendo non documentato, cambio o imposta inclusi nella metrica per titolo.

La parità dell'hash della data UTC della previsione assegna l'intera coorte giornaliera a training o evaluation prima degli esiti. Minimo 20 esiti maturati su due coorti di training per addestrare logistic regression con 120 passi, learning rate 0,05 e L2 0,02. Nessun esito evaluation entra nell'addestramento. Le nuove versioni sono append-only e producono solo previsioni successive in shadow. Nessuna promozione automatica o modifica a regole, portafogli o previsioni dei test 1/2.

Il riferimento usa i pesi iniziali v2 più peso zero per la caratteristica di documentazione aggiuntiva. Fino al primo addestramento i punteggi adattivi coincidono con il riferimento: non è un errore né un miglioramento. Brier e rendimenti sono calcolati sugli episodi valutabili; la UI mostra anche quanti esiti evaluation sono stati previsti da una versione realmente addestrata. Trenta di questi esiti sono una soglia preliminare, senza proclamare un vincitore.

La numerosità minima non garantisce indipendenza statistica: società, notizie e coorti possono essere correlate. Periodi sovrapposti e regimi di mercato restano limiti; i tre test hanno differenti date e criteri di ingresso. Il confronto causale utile è fra riferimento e modello adattivo sugli stessi episodi. Prestazioni finanziarie, laboratorio retrospettivo Riskfolio ed esperimento sulle skill restano distinti.
