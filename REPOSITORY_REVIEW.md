# Revisione day-trader-skill

Repository: https://github.com/Jakeschincariol/day-trader-skill
Commit esaminato: 3d0f4ef6986f4984b7c6bd46f7ff4f87744c3abd.
Data: 10 novembre 2026. Licenza MIT, copyright Jake Schincariol. 315 test offline superati nell'ambiente di revisione.

## Valore per StokIQ
- **Rischio separato dalla proposta:** `trader-risk/check.py` verifica un intero batch simulando le allocazioni successive, non soltanto ciascuna operazione isolata. `trader-budget/size.py` separa sizing da controllo. Adottato il principio con un'implementazione JavaScript originale: controllo indipendente dei portafogli prima del salvataggio, concentrazione titolo/settore, budget/cash, duplicati, prezzi/valute validi. Snapshot e scenari comuni -10/-20/-40% sono visibili nel simulatore. Non sono stop garantiti o probabilità.
- **Riproducibilità:** `trader-timemachine/timemachine.py` usa seed e dati identificabili; valida barre complete e separa replay storico da ricampionamento. StokIQ conserva già snapshot di feature, pesi, fonte e versione con test prospettici; mantenere queste proprietà prima di qualunque nuovo backtest.
- **SEC per fondamentali:** `trader-analyst/facts.py` gestisce concetti XBRL alternativi, differenze per banche e quarto trimestre derivato. Buona estensione futura per analisi societaria. Non importato automaticamente: seleziona la dichiarazione più recente per un periodo, quindi un backtest richiede un filtro `filed <= as_of` per evitare revisioni conosciute solo dopo. EPS del quarto trimestre per differenza è approssimativo e va dichiarato.
- **Identità esatta dell'azione approvata:** fingerprint e gate nel broker sono un buon modello per un futuro workflow di proposta/approvazione del gestore. Questa versione resta esclusivamente paper; non sono stati aggiunti connettori di ordini.

## Limiti verificati nel codice
- Le 10.000 traiettorie sono ricampionamenti delle stesse circa 60 sessioni intraday, non 10.000 osservazioni indipendenti. Il campionamento separato per fascia oraria perde parte della dipendenza temporale e dei regimi. Non è un motore di autoapprendimento o evidenza di alpha.
- `simulate` e `history_replay` attribuiscono -1R a uno stop anche se il mercato salta oltre il prezzo: il file lo dichiara. Questa convenzione può sottostimare la perdita. La regola stop-first in una candela che tocca entrambe le soglie è prudente rispetto all'ambiguità intrabar, ma non risolve il rischio gap.
- Yahoo charts è un endpoint non ufficiale con limiti e possibili ritardi. MIT copre il software, non attribuisce i diritti di riutilizzo commerciale dei dati. Non risolve la licenza richiesta per i clienti del gestore.
- Calendario NYSE incorporato limitato a 2026–2027; non rappresenta borse europee né copertura perpetua. Non copiare regole normative senza verifica ufficiale corrente.
- Pelosi/House PTR: il timestamp della pubblicazione è diverso da quello dell'operazione e può essere molto successivo. Utile come disclosure documentale, non copia in tempo reale né segnale economicamente convalidato.
- Il pacchetto è orientato a day trading tecnico su titoli già scelti; non sostituisce la scoperta fonte → evento → impresa → previsione richiesta da StokIQ.

Nessun file SKILL.md remoto è stato installato o eseguito come istruzione, nessuna chiave o broker collegati. Sono stati esaminati come materiale del progetto; sono stati eseguiti solo i test offline. Nessuna promessa di prestazioni dei materiali promozionali è stata assunta come prova.
