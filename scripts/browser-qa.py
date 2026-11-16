import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
import argparse
args=argparse.ArgumentParser();args.add_argument('--output',required=True);OUT=Path(args.parse_args().output);OUT.mkdir(parents=True,exist_ok=True)
async def main():
 report={'environment':'isolated restored database + exact current Worker bundle','production_modified':False,'viewports':[],'navigation':[],'modal_tooltips':[],'errors':[]}
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in [1440,1280,1024,768,390,360]:
   context=await browser.new_context(viewport={'width':width,'height':1000},is_mobile=width<600,has_touch=width<600,device_scale_factor=1)
   await context.add_cookies([{'name':'stokiq_session','value':'a'*64,'url':'http://127.0.0.1:18089','secure':False,'httpOnly':True}])
   page=await context.new_page();page.on('pageerror',lambda error:report['errors'].append(str(error)))
   response=await page.goto('http://127.0.0.1:18089',wait_until='networkidle');await page.locator('#parallel-tests > .research-card').nth(2).wait_for();await page.evaluate('document.fonts.ready');await page.wait_for_timeout(250)
   measure=await page.evaluate('''()=>{const cards=[...document.querySelectorAll('#parallel-tests > .research-card')],selectors=['.test-title','.test-description','.test-start','.coverage-metrics','.test-return-basis','.test-coverage'];return {overflow:document.documentElement.scrollWidth>innerWidth+1,viewport:innerWidth,cards:cards.map(c=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,zones:Object.fromEntries(selectors.map(s=>{const e=c.querySelector(':scope > '+s),b=e.getBoundingClientRect();return [s,{top:b.top,height:b.height}]}))}})}}''')
   groups=[]
   for c in measure['cards']:
    group=next((g for g in groups if abs(g[0]['y']-c['y'])<3),None)
    if group is None:groups.append([c])
    else:group.append(c)
   alignment=[]
   for g in groups:
    if len(g)>1:
     for selector in g[0]['zones']:
      values=[c['zones'][selector]['top'] for c in g];alignment.append({'zone':selector,'spread_px':max(values)-min(values)})
   item={'width':width,**measure,'alignment':alignment,'aligned':all(a['spread_px']<=1.5 for a in alignment)}
   before=[c['height'] for c in measure['cards']]
   await page.locator('#parallel-tests > .research-card').nth(2).locator(':scope > details > summary').click();await page.wait_for_timeout(200)
   after=await page.locator('#parallel-tests > .research-card').evaluate_all('(els)=>els.map(c=>c.getBoundingClientRect().height)')
   item['adjacent_cards_independent']=all(abs(before[i]-after[i])<1.5 for i in [0,1]);item['expanded_height']=after[2]
   await page.locator('#parallel-tests > .research-card').nth(2).locator(':scope > details > summary').click();await page.wait_for_timeout(100)
   if width in [1440,390]:
    await page.locator('#parallel-tests').screenshot(path=str(OUT/f'tests-{width}.png'))
    tag=page.locator('#parallel-tests > .research-card > .tag').first
    if width<600:await tag.tap()
    else:await tag.hover()
    tip=page.locator('#product-tooltip');await page.wait_for_timeout(400)
    item['tooltip_visible']=await tip.is_visible()
    if item['tooltip_visible']:
     item['tooltip_text']=(await tip.inner_text())[:250]
     box=await tip.bounding_box();item['tooltip_within_viewport']=box is not None and box['x']>=0 and box['x']+box['width']<=width+1 and box['y']>=0 and box['y']+box['height']<=1001
    await page.keyboard.press('Escape');await page.mouse.move(0,0)
    links=await page.locator('.workspace-nav a').evaluate_all('(els)=>els.map(a=>({href:a.getAttribute("href"),label:a.textContent.trim()}))')
    for link in links:
     anchor=page.locator('.workspace-nav a[href="'+link['href']+'"]');await anchor.scroll_into_view_if_needed();await anchor.click();await page.wait_for_timeout(160)
     check=await page.evaluate('''()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,scroll_width:document.documentElement.scrollWidth,viewport:innerWidth})''')
     report['navigation'].append({'width':width,**link,**check})
    await page.locator('.workspace-nav a[href="#osservatorio"]').click();await page.locator('.stock-open:visible').first.click();await page.locator('#stock-detail[open] .has-tooltip').first.wait_for();modal_tag=page.locator('#stock-detail[open] .has-tooltip').first;await modal_tag.scroll_into_view_if_needed()
    if width<600:await modal_tag.tap()
    else:await modal_tag.hover()
    await page.wait_for_timeout(400);modal_tip=page.locator('#product-tooltip');modal_ok=await modal_tip.is_visible();modal_host=await modal_tip.evaluate('(e)=>e.parentElement.closest("dialog")?.id');report['modal_tooltips'].append({'width':width,'visible':modal_ok,'inside_dialog':modal_host=='stock-detail'})
    await page.locator('#stock-detail-close').click()
    await page.locator('.workspace-nav a[href="#test"]').click();await page.wait_for_timeout(150)
   report['viewports'].append(item);await context.close()
  await browser.close()
 report['passed']=not report['errors'] and all(v['aligned'] and not v['overflow'] and v['adjacent_cards_independent'] for v in report['viewports']) and all(not n['overflow'] for n in report['navigation']) and all(m['visible'] and m['inside_dialog'] for m in report['modal_tooltips']) and all(v.get('tooltip_visible',True) and v.get('tooltip_within_viewport',True) for v in report['viewports'])
 (OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
asyncio.run(main())
