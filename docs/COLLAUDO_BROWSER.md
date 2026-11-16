# Collaudo browser isolato

Richiede Chromium installato e Playwright Python. Usa il Worker compilato corrente e una copia del database recuperato, senza chiavi runtime e con richieste esterne disabilitate. Il server ascolta soltanto su 127.0.0.1. La sessione lettore fittizia esiste esclusivamente nel database della prova; non permette accesso al sito pubblicato.

1. Eseguire `node build.mjs`.
2. Avviare `node scripts/browser-qa-server.mjs /percorso/restored.sqlite /nuova/directory/qa`.
3. Eseguire `python scripts/browser-qa.py --output /nuova/directory/qa`.
4. Leggere `report.json` e le immagini `tests-1440.png` e `tests-390.png`.

La prova controlla sei larghezze, da 360 a 1440 pixel; allineamento delle zone delle schede che condividono una riga; apertura di un dettaglio senza allungare i vicini; assenza di overflow orizzontale; tooltip al passaggio del mouse, al tocco e nel dialogo di dettaglio; navigazione delle 11 sezioni su desktop e mobile; errori JavaScript.

Il caso mobile alterna prima eventi mouse e poi touch: verifica il difetto dei tooltip che si chiudevano subito dopo un tap sui dispositivi misti. Le immagini lunghe possono includere la barra di navigazione fissa nella posizione del viewport durante la cattura.

Questo è un collaudo di rendering e interazioni sulla stessa applicazione con dati ripristinati. Non prova la rete del provider, la sessione reale di un cliente o l’accessibilità completa. Non modifica il database operativo e non esegue ordini.
