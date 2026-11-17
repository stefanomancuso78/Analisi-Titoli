# StokIQ · guida operativa per il gestore
Versione del flusso: 12 novembre 2026. Ricerca e portafogli virtuali; nessun ordine al broker.

## Schema del flusso

FONTI → MEMORIA STORICA E GRAFO → VERIFICA E RILEVANZA → IPOTESI ECONOMICA → PREVISIONE / ALLERTA → PORTAFOGLIO VIRTUALE → ESITI OSSERVATI → NUOVE VERSIONI SPERIMENTALI.

1. **Osservazione.** Fonti primarie: comunicazioni societarie/Investor Relations, depositi SEC e contabilità XBRL, registri regolatori e clinici, brevetti EPO e fonti di ricerca collegate. La stampa viene intercettata come titolo, editore e URL tramite aggregazione pubblica e feed, con filtro di editori. La disponibilità dei singoli connettori è visibile: registrato, acquisito, letto e qualificato sono stati differenti.
2. **Memoria.** Ogni documento/notizia conserva contenuto acquisito o metadati, URL, hash, data di acquisizione e data pubblica quando verificabile. La data con cui un aggregatore vede un articolo non viene spacciata per data di pubblicazione. I documenti storici importati oggi non generano previsioni retrodatate. La notizia poco rilevante resta in archivio.
3. **Grafo.** Collega documenti, società, relazioni documentate e ipotesi successive. Una menzione, una relazione societaria, un’ipotesi di vantaggio competitivo e una previsione sono oggetti distinti. Un catalogo di identità di riferimento, verificato con SEC, consente di riconoscere anche società esterne al paniere senza selezionarle per investimento. Le notizie già archiviate vengono ricollegate quando l’identità è disponibile, mantenendo la nuova data del collegamento. Ogni collegamento conserva evidenza e momento in cui è diventato disponibile. Anche le revisioni dei titoli stampa sullo stesso URL sono registrate, senza cancellare il titolo iniziale. Le ipotesi sui concorrenti sono etichettate come tali.
4. **Scrematura iniziale.** Un normale avvicendamento del CFO tende ad avere priorità bassa. Frode, rettifiche contabili, restrizioni, richiami e altri eventi di rischio aprono una verifica prioritaria. È un filtro di lavoro, non una valutazione economica conclusiva. Un contesto documentato può cambiare il giudizio iniziale.
5. **Verifica economica.** ChatGPT legge i testi primari acquisiti tramite il processo pianificato e registra evento, attribuzione, ricavi/margini/cassa esposti, materialità, tempi, aspettative, contro-evidenze e invalidazione, con citazioni esatte. Una fonte societaria conferma una dichiarazione dell’emittente, non indipendenza o impatto sul prezzo. Unknown è un esito valido.
6. **Confronti numerici.** I conti SEC hanno unità, durata, periodo, accession e data di deposito. Non si sommano trimestre e cumulato. Margini e cassa dopo capex sono derivati solo da voci compatibili. Le deviazioni dalla mediana di settore richiedono almeno tre altre società con periodi comparabili. La guidance si confronta solo se metrica, unità e contesto temporale coincidono; l’ordine usa le date pubbliche dei documenti. Consenso degli analisti non collegato.
7. **Materialità operativa.** Soglie iniziali modificabili dall’amministratore: scarto crescita ricavi dal settore 15 punti percentuali; variazione margine operativo 3 punti percentuali; revisione di guidance comparabile 5%. Sono euristiche, non soglie ottimali provate. Ogni modifica ha una versione; gli scostamenti e le valutazioni precedenti restano conservati. Una deviazione contabile non dimostra che il mercato sia sorpreso.
8. **Due uscite differenti.** Una notizia negativa su un titolo con posizione simulata può aprire un’allerta per verificare subito esposizione e tesi. Una possibile ricaduta su un concorrente apre un’ipotesi da approfondire. Nessuna delle due esegue una vendita o uno scambio automatico di titoli. La notizia non verificata resta distinta dall’evento primario e dalla previsione qualificata.
9. **Previsioni prospettiche.** Una previsione conserva data, caratteristiche, pesi, modello e criteri. L’ingresso simulato richiede una chiusura completa successiva alla data di pubblicazione; non usa il prezzo di riferimento come esecuzione già avvenuta. Per i test finanziari principali l’esito è a 30 giorni di calendario dall’ingresso. Prezzi/valute incoerenti e operazioni societarie sospette sospendono la valutazione.
10. **Allocazione.** Il profilo basso/medio/alto indica un obiettivo di esposizione del 30/60/90%, con limiti per società del 5/10/15% e per settore del 20/35/50%. Non sono classi di rischio certificate. Pochi segnali idonei o dati insufficienti possono lasciare liquidità. Nel simulatore l’utente sceglie capitale e EUR/USD. HRP usa 60 rendimenti comuni e correlazioni, poi applica i limiti. L’ottimizzazione usa rendimenti locali; non stima il rischio valutario. La valorizzazione del portafoglio usa cambi datati.
11. **Controllo e apprendimento.** Anche le notizie mappate senza previsione qualificata hanno controlli prospettici a 1/5/20 giorni, raggruppati per società/giorno. Un modello di priorità richiede almeno 20 unità maturate, tre società e tre coorti, con benchmark e volatilità precedente disponibili. Valuta l’ampiezza relativa dei movimenti successivi, senza attribuirli causalmente alla notizia; ordina solo le ricerche future nello stesso livello di urgenza.  Si conservano anche errori, scarti, mancati ingressi e risultati negativi. Esiti maturati di training e coorti di verifica sono separati prima degli esiti. Le nuove versioni valgono per nuove previsioni, senza riscrivere quelle vecchie. Un prezzo che si muove dopo una notizia è un effetto osservato nel tempo: non prova la causa.

## Il grafo delle conoscenze, in parole semplici

Il knowledge graph è una mappa dei collegamenti tra informazioni: una rubrica delle società unita a un diario dei fatti. Conserva chi riguarda una notizia, da quale documento arriva e quando è diventata disponibile. Serve a ritrovare e confrontare informazioni arrivate in momenti diversi.

Esempio inventato: a gennaio Alfa pubblica un brevetto; a marzo annuncia un accordo; a giugno presenta i risultati. La mappa permette di verificare se i tre fatti riguardano la stessa tecnologia e se l’ipotesi di ricavi trova conferma. Un collegamento con la concorrente Beta apre una domanda su possibili ricadute, non dimostra un beneficio e non genera da solo un acquisto. I collegamenti devono conservare fonti e incertezza; non tutte le relazioni vengono riconosciute automaticamente.

## Come si automigliora, in parole semplici

1. Registra la valutazione prima di conoscere il risultato, con dati, fonti e criteri disponibili allora.
2. Aspetta le scadenze previste e misura gli esiti. Conserva anche errori, dati mancanti e notizie senza segnale.
3. Su abbastanza casi distribuiti nel tempo, cerca quali caratteristiche aiutano le previsioni e quali notizie meritano priorità di lettura. Sono due compiti diversi.
4. Crea una nuova versione e la valuta su casi separati da quelli usati per costruirla: come studiare sugli esercizi e fare un esame su altre domande.
5. Confronta la versione sperimentale con il riferimento precedente, senza ordini reali. I nuovi pesi valgono per valutazioni future; il passato e i test congelati non vengono riscritti. Nessuna promozione automatica.

Se molte nomine ordinarie risultassero poco informative e certe revisioni di guidance fossero seguite da movimenti più ampi rispetto al mercato, il modello di priorità potrebbe dare maggiore attenzione alla seconda categoria. È un esempio della logica, non un risultato già dimostrato. Non significa conoscere la causa del movimento né la direzione futura del prezzo. Finché i campioni non bastano, il sistema raccoglie osservazioni: non va descritto come già migliorato.

## I confronti che girano separatamente

| Componente | Cosa misura | Cosa non implica |
|---|---|---|
| Test 1 | Riferimento originario, regole congelate e risultati storicizzati | Nessuna riscrittura con i metodi nuovi |
| Test 2 | Prezzo + interpretazione economica contro controllo solo prezzo sugli stessi casi | Non prova da solo che il filtro batta il mercato |
| Test 3 | Nuove versioni shadow da esiti maturati; minimo 20 esiti di training e due coorti | Zero versioni addestrate finché la soglia non è raggiunta; nessuna promozione automatica |\n| Test 4 | Decisioni prospettiche selezionate, rendimento netto e confronto appaiato con SPY | Non convalidato finché non maturano campioni e coorti sufficienti; non modifica Test 1–3 |
| Capitale v3.1 | HRP contro equiponderazione, tre profili, sei campioni USD 10.000 quando idonei | Campioni indipendenti; non un unico conto reale da USD 60.000 |
| Memoria news | Ipotesi dirette/indirette e risultati a 1/5/20 giorni di calendario; training su esiti a 20 giorni, almeno 20 esiti su tre coorti | Gossip non diventa conferma; rendimento successivo non identifica causalità |
| Monitor uscite | Performance, arretramento, tempo, calendario e invalidazione documentata; uscite shadow separate | Nessun ordine reale o modifica dei test congelati |
| Laboratori storici | Confronti di allocazione e modelli scikit-learn con separazione temporale | Campione scelto oggi, risultati esplorativi; non validazione prospettica |
| Esperimento sulle skill | Protocollo per confrontare metodi di sviluppo su compiti uguali | Non è un risultato finanziario né un confronto Claude–Codex già eseguito |

## Esempio Nvidia → AMD

Una notizia stampa su Nvidia viene conservata anche se Nvidia non è in portafoglio. Il sistema verifica che si riferisca alla società, cerca una fonte primaria e valuta prodotto coinvolto, scala economica, tempi e aspettative. Se esiste una posizione simulata esposta, una notizia di rischio apre una verifica dell’esposizione. AMD è un possibile concorrente da approfondire, non un beneficiario certo: sostituibilità del prodotto, capacità disponibile, domanda e margini richiedono evidenza. Un problema a Nvidia potrebbe anche indicare un problema per l’intero settore. Entrambe le ipotesi e le revisioni rimangono nella storia.

## Cosa legge il gestore

- **Test 1, 2 e 3:** schede uniformi. La media del gruppo è equiponderata per titolo, ultimo episodio per società, con numero di titoli valutabili; non è rendimento del portafoglio. Casi senza ingresso/prezzo sono esclusi, non messi a zero.\n- **Test 4:** casi prospettici distinti con protocollo congelato, ingressi/esiti appaiati a SPY e costi convenzionali; l'assenza di esiti maturati non equivale a rendimento zero.
- **Notizie e impatti:** archivio, priorità, evidenze, allerte, deviazioni finanziarie e apprendimento shadow.
- **Bilanci e guidance:** confronti numerici, fonte, periodo e distinguo fra risultati e dichiarazioni previsionali.
- **Osservatorio / Previsioni:** segnali documentali, candidati, previsioni e scheda del titolo con motivazioni ed evidenze.
- **Decisioni:** tesi, rischi, invalidazioni, giudizi del gestore e revisioni append-only.
- **Portafogli / Uscite:** budget, rischi, allocazione, performance, benchmark e verifiche dell’uscita.
- **Fonti / Laboratorio:** accessi effettivi, code, errori, heartbeat, backup e report separati.
- **FAQ e suggerimenti:** guida e registro delle osservazioni. L’invio non modifica automaticamente le regole e non manda email.

## Limiti operativi da conoscere

Il ciclo pianificato è orario: non è trading in tempo reale e non può garantire un’uscita immediata. La copertura di stampa, brevetti e conti non è completa; alcuni feed possono fallire o restare in attesa. Il sistema opera su dati verificabili disponibili e registra le lacune. Un backup verificato non equivale a una prova completa di ripristino dell’hosting.

La licenza professionale dei dati e le attivazioni dei servizi premium richiedono il relativo account/contratto. Quartr, RavenPack, AlphaSense e Patsnap proprietari non sono dichiarati collegati. Qlib/RD-Agent e QuantConnect/LEAN non sono runtime installati: sono stati adottati alcuni metodi e componenti aperti, tra cui Riskfolio per verifiche quantitative e scikit-learn per il laboratorio. Nel Worker HRP è un’implementazione nativa verificata numericamente contro Riskfolio, non il pacchetto Python in esecuzione.

L’accesso con password consente la consultazione; configurazioni, soglie, credenziali e ruoli richiedono un vero amministratore. I dati e i giudizi sono sperimentali, senza garanzie di rendimento.

## Come leggere i grafici degli andamenti

- Le curve dei Test 1, 2 e 3 registrano nel tempo la media mostrata nelle rispettive schede, conservando il numero di titoli misurabili di ciascun punto. Test 4 ha una serie distinta sul rendimento netto medio dei casi selezionati appaiati a SPY, solo quando maturati: non confrontare direttamente le quattro curve. Non ricostruiscono una storia precedente all’avvio della registrazione. L’ingresso di nuove società può cambiare la media anche senza un movimento di prezzo.
- La media dei segnali documentali ha una curva separata nell’Osservatorio. Non è rendimento di un conto o prova dell’efficacia predittiva.
- Il grafico del portafoglio usa le valorizzazioni effettivamente registrate dal motore. Si può leggere come rendimento percentuale o capitale nella valuta scelta. I benchmark compaiono soltanto quando esistono dati confrontabili.
- La scheda del titolo mostra le chiusure disponibili in valuta locale, da un provider coerente. Non equivale alla performance di un acquisto. Discontinuità importanti interrompono la linea per verifica.
- Una sola rilevazione è mostrata come punto; un dato mancante non diventa zero. Il processo orario aggiorna le rilevazioni senza richiedere al gestore di selezionare manualmente i titoli. Mouse, tocco e frecce della tastiera permettono di leggere i valori.

## Mercato, aspettative e tempi della notizia

Il mercato può muoversi sulle aspettative prima che un brevetto o un annuncio produca ricavi. Distinguiamo quindi tre domande: che cosa era noto prima, come si muove il prezzo, quali effetti economici sono plausibili. Una variazione prima della pubblicazione non dimostra una fuga di notizie: possono esserci altri eventi o un movimento generale del mercato.

L’Osservatorio ospita un monitoraggio separato: movimento nelle cinque sedute precedenti e rendimenti dopo 1, 5 e 20 sedute osservate, con differenza rispetto a SPY quando disponibile. Il confronto successivo parte dalla prima chiusura disponibile dopo la data di pubblicazione: non cattura la reazione immediata né il salto di apertura. Mancanze e discontinuità dei prezzi restano visibili, senza sostituirle con zeri. Sono associazioni descrittive, non prove di causalità o consigli di ingresso.

Documento → data di pubblicazione e acquisizione → movimento precedente → osservazione successiva → confronto di mercato → memoria del grafo. Le rilevazioni giornaliere vengono conservate senza riscriverle; il quadro più recente viene aggiornato automaticamente. Un documento acquisito dopo la pubblicazione è indicato come retrospettivo e non diventa una previsione storica.

Questo osservatore non cambia le regole dei test 1, 2 e 3 e non si presenta come un modello emotivo già addestrato. Servono un feed intraday affidabile, orari precisi delle notizie, misure delle aspettative e un campione prospettico sufficiente prima di sperimentare decisioni di breve periodo. I dati ottenuti ora possono aiutare a progettare e verificare quel modello successivo.
