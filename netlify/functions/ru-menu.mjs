const SOURCE = 'https://ru.unb.br/cardapio-refeitorio/';
const UNITS = [
  ['darcy', 'Cardápio Darcy Ribeiro', 3],
  ['ceilandia', 'Cardápio Ceilândia', 3],
  ['gama', 'Cardápio Gama', 3],
  ['planaltina', 'Cardápio Planaltina', 3],
  ['fazenda', 'Cardápio Fazenda Água Limpa', 2],
];
const decode = (s='') => s.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#8211;|&ndash;/g,'–').replace(/&#8217;|&rsquo;/g,'’').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export default async () => {
  try {
    const response = await fetch(SOURCE, { headers: { 'User-Agent': 'PainelAcademicoUnB/1.0 (menu reader)' } });
    if (!response.ok) throw new Error(`RU respondeu ${response.status}`);
    const html = await response.text();
    const units = {};
    const headings = [...html.matchAll(/<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/gi)];
    for (let i=0; i<UNITS.length; i++) {
      const [key, label, pages] = UNITS[i];
      const h = headings.findIndex(x => decode(x[1]).toLowerCase().includes(label.toLowerCase()));
      if (h < 0) { units[key] = []; continue; }
      const start = headings[h].index + headings[h][0].length;
      const end = headings[h+1]?.index ?? html.length;
      const segment = html.slice(start, end);
      const items = [...segment.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
        .map(m => ({ url: new URL(m[1], SOURCE).href, label: decode(m[2]) }))
        .filter(x => /ISM\s*[–-]/i.test(x.label) && /\.pdf(?:$|\?)/i.test(x.url));
      units[key] = items.map(x => ({ ...x, pages })).sort((a,b) => { const da=(a.label.match(/(\d{2}\/\d{2}\/\d{4})/)||[])[1]||''; const db=(b.label.match(/(\d{2}\/\d{2}\/\d{4})/)||[])[1]||''; const toIso=v=>v?v.split('/').reverse().join('-'):''; return toIso(db).localeCompare(toIso(da)); }).slice(0, 8);
    }
    return new Response(JSON.stringify({ units, source: SOURCE, fetchedAt: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=1800, s-maxage=1800', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Não foi possível obter os cardápios oficiais do RU.', detail: error.message }), { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
};
