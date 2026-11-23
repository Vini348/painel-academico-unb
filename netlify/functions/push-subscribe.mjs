const json = (body, status=200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const auth = request.headers.get('authorization') || '';
  if (!url || !anon || !auth.startsWith('Bearer ')) return json({ error: 'Configuração ou sessão ausente.' }, 401);
  try {
    const userRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } });
    if (!userRes.ok) return json({ error: 'Sessão inválida. Entre novamente no Painel.' }, 401);
    const user = await userRes.json();
    const body = await request.json();
    if (!body.subscription?.endpoint || !body.subscription?.keys?.p256dh || !body.subscription?.keys?.auth) return json({ error: 'Inscrição push inválida.' }, 400);
    const row = { user_id: user.id, endpoint: body.subscription.endpoint, p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth, preferences: body.preferences || {}, updated_at: new Date().toISOString() };
    const save = await fetch(`${url}/rest/v1/push_subscriptions?on_conflict=user_id,endpoint`, { method: 'POST', headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
    if (!save.ok) { const detail = await save.text(); return json({ error: 'Não foi possível salvar a inscrição push.', detail }, 400); }
    return json({ ok: true });
  } catch (error) { return json({ error: error.message }, 500); }
};
