import { restaurants } from './restaurants.js';
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const error = (message, status = 400) => json({ error: message }, status);
const tiers = ['S','A','B','C','D','F'];
// Auto-provisioned databases start empty. Initialize idempotently so Git builds
// do not depend on a separately authenticated migrations command.
let schemaReady;
function initialize(db) {
  if (!schemaReady) schemaReady = db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS current_pick (slot INTEGER PRIMARY KEY CHECK(slot=1), id TEXT NOT NULL, restaurant TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, restaurant TEXT NOT NULL, tier TEXT NOT NULL, review TEXT NOT NULL, visit_date TEXT NOT NULL, photo BLOB NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)')
  ]).catch(error => { schemaReady = null; throw error; });
  return schemaReady;
}
const parse = row => row && ({ ...row, restaurant: JSON.parse(row.restaurant) });
const current = async db => parse(await db.prepare('SELECT id, restaurant FROM current_pick WHERE slot=1').first());
function fields(form) {
  const tier = String(form.get('tier') || ''), review = String(form.get('review') || '').trim(), date = String(form.get('date') || '');
  if (!tiers.includes(tier)) throw new Error('Choose a tier.');
  if (!review || review.split(/\s+/u).length > 150) throw new Error('Write a review of 1 to 150 words.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error('Choose a valid date.');
  return { tier, review, date };
}
async function photoBytes(file, required = true) {
  if (!(file instanceof File) || !file.size) { if (required) throw new Error('Add a photo.'); return null; }
  if (file.size > 1200000) throw new Error('Photo is too large. Try another photo.');
  const data = await file.arrayBuffer(), bytes = new Uint8Array(data);
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new Error('Please choose a valid photo.');
  return data;
}
export default { async fetch(request, env) {
  const url = new URL(request.url), db = env.DB;
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (!db) return error('Shared storage is not configured yet.', 503);
  try {
    await initialize(db);
    if (url.pathname === '/api/state' && request.method === 'GET') {
      const [pick, list] = await Promise.all([current(db), db.prepare('SELECT id,restaurant,tier,review,visit_date,created_at FROM reviews ORDER BY visit_date DESC, created_at DESC').all()]);
      return json({ current: pick, reviews: list.results.map(parse) });
    }
    if (url.pathname === '/api/current' && request.method === 'POST') {
      const data = await request.json(), restaurant = restaurants.find(r => r.name === data.name);
      if (!restaurant) return error('Restaurant not found.');
      const id = crypto.randomUUID();
      const inserted = await db.prepare('INSERT INTO current_pick (slot,id,restaurant) VALUES (1,?,?) ON CONFLICT(slot) DO NOTHING').bind(id, JSON.stringify(restaurant)).run();
      return json({ current: await current(db), created: inserted.meta.changes === 1 });
    }
    if (url.pathname === '/api/current' && request.method === 'DELETE') {
      const { id } = await request.json();
      const result = await db.prepare('DELETE FROM current_pick WHERE slot=1 AND id=?').bind(id).run();
      return result.meta.changes ? json({ ok: true }) : error('The current restaurant has changed. Refresh and try again.', 409);
    }
    if (url.pathname === '/api/reviews' && request.method === 'POST') {
      const form = await request.formData(), {tier,review,date} = fields(form), photo = await photoBytes(form.get('photo'));
      const id = crypto.randomUUID(), pickId = String(form.get('pickId') || '');
      const result = await db.batch([
        db.prepare('INSERT INTO reviews (id,restaurant,tier,review,visit_date,photo) SELECT ?,restaurant,?,?,?,? FROM current_pick WHERE slot=1 AND id=?').bind(id,tier,review,date,photo,pickId),
        db.prepare('DELETE FROM current_pick WHERE slot=1 AND id=? AND EXISTS (SELECT 1 FROM reviews WHERE id=?)').bind(pickId,id)
      ]);
      return result[0].meta.changes ? json({ok:true,id},201) : error('This restaurant was already reviewed or reset.',409);
    }
    const match = url.pathname.match(/^\/api\/reviews\/([0-9a-f-]+)(\/photo)?$/i);
    if (match && match[2] && request.method === 'GET') {
      const row = await db.prepare('SELECT photo FROM reviews WHERE id=?').bind(match[1]).first();
      return row ? new Response(new Uint8Array(row.photo), {headers:{'Content-Type':'image/jpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}) : error('Photo not found.',404);
    }
    if (match && !match[2] && request.method === 'PUT') {
      const form = await request.formData(), {tier,review,date} = fields(form), photo = await photoBytes(form.get('photo'),false);
      const sql = photo ? 'UPDATE reviews SET tier=?,review=?,visit_date=?,photo=? WHERE id=?' : 'UPDATE reviews SET tier=?,review=?,visit_date=? WHERE id=?';
      const params = photo ? [tier,review,date,photo,match[1]] : [tier,review,date,match[1]];
      const res = await db.prepare(sql).bind(...params).run();
      return res.meta.changes ? json({ok:true}) : error('Review not found.',404);
    }
    if (match && !match[2] && request.method === 'DELETE') {
      await db.prepare('DELETE FROM reviews WHERE id=?').bind(match[1]).run(); return json({ok:true});
    }
    if (url.pathname === '/api/reviews' && request.method === 'DELETE') { await db.prepare('DELETE FROM reviews').run(); return json({ok:true}); }
    return error('Not found.',404);
  } catch (e) { console.error(e); return error(e instanceof Error && /^(Choose|Write|Add|Photo|Please)/.test(e.message) ? e.message : 'Shared storage is unavailable. Please try again.', 400); }
}};
