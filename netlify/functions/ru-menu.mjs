const SOURCE = 'https://ru.unb.br/cardapio-refeitorio/';
const UNITS = [
  ['darcy', 'Cardápio Darcy Ribeiro'],
  ['ceilandia', 'Cardápio Ceilândia'],
  ['gama', 'Cardápio Gama'],
  ['planaltina', 'Cardápio Planaltina'],
  ['fazenda', 'Cardápio Fazenda Água Limpa'],
];
const decode = (s='') => s.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#8211;|&ndash;/g,'–').replace(/&#8217;|&rsquo;/g,'’').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const isoDate = (d) => { const m=d.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const clean = (s='') => s.replace(/\s+/g,' ').replace(/[|•]+/g,' ').trim();

async function extractPdf(url, pdfjs) {
  const response = await fetch(url, { headers: { 'User-Agent': 'PainelAcademicoUnB/1.0' } });
  if (!response.ok) throw new Error(`PDF respondeu ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const meals = [];
  for (let pageNo=1; pageNo<=Math.min(pdf.numPages,3); pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const items = content.items.filter(x => x.str && x.str.trim()).map(x => ({ text: clean(x.str), x: x.transform[4], y: x.transform[5] }));
    const dateItems = items.filter(x => /\d{2}\/\d{2}\/\d{4}/.test(x.text)).sort((a,b)=>a.x-b.x);
    const dates = dateItems.map(x=>({date:isoDate(x.text),x:x.x})).filter(x=>x.date);
    if (!dates.length) { meals.push({}); continue; }
    const centers = dates.slice(0,7);
    const sortedY = [...items].sort((a,b)=>b.y-a.y);
    const lines=[];
    for (const it of sortedY) {
      let line=lines.find(l=>Math.abs(l.y-it.y)<2.5);
      if (!line) { line={y:it.y,items:[]}; lines.push(line); }
      line.items.push(it);
    }
    lines.sort((a,b)=>b.y-a.y);
    const rows=[]; let current=null;
    for (const line of lines) {
      const parts=line.items.sort((a,b)=>a.x-b.x);
      const labelParts=parts.filter(x=>x.x<centers[0].x-18).map(x=>x.text);
      const label=clean(labelParts.join(' '));
      const values=Array(centers.length).fill('');
      for (const part of parts) {
        if (part.x<centers[0].x-18) continue;
        let idx=0,dist=Infinity;
        centers.forEach((c,i)=>{const d=Math.abs(c.x-part.x);if(d<dist){dist=d;idx=i;}});
        values[idx]=(values[idx]+' '+part.text).trim();
      }
      if (label && !/^\d{2}\/\d{2}\/\d{4}$/.test(label) && !/^(COMPOSIÇÃO|CARDÁPIO SEMANAL)$/i.test(label)) {
        current={label,values}; rows.push(current);
      } else if (current && values.some(Boolean)) {
        values.forEach((v,i)=>{if(v)current.values[i]=(current.values[i]+' '+v).trim();});
      }
    }
    meals.push({ dates:centers.map(x=>x.date), rows });
  }
  return meals;
}

function makeMealData(mealPages, dayIndex) {
  const result=[];
  mealPages.forEach((page,mealIndex)=>{
    const lines=(page.rows||[]).map(r=>({label:r.label,value:r.values?.[dayIndex]||''})).filter(r=>r.value);
    const ovoRow=lines.find(r=>/PRATO PRINCIPAL OVOLACTO/i.test(r.label));
    const veganRow=lines.find(r=>/PRATO PRINCIPAL VEGETARIANO ESTRITO|PRATO PRINCIPAL VEGANO/i.test(r.label));
    const standardRow=lines.find(r=>/PRATO PRINCIPAL PADRÃO/i.test(r.label));
    const shared=lines.filter(r=>!/(PRATO PRINCIPAL (PADRÃO|OVOLACTO|VEGETARIANO ESTRITO|VEGANO))/i.test(r.label));
    const format=(main)=>[...shared, ...(main?[main]:[])].map(r=>`${r.label}: ${r.value}`).join('\n');
    result.push({standard:format(standardRow),ovo:format(ovoRow),vegan:format(veganRow)});
  });
  return result;
}

export default async (request) => {
  try {
    const requestedCampus = new URL(request.url).searchParams.get('campus');
    const selectedUnits = UNITS.filter(([key]) => !requestedCampus || key === requestedCampus);
    if (requestedCampus && !selectedUnits.length) throw new Error('Unidade do RU inválida.');
    const response=await fetch(SOURCE,{headers:{'User-Agent':'PainelAcademicoUnB/1.0 (menu reader)'}});
    if(!response.ok) throw new Error(`RU respondeu ${response.status}`);
    const html=await response.text();
    const headings=[...html.matchAll(/<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/gi)];
    const links={};
    for(const [key,label] of UNITS){
      const h=headings.findIndex(x=>decode(x[1]).toLowerCase().includes(label.toLowerCase()));
      if(h<0){links[key]=[];continue;}
      const start=headings[h].index+headings[h][0].length,end=headings[h+1]?.index??html.length;
      links[key]=[...html.slice(start,end).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
        .map(m=>({url:new URL(m[1],SOURCE).href,label:decode(m[2])}))
        .filter(x=>/ISM\s*[–-]/i.test(x.label)&&/\.pdf(?:$|\?)/i.test(x.url))
        .sort((a,b)=>{const da=isoDate(a.label)||'',db=isoDate(b.label)||'';return db.localeCompare(da);}).slice(0,2);
    }
    const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const days={};
    for(const [key] of selectedUnits){
      days[key]={};
      for(const doc of links[key]){
        const pages=await extractPdf(doc.url,pdfjs);
        const dateList=pages.find(p=>p.dates?.length)?.dates||[];
        for(let dayIndex=0;dayIndex<dateList.length;dayIndex++){
          const date=dateList[dayIndex]; if(!date)continue;
          const mealData=makeMealData(pages,dayIndex);
          days[key][date]={meals:mealData,source:doc.url};
        }
      }
    }
    return new Response(JSON.stringify({days,source:SOURCE,fetchedAt:new Date().toISOString()}),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=1800, s-maxage=1800','Access-Control-Allow-Origin':'*'}});
  } catch(error) {
    return new Response(JSON.stringify({error:'Não foi possível obter e organizar os cardápios oficiais do RU.',detail:error.message}),{status:502,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  }
};
