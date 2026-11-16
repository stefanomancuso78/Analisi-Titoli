# Studio sperimentale sui metodi — preregistrazione development-methods-v1

L'ipotesi di ricerca è che una procedura minima possa raggiungere o superare una procedura con skill e revisione umana su compiti determinati. Non è una conclusione già acquisita e non equivale a dimostrare il miglior prodotto sul mercato.

## Tre condizioni

1. minimal: compito, input e criteri di accettazione, senza skill aggiuntive.
2. selected_skills: stesso compito e stessi vincoli, con skill fissata a un commit.
3. skills_human_review: seconda condizione più intervento umano misurato.

Stesso modello/versione, profilo strumenti, budget, input hash e criteri di accettazione in ciascuna replica appaiata. Non eliminare controlli di accesso, privacy o sicurezza nella condizione minima. Non usare credenziali, clienti o transazioni di produzione per esperimenti di sviluppo. Registrare modelli, hash degli output, URL degli artefatti e log, durata e token realmente osservati. Non trasformare caratteri in token.

## Campione e valutazione

Almeno 20 compiti e tre repliche complete per ogni condizione. Verifiche eseguibili dei requisiti e giudizio umano su correttezza, provenienza, robustezza e manutenibilità. Il valutatore non può essere l'autore della registrazione; l'interfaccia nasconde i metadati del metodo nella vista di revisione. L'anonimizzazione del testo non può essere garantita solo nascondendo i metadati: vanno controllati anche gli artefatti. Il proprietario può ottenere l'esportazione non mascherata per l'analisi.

Calcolare le differenze come trattamento meno condizione minima. Aggregare le repliche per compito prima del bootstrap, evitando di trattare repliche correlate come compiti indipendenti. La soglia campionaria abilita l'analisi, non dimostra significatività o superiorità. Un protocollo configurato e test tecnici superati non sono risultati di esecuzioni LLM.

## Percorso operativo

Nel Laboratorio l'amministratore registra compito, criteri e manifesto input. L'hash viene calcolato prima di eseguire i metodi. Ciascun esecutore usa un ambiente isolato e salva artefatti e log. Importare i risultati reali con POST /api/methods/run o con method_run nel tool amministrativo. Le valutazioni indipendenti usano method_review o POST /api/methods/review. Esportare /api/methods?unblind=1 come proprietario e analizzare con quantlab/compare_methods.py. Non riempire il registro con risultati fittizi.

## Stato al 12 novembre 2026

- Repository pubblici OpenAI, Anthropic e obra esaminati a commit fissati; skill finanziaria wshobson ispezionata.
- Otto verifiche locali riproducibili su due script di supporto, con limiti di formato/metrica registrati. Non sono test del vantaggio marginale delle skill sul modello.
- Il preprint SWE-Skills-Bench v1 documenta benefici per alcune skill specializzate e nessun miglioramento per molte altre. Non abbiamo riprodotto quell'esperimento e non attribuiamo i risultati al commit corrente di una skill omonima.
- Nessun confronto Claude-versus-Codex eseguito: non c'è un runtime Claude configurato. Non esistono quindi risultati appaiati del nostro studio da interpretare.
- Il laboratorio Riskfolio è un esperimento storico di allocazione diverso, non una prova su skill o modelli generativi.
- Non sono stati acquisiti dati privati, modelli chiusi o accessi non autorizzati. Licenze e condizioni dei dati rimangono applicabili anche nell'uso accademico.
