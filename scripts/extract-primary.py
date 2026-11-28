#!/usr/bin/env python3
"""Deterministic complete acquisition extraction; no inference or paid services."""
import sys,json,re,subprocess
from html.parser import HTMLParser
class Text(HTMLParser):
 def __init__(self): super().__init__(convert_charrefs=True);self.skip=[];self.parts=[]
 def handle_starttag(self,tag,attrs):
  if tag in ['script','style','nav','footer','header','noscript']:self.skip.append(tag)
 def handle_endtag(self,tag):
  if self.skip and tag==self.skip[-1]:self.skip.pop()
 def handle_data(self,text):
  if not self.skip:self.parts.append(text)
path,fmt=sys.argv[1:3]
if fmt=='pdf':
 info=subprocess.run(['pdfinfo',path],capture_output=True,text=True,timeout=20,check=True).stdout
 pages=int(re.search(r'^Pages:\s*(\d+)',info,re.M).group(1))
 if not 1<=pages<=2000:raise ValueError('Unsupported document size: too many pages')
 text=subprocess.run(['pdftotext','-enc','UTF-8','-layout',path,'-'],capture_output=True,text=True,timeout=40,check=True).stdout
else:
 parser=Text();parser.feed(open(path,encoding='utf-8',errors='replace').read());text=' '.join(parser.parts);pages=None
text=re.sub(r'\s+',' ',text).strip()
if len(text)>500000 or len(text.encode('utf-8'))>600000:raise ValueError('Document too large for complete-text receipt; no truncation permitted')
if len(text)<150:raise ValueError('Unsupported document: no readable text; OCR or primary alternative required')
print(json.dumps({'text':text,'pages':pages,'complete':True},ensure_ascii=False))
