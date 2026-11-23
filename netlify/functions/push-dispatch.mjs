import webpush from 'web-push';
const config = { schedule: '*/15 * * * *' };
const brParts = () => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const v = Object.fromEntries(p.map(x => [x.type, x.value]));
  return { date: `${v.year}-${v.month}-${v.day}`, time: `${v.hour}:${v.minute}` };
};
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00-03:00`); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export { config };
export default async () => {
  const { SUPABASE_URL:url, SUPABASE_SERVICE_ROLE_KEY:key, VAPID_PUBLIC_KEY:pub, VAPID_PRIVATE_KEY:priv, VAPID_SUBJECT:subject='mailto:admin@example.com' } = process.env;
  if (!url || !key || !pub || !priv) { console.error('Push dispatch: configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e VAPID keys.'); return new Response('Push não configurado', { status: 200 }); }
  webpush.setVapidDetails(subject, pub, priv);
  const headers = { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' };
  const get = async (path) => { const r=await fetch(`${url}/rest/v1/${path}`,{headers}); if(!r.ok) throw new Error(await r.text()); return r.json(); };
  const post = async (path, body) => { const r=await fetch(`${url}/rest/v1/${path}`, { method:'POST', headers:{...headers,Prefer:'resolution=ignore-duplicates,return=representation'}, body:JSON.stringify(body) }); if(!r.ok) throw new Error(await r.text()); return r.json(); };
  try {
    const {date,time}=brParts();
    const [subs,events]=await Promise.all([get('push_subscriptions?select=user_id,endpoint,p256dh,auth,preferences'),get(`events?select=id,user_id,title,due_date,course_code,type&due_date=gte.${date}&due_date=lte.${addDays(date,3)}`)]);
    let sent=0;
    for (const sub of subs) {
      const pref=sub.preferences||{};
      const messages=[];
      if(pref.push!==false && pref.academic!==false && time==='08:00') {
        for(const ev of events.filter(e=>e.user_id===sub.user_id)) {
          const days=Math.round((new Date(`${ev.due_date}T00:00:00-03:00`)-new Date(`${date}T00:00:00-03:00`))/86400000);
          const lead=Math.max(0,Math.min(3,Number(pref.lead??1)));
          if(days>=0 && (days===0 || days===lead)) messages.push({key:`event-${ev.id}-${ev.due_date}-${days}`,title:days===0?'Prazo acadêmico hoje':'Prazo acadêmico se aproximando',body:`${ev.title}${ev.course_code?' · '+ev.course_code:''} — ${days===0?'vence hoje':`vence em ${days} dia(s)`}`,url:'/?page=cal'});
        }
      }
      if(pref.push!==false && pref.ru!==false && ['07:00','10:30','16:30'].includes(time)) {
        const campus=pref.ruCampus||'darcy';
        const weekday=new Date(`${date}T12:00:00-03:00`).getDay();
        const weekend=weekday===0||weekday===6;
        const mealAllowed=time==='07:00' ? (campus==='darcy'||campus==='planaltina'||(!weekend&&['ceilandia','gama','fazenda'].includes(campus))) : time==='10:30' ? (campus==='darcy'||campus==='planaltina'||(!weekend&&['gama','fazenda'].includes(campus))||(campus==='ceilandia'&&weekday!==0)) : (campus==='darcy'||campus==='planaltina'||(!weekend&&['ceilandia','gama'].includes(campus)));
        if(mealAllowed) {
          const label=time==='07:00'?'Cardápio do dia':time==='10:30'?'Horário do almoço':'Horário do jantar';
          const meal=time==='07:00'?'Confira o café da manhã e as demais refeições':time==='10:30'?'Consulte o cardápio antes do almoço':'Consulte o cardápio antes do jantar';
          messages.push({key:`ru-${date}-${time}`,title:`RU UnB · ${label}`,body:`${meal} em ${campus}. O cardápio e o funcionamento podem sofrer alterações.`,url:'/?page=ru'});
        }
      }
      for(const msg of messages) {
        const marker=await post('push_deliveries',[{user_id:sub.user_id,delivery_key:msg.key}]);
        if(!marker.length) continue;
        try { await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:msg.title,body:msg.body,url:msg.url,tag:msg.key})); sent++; }
        catch(e) { console.error('Falha push',e.statusCode,e.message); if(e.statusCode===404||e.statusCode===410) await fetch(`${url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,{method:'DELETE',headers}); }
      }
    }
    console.log(`Push dispatch ${date} ${time}: ${sent} enviado(s)`);
    return new Response(`Enviadas ${sent} notificações`,{status:200});
  } catch(error) { console.error(error); return new Response('Erro no envio de notificações',{status:500}); }
};
