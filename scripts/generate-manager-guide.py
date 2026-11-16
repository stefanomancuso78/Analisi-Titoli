from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Flowable
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'docs/StokIQ_Flusso_operativo_per_il_gestore.pdf'
for name,file in [('D','DejaVuSans.ttf'),('DB','DejaVuSans-Bold.ttf'),('DI','DejaVuSans-Oblique.ttf')]:pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/dejavu/'+file))
pdfmetrics.registerFontFamily('D',normal='D',bold='DB',italic='DI',boldItalic='DB')
navy=colors.HexColor('#142F40'); teal=colors.HexColor('#087C69'); muted=colors.HexColor('#5B7180'); line=colors.HexColor('#DFE8ED'); light=colors.HexColor('#F1F7F5')
styles={
 'title':ParagraphStyle('title',fontName='DB',fontSize=24,leading=29,textColor=navy,spaceAfter=10),
 'sub':ParagraphStyle('sub',fontName='D',fontSize=10.3,leading=15,textColor=muted,spaceAfter=12),
 'h':ParagraphStyle('h',fontName='DB',fontSize=12.5,leading=16,textColor=navy,spaceBefore=10,spaceAfter=5),
 'p':ParagraphStyle('p',fontName='D',fontSize=9,leading=13.2,textColor=navy,spaceAfter=7),
 'small':ParagraphStyle('small',fontName='D',fontSize=8.2,leading=12,textColor=muted,spaceAfter=7),
 'cell':ParagraphStyle('cell',fontName='D',fontSize=8.1,leading=11.5,textColor=navy),
 'white':ParagraphStyle('white',fontName='DB',fontSize=8.5,leading=12,textColor=colors.white),
 'kicker':ParagraphStyle('kicker',fontName='DB',fontSize=8,leading=11,textColor=teal,spaceAfter=10),
}
W,H=A4; width=W-100
story=[]
def p(text,style='p'):return Paragraph(text,styles[style])
def add(text,style='p'):story.append(p(text,style))
def heading(k,title,sub):
 add(k.upper(),'kicker');add(title,'title');add(sub,'sub')
def section(title,text):
 story.append(KeepTogether([p(title,'h'),p(text)]))
def box(title,text):
 t=Table([[p(title,'h')],[p(text)]],colWidths=[width-28]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),light),('BOX',(0,0),(-1,-1),.5,line),('LEFTPADDING',(0,0),(-1,-1),14),('RIGHTPADDING',(0,0),(-1,-1),14),('TOPPADDING',(0,0),(-1,0),8),('BOTTOMPADDING',(0,-1),(-1,-1),10)]));story.extend([Spacer(1,8),t,Spacer(1,8)])
def table(headers,rows,widths):
 data=[[p(h,'white') for h in headers]]+[[p(c,'cell') for c in row] for row in rows]
 t=Table(data,colWidths=widths,hAlign='LEFT',repeatRows=1)
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),11),('RIGHTPADDING',(0,0),(-1,-1),11),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,1),(-1,-1),.5,line),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F5F8FA')])]))
 story.extend([t,Spacer(1,10)])
class FlowDiagram(Flowable):
 def __init__(self):Flowable.__init__(self);self.width=width;self.height=371
 def draw(self):
  c=self.canv
  items=[('01','FONTI','Comunicazioni, bilanci, brevetti e stampa'),('02','MEMORIA E GRAFO','Documenti, date, identità e collegamenti verificabili'),('03','VERIFICA ECONOMICA','Rilevanza, impatto atteso, rischi e contro-evidenze'),('04','DECISIONE DI RICERCA','Approfondimento, allerta oppure previsione qualificata'),('05','TEST E PORTAFOGLI VIRTUALI','Regole registrate prima di osservare il risultato'),('06','ESITI E NUOVE VERSIONI','Misura degli esiti; affinamento valido solo per il futuro')]
  for i,(num,title,body) in enumerate(items):
   y=self.height-53-i*63
   c.setFillColor(light if i%2==0 else colors.HexColor('#F5F8FA'));c.setStrokeColor(line);c.roundRect(0,y,self.width,53,8,stroke=1,fill=1)
   c.setFillColor(teal);c.roundRect(12,y+12,30,29,6,fill=1,stroke=0);c.setFillColor(colors.white);c.setFont('DB',10);c.drawCentredString(27,y+22,num)
   c.setFillColor(navy);c.setFont('DB',9);c.drawString(55,y+33,title);c.setFont('D',8.5);c.setFillColor(muted);c.drawString(55,y+16,body)
   if i<5:
    c.setStrokeColor(teal);c.setLineWidth(1);c.line(self.width/2,y-1,self.width/2,y-8);c.line(self.width/2-3,y-5,self.width/2,y-8);c.line(self.width/2+3,y-5,self.width/2,y-8)
heading('Guida per il gestore · 13 novembre 2026','Come funziona StokIQ','Dall’informazione al segnale, dal portafoglio simulato alla verifica dei risultati. Una guida al processo attualmente implementato.')
add('StokIQ è un sistema sperimentale di ricerca finanziaria e simulazione. Parte dalle informazioni raccolte, costruisce ipotesi verificabili e segue ciò che accade dopo. Il paniere può ampliarsi quando emergono nuove società qualificate: non è soltanto una lista fissa di titoli da commentare.')
story.extend([Spacer(1,8),FlowDiagram()])
box('Il principio centrale','Conservare ciò che era noto al momento della scelta e confrontarlo con gli esiti successivi. Il movimento di un prezzo dopo una notizia <b>non dimostra, da solo, un rapporto di causa ed effetto</b>.')
add('Lettura rapida: schema a pagina 1; fonti a pagina 2; grafo delle conoscenze a pagina 3; test a pagina 4; capitale a pagina 5; automiglioramento a pagina 6; verifiche e limiti a pagina 7.','small')
story.append(PageBreak())
heading('01 / Osservare e comprendere','Dalle fonti alla tesi','Prima si verifica l’informazione. Poi si valuta se può avere conseguenze economiche per una società o per altre imprese collegate.')
section('1. Acquisire le informazioni','Il sistema osserva le fonti collegate: Investor Relations, documenti SEC e dati di bilancio strutturati, fonti regolatorie e cliniche, brevetti e feed di stampa. Per la stampa pubblica può disporre del solo titolo, editore e collegamento: questo viene distinto dalla lettura integrale di un documento primario. La copertura dei connettori è parziale e gli errori sono registrati.')
section('2. Conservare una storia verificabile','Documento o metadati, URL, impronta digitale, data di acquisizione e data pubblica verificabile restano associati. Le revisioni non cancellano la versione precedente. Un documento storico acquisito oggi non produce una previsione retrodatata. Le informazioni poco rilevanti restano in archivio.')
section('3. Collegare le informazioni nel grafo','Il grafo collega società, documenti e relazioni. Distingue una semplice menzione, una relazione documentata e un’ipotesi su un concorrente. Può riconoscere società esterne al paniere senza inserirle automaticamente tra gli investimenti. Ogni collegamento mantiene evidenza e data di disponibilità.')
section('4. Stabilire cosa merita attenzione','Il primo filtro assegna priorità: un normale cambio di CFO tende a essere poco rilevante; rettifiche contabili, restrizioni o crisi richiedono una verifica più urgente. L’analisi dei testi primari considera ricavi, margini, cassa, dimensione dell’evento, tempi, aspettative, rischi ed elementi contrari. Registra le citazioni a supporto. Se mancano prove, il giudizio può rimanere incerto.')
box('Esempio: Nvidia → AMD','Una notizia su Nvidia può aprire una verifica del rischio anche se la società è fuori dal paniere. AMD può diventare un’ipotesi di beneficiario indiretto, ma servono prove su prodotti sostituibili, capacità, domanda e margini. Potrebbe anche esserci un rischio comune al settore. Il collegamento nel grafo <b>non equivale a un acquisto di AMD</b>.')
add('Il processo pianificato utilizza ChatGPT per leggere e interpretare i testi acquisiti; le regole numeriche gestiscono filtri, registrazioni, simulazioni e controlli. Una dichiarazione societaria verificata rimane la posizione dell’emittente, non una conferma indipendente dell’impatto sul prezzo.','small')
story.append(PageBreak())

heading('02 / La memoria che collega le informazioni','Perché serve il grafo delle conoscenze','“Grafo delle conoscenze”, o knowledge graph, significa una mappa di fatti collegati: chi riguarda ogni informazione, da dove arriva e quando era disponibile.')
add('Immaginalo come <b>una rubrica e un diario collegati fra loro</b>. La rubrica riconosce le aziende e le loro relazioni; il diario conserva documenti, date e revisioni. Così una notizia di oggi può essere letta insieme a un fatto di mesi prima, senza dipendere dalla memoria di chi sta analizzando.')
class KnowledgeMap(Flowable):
 def __init__(self):Flowable.__init__(self);self.width=width;self.height=215
 def draw(self):
  c=self.canv;cx=self.width/2;cy=106;bw=164;bh=46
  nodes=[(0,164,'Un brevetto','Documento e data'),(self.width-bw,164,'Un accordo commerciale','Partner e fonte'),(0,9,'Un bilancio successivo','Numeri e periodo'),(self.width-bw,9,'Società Beta','Possibile concorrente')]
  c.setStrokeColor(colors.HexColor('#91B9AF'));c.setLineWidth(1.3)
  for x,y,t,sub in nodes:c.line(cx,cy,x+bw/2,y+bh/2)
  for x,y,t,sub in nodes:
   c.setFillColor(light);c.setStrokeColor(line);c.roundRect(x,y,bw,bh,8,fill=1,stroke=1);c.setFillColor(navy);c.setFont('DB',8.8);c.drawCentredString(x+bw/2,y+28,t);c.setFont('D',8);c.setFillColor(muted);c.drawCentredString(x+bw/2,y+13,sub)
  c.setFillColor(teal);c.roundRect(cx-76,cy-23,152,46,9,fill=1,stroke=0);c.setFillColor(colors.white);c.setFont('DB',11);c.drawCentredString(cx,cy+3,'Società Alfa');c.setFont('D',8);c.drawCentredString(cx,cy-11,'Identità verificata')
add('Esempio inventato, per spiegare la logica. Le linee rappresentano collegamenti da documentare, non prove di un effetto sul prezzo.','small')
story.append(KnowledgeMap())
section('Cosa permette di capire nel tempo','A gennaio Alfa pubblica un brevetto: è un fatto, ma non sappiamo se produrrà ricavi. A marzo comunica un accordo: il sistema può ritrovare il brevetto e verificare se riguarda quella tecnologia. A giugno il bilancio può offrire numeri con cui controllare l’ipotesi. Il valore della memoria sta nel <b>ricostruire il percorso</b>, non nel trasformare automaticamente un brevetto in un acquisto.')
section('Perché può riguardare anche altri titoli','Se Alfa e Beta competono nello stesso mercato, un evento su Alfa può suggerire una domanda su Beta. La mappa aiuta a trovare la pista; servono altre evidenze per capire se Beta ne beneficia, ne risente oppure non è coinvolta. Non ogni rapporto fra aziende viene riconosciuto o verificato automaticamente.')
box('Che cosa il grafo non dimostra','“Queste informazioni sono collegate” è diverso da “questa notizia ha causato quel rendimento”. Ogni relazione deve mantenere fonte, data e grado di certezza. Un collegamento incerto rimane un’ipotesi.')
story.append(PageBreak())
heading('03 / Formulare e confrontare','Quando nasce una previsione','Non tutte le informazioni diventano segnali. Il sistema separa ciò che va approfondito, ciò che segnala un rischio e ciò che è qualificato per un test.')
table(['Esito della verifica','Cosa succede'],[
 ('Evidenza insufficiente o impatto incerto','Il caso resta in ricerca. Si raccolgono ulteriori documenti; l’incertezza viene conservata.'),
 ('Rischio su una posizione simulata','Si apre un’allerta per verificare esposizione e tesi. Non viene eseguita una vendita.'),
 ('Caso qualificato','Si registra una previsione con data, evidenze, criteri e versione del modello. Le ricadute indirette restano indicate come ipotesi.')],[155,width-155])
section('Confronti economici coerenti','I confronti di bilancio richiedono metriche, unità e periodi compatibili: trimestre e cumulato non si sommano. Il confronto settoriale richiede almeno tre altre società comparabili. Le soglie iniziali includono 15 punti percentuali di scarto nella crescita dei ricavi dal settore, 3 punti nella variazione del margine operativo e 5% di revisione di guidance comparabile. Sono filtri operativi versionati, non soglie ottimali già dimostrate. Il consenso degli analisti non è collegato.')
table(['Gruppo','Funzione del confronto'],[
 ('Test 1 · riferimento','Mantiene il protocollo originario congelato e prosegue la misurazione degli episodi già registrati.'),
 ('Test 2 · analisi economica','Confronta prezzo più interpretazione economica con un controllo basato sui prezzi, sugli stessi casi.'),
 ('Test 3 · adattivo sperimentale','Raccoglie esiti per confrontare versioni nuove con un riferimento congelato. Le versioni sperimentali operano in parallelo, senza ordini reali.')],[155,width-155])
section('Ingresso e orizzonte di osservazione','L’ingresso simulato usa una chiusura completa successiva alla data di pubblicazione della previsione. I test principali misurano l’esito a 30 giorni di calendario dall’ingresso. Prezzi mancanti, valute incoerenti o operazioni societarie sospette possono sospendere la valutazione.')
box('Come leggere il rendimento medio dei tre gruppi','È una media equiponderata per titolo, usando l’ultimo episodio di ciascuna società. I casi non valutabili sono esclusi e il denominatore resta visibile. <b>Non è il rendimento di un portafoglio</b>; differenze nelle date e nei titoli impediscono di decretare il modello migliore guardando soltanto la media grezza.')
story.append(PageBreak())
heading('04 / Simulare il capitale','Dal segnale al portafoglio','L’utente imposta un budget, sceglie euro o dollari e seleziona un profilo. Il capitale viene distribuito soltanto tra candidati e dati idonei.')
table(['Profilo','Esposizione obiettivo','Limite per titolo','Limite per settore'],[
 ('Basso','30%','5%','20%'),('Medio','60%','10%','35%'),('Alto','90%','15%','50%')],[85,145,130,width-360])
add('Le percentuali si riferiscono al budget. Sono impostazioni sperimentali di allocazione, non una certificazione del rischio del cliente. L’obiettivo di esposizione può non essere raggiunto.','small')
section('Come viene distribuito il budget','Il simulatore combina i candidati qualificati con i limiti di concentrazione. L’opzione HRP, cioè allocazione gerarchica del rischio, considera correlazioni e volatilità su 60 rendimenti comuni. Una serie storica insufficiente non viene sostituita da dati inventati. Il confronto sperimentale sul capitale segue HRP ed equiponderazione nei tre profili: sei portafogli distinti quando i requisiti sono soddisfatti.')
box('Perché può restare molta liquidità','Se è idoneo un solo titolo, il profilo alto non può investirvi il 90% del budget: il limite per singola società è il 15%. Con pochi candidati, i vincoli possono quindi lasciare una quota liquida elevata. Aumentare il rischio scelto non elimina i requisiti di evidenza e diversificazione.')
section('Come si misura la performance','La valorizzazione distingue attesa di ingresso, posizione aperta, caso concluso e dati mancanti. Mostra i risultati secondo i prezzi disponibili e i criteri del relativo esperimento, con costi e cambi dove previsti. Il portafoglio usa cambi datati; l’ottimizzazione sui rendimenti locali non stima l’intero rischio valutario. Un benchmark è utilizzabile solo quando il confronto è coerente.')
section('Quando valutare un’uscita','Un monitor separato osserva performance, arretramento dai massimi, tempo trascorso, calendario e invalidazione della tesi. Nuove evidenze o cambi di scenario possono generare una verifica dell’uscita. Le uscite sperimentali restano separate dal risultato del test congelato: non riscrivono l’esperimento e non inviano ordini al broker.')
section('Profili dei clienti e ruolo del gestore','L’area portafogli può organizzare simulazioni riferite ai clienti del gestore, con i relativi permessi. Il gestore consulta motivazioni, fonti, rischi e risultati; l’amministratore gestisce configurazioni e accessi. La simulazione non sostituisce la valutazione di adeguatezza o una decisione professionale sul cliente.')
story.append(PageBreak())

heading('05 / Come si affina il sistema','Che cosa significa “automigliorarsi”','Significa usare gli errori e i risultati osservati per proporre criteri futuri più utili. Non significa indovinare sempre, imparare dopo ogni notizia o cambiare continuamente le regole dei test già iniziati.')
section('1. Scrive la valutazione prima di conoscere l’esito','Registra ciò che sa in quel momento: fonti, previsione, criteri, versione del modello e data. È come consegnare una risposta prima che venga pubblicata la soluzione. Non può usare un’informazione scoperta dopo per migliorare artificialmente una previsione passata.')
section('2. Aspetta e misura che cosa è successo','Osserva i prezzi nelle scadenze previste e confronta gli esiti con quanto aveva registrato. Conserva anche risultati negativi, casi senza dati e notizie che non hanno generato un segnale. Un esito mancante non viene considerato un successo e non viene messo a zero.')
section('3. Cerca regolarità su un numero sufficiente di casi','Non basta che un titolo salga una volta. Il sistema attende campioni distribuiti nel tempo. Può stimare quali caratteristiche dei segnali aiutano le previsioni e quali categorie di notizie meritano più attenzione. Il modello che ordina le ricerche e quello che valuta la direzione del titolo rispondono a domande diverse.')
section('4. Prepara una nuova versione e la mette alla prova','Una parte dei casi serve per elaborare i nuovi pesi; un’altra parte, separata prima degli esiti, serve per valutarli. È la differenza fra <b>studiare sugli esercizi e fare un esame su altre domande</b>. La nuova versione viene confrontata con il riferimento precedente in una simulazione parallela, senza ordini reali.')
section('5. Applica eventuali affinamenti soltanto al futuro','I nuovi pesi valgono per le valutazioni successive, non riscrivono quelle vecchie. I protocolli congelati restano tali. Il sistema non modifica indistintamente ogni regola e non promuove automaticamente un modello sperimentale al posto di quello di riferimento.')
box('Esempio semplice: notizia utile o rumore?','Immaginiamo che le normali nomine manageriali siano spesso seguite da movimenti modesti, mentre alcune revisioni di guidance siano seguite da movimenti più ampi rispetto al mercato. Su abbastanza casi comparabili, il modello può dare maggiore priorità di lettura alla seconda categoria. Questo <b>non dimostra che la notizia causi il movimento né che il prossimo titolo salirà</b>.')
add('L’automiglioramento è quindi un processo verificabile: osservare → misurare → proporre → confrontare. Un miglioramento resta un’ipotesi finché i risultati su casi nuovi non lo sostengono.','small')
story.append(PageBreak())
heading('06 / Controllare l’apprendimento','Dagli esiti alle nuove versioni','L’apprendimento richiede risultati maturi e confronti separati. Raccogliere osservazioni non significa avere già dimostrato un vantaggio predittivo.')
section('Tre domande diverse','<b>Direzione:</b> il segnale anticipa l’esito del titolo?<br/><b>Rilevanza:</b> quali categorie di notizie meritano attenzione, anche tra quelle scartate?<br/><b>Capitale:</b> come cambia il risultato distribuendo diversamente lo stesso budget? I confronti restano distinti per non confondere qualità del segnale e qualità dell’allocazione.')
table(['Meccanismo','Quando può affinarsi'],[
 ('Test 3 · nuove previsioni','Almeno 20 esiti maturati di addestramento, distribuiti su due coorti giornaliere. I gruppi di verifica, detti coorti, sono separati prima di conoscerne gli esiti.'),
 ('News qualificate · direzione','Osservazioni a 1, 5 e 20 giorni; addestramento sugli esiti a 20 giorni, con almeno 20 casi maturi e tre coorti.'),
 ('News anche senza segnale · priorità','Unità società/giorno, incluse ipotesi incerte. Servono almeno 20 unità mature a 5 giorni, tre società e tre coorti, con benchmark coerente e volatilità precedente disponibile.')],[165,width-165])
add('La priorità delle news misura l’ampiezza relativa dei movimenti successivi, non la loro causa né la probabilità di profitto. Modifica soltanto l’ordine delle ricerche future entro lo stesso livello di urgenza. I titoli stampa ripetuti sulla stessa società nello stesso giorno non diventano osservazioni indipendenti.','small')
section('Cosa cambia e cosa resta fermo','Ogni nuova versione conserva dati usati, pesi e data di attivazione. Vale per le previsioni successive. Le precedenti mantengono i criteri originali; i test congelati restano confrontabili. Le versioni sperimentali non vengono promosse automaticamente. Lo stato dell’apprendimento e il numero di versioni addestrate sono visibili nel sito. Finché i campioni non bastano, il sistema raccoglie osservazioni: non va presentato come già migliorato.')
section('Cosa controllare nel sito','<b>Test 1 · 2 · 3:</b> risultati e denominatori. <b>Notizie e impatti:</b> archivio, verifiche, allerte e osservazioni. <b>Bilanci:</b> metriche e confronti. <b>Osservatorio / Previsioni:</b> candidati e motivazioni. <b>Portafogli / Uscite:</b> capitale e verifiche. <b>Fonti / Laboratorio:</b> copertura, errori e studi storici separati. <b>FAQ:</b> guida e suggerimenti del gestore.')
box('Operatività e limiti attuali','Il processo è pianificato su base <b>oraria</b>: non è un servizio in tempo reale e non garantisce uscite immediate. Copertura di stampa, brevetti e bilanci parziale; fonti possono essere indisponibili o limitate. Servizi premium e licenze professionali richiedono attivazioni dedicate. Nessun ordine reale e nessuna garanzia di rendimento.')
add('<link href="https://stokiq.online/#faq" color="#087C69">stokiq.online · FAQ e guida operativa</link>  |  Documento descrittivo del flusso implementato al 13 novembre 2026. I contatori e lo stato dei singoli casi cambiano nel sito.','small')

story.append(PageBreak())
heading('07 / Prezzo e aspettative','Il mercato può arrivare prima','Un brevetto o un annuncio può cambiare le aspettative subito, mentre gli effetti sui risultati arrivano molto più tardi.')
section('Tre livelli da distinguere','<b>Informazioni disponibili:</b> cosa era pubblico e quando lo abbiamo acquisito.<br/><b>Reazione del mercato:</b> come si muove il prezzo prima e dopo la notizia.<br/><b>Effetto economico:</b> se e quando possono cambiare ricavi, margini o rischi. Una reazione forte non dimostra da sola un effetto economico duraturo.')
box('Il percorso dell’osservatore','Documento datato → movimento precedente → chiusura iniziale successiva → osservazioni a 1, 5 e 20 sedute → confronto con SPY se disponibile → memoria collegata al documento nel grafo.')
section('Cosa fa oggi','L’Osservatorio registra separatamente queste misure. Conserva una rilevazione giornaliera e aggiorna il quadro più recente. Se il documento è stato acquisito dopo la pubblicazione, lo indica come retrospettivo. I tre test congelati e le loro decisioni non vengono modificati.')
section('Cosa non possiamo dedurre','Un movimento precedente non prova una fuga di notizie. Altri eventi, il settore o il mercato possono spiegare il prezzo. Non attribuiamo automaticamente un’emozione agli investitori e non chiamiamo causa un semplice collegamento temporale.')
section('Il limite delle chiusure giornaliere','La misura parte dalla prima chiusura disponibile strettamente successiva alla data della pubblicazione: esclude la reazione immediata e il salto di apertura. Misura sedute osservate, non rendimenti eseguibili. I dati mancanti restano mancanti; discontinuità evidenti richiedono verifica.')
box('Per un vero modello di breve','Occorrono prezzi intraday, orari precisi delle notizie, misure delle aspettative precedenti e campioni sufficienti. Questo osservatore prepara dati verificabili per un esperimento futuro: non è già un modello emotivo addestrato o una regola di acquisto.')

def page(c,doc):
 c.saveState();c.setFillColor(navy);c.setFont('DB',19);c.drawString(50,H-43,'Stok');c.setFillColor(teal);c.drawString(96,H-43,'IQ');c.setFont('D',8);c.setFillColor(muted);c.drawRightString(W-50,H-39,'GUIDA OPERATIVA / GESTORE');c.setStrokeColor(line);c.line(50,H-57,W-50,H-57)
 c.line(50,43,W-50,43);c.setFont('D',7.3);c.setFillColor(muted);c.drawString(50,29,'StokIQ · Ricerca e simulazione · 13 novembre 2026');c.drawRightString(W-50,29,f'{doc.page} / 8');c.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=50,leftMargin=50,topMargin=76,bottomMargin=48,title='StokIQ — Il flusso operativo spiegato al gestore',author='StokIQ',subject='Fonti, segnali, portafogli simulati e apprendimento sperimentale')
doc.build(story,onFirstPage=page,onLaterPages=page)
r=PdfReader(str(OUT));print({'file':str(OUT),'pages':len(r.pages),'bytes':OUT.stat().st_size,'characters':[len(x.extract_text()) for x in r.pages]});assert len(r.pages)==8,'Unexpected page overflow'
