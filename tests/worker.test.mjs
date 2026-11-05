import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker.js';
import { restaurants } from '../restaurants.js';
const sqlite = new DatabaseSync(':memory:');
class Statement {
  constructor(sql, params = []) { this.sql = sql; this.params = params; }
  bind(...params) { return new Statement(this.sql, params.map(x => x instanceof ArrayBuffer ? new Uint8Array(x) : x)); }
  async run() { const result = sqlite.prepare(this.sql).run(...this.params); return { meta: { changes: Number(result.changes) } }; }
  async first() { return sqlite.prepare(this.sql).get(...this.params) || null; }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.params) }; }
}
const DB = { prepare(sql) { return new Statement(sql); }, async batch(stmts) { sqlite.exec('BEGIN'); try { const out = []; for (const stmt of stmts) out.push(await stmt.run()); sqlite.exec('COMMIT'); return out; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } };
const env = { DB };
async function call(path, options = {}) { const response = await worker.fetch(new Request(`https://example.test${path}`, options), env); let result; const type = response.headers.get('content-type') || ''; result = type.includes('json') ? await response.json() : new Uint8Array(await response.arrayBuffer()); return { response, result }; }
const pick = name => call('/api/current', { method:'POST', body:JSON.stringify({name}) });
function form(id, review = 'Great food', tier = 'S', date = '2026-11-04', photo = true) { const f = new FormData(); f.set('pickId',id); f.set('review',review); f.set('tier',tier); f.set('date',date); if(photo) f.set('photo',new File([new Uint8Array([255,216,255,0,1])], 'photo.jpg',{type:'image/jpeg'})); return f; }

test('shared pick, validation, reviews, edits, and resets', async () => {
  assert.deepEqual((await call('/api/state')).result, {current:null,reviews:[]});
  const one = (await pick(restaurants[0].name)).result;
  assert.equal(one.created,true); assert.equal(one.current.restaurant.name,restaurants[0].name);
  const two = (await pick(restaurants[1].name)).result;
  assert.equal(two.created,false); assert.equal(two.current.id,one.current.id);
  let result = await call('/api/reviews',{method:'POST',body:form(one.current.id,Array(151).fill('word').join(' '))});
  assert.equal(result.response.status,400);
  assert.equal((await call('/api/state')).result.current.id,one.current.id);
  result = await call('/api/reviews',{method:'POST',body:form(one.current.id,'great','S','2026-02-30')}); assert.equal(result.response.status,400);
  result = await call('/api/reviews',{method:'POST',body:form(one.current.id,'great','S','2026-11-04',false)}); assert.equal(result.response.status,400);
  result = await call('/api/reviews',{method:'POST',body:form(one.current.id, Array(150).fill('word').join(' '))}); assert.equal(result.response.status,201); const id = result.result.id;
  let state = (await call('/api/state')).result; assert.equal(state.current,null); assert.equal(state.reviews[0].tier,'S');
  result = await call(`/api/reviews/${id}/photo`); assert.deepEqual([...result.result],[255,216,255,0,1]);
  result = await call('/api/reviews',{method:'POST',body:form(one.current.id)}); assert.equal(result.response.status,409);
  result = await call(`/api/reviews/${id}`,{method:'PUT',body:form('', 'Changed', 'A', '2026-11-03',false)}); assert.equal(result.response.status,200);
  state = (await call('/api/state')).result; assert.equal(state.reviews[0].review,'Changed'); assert.equal(state.reviews[0].tier,'A');
  await call(`/api/reviews/${id}`,{method:'DELETE'}); assert.equal((await call('/api/state')).result.reviews.length,0);
  const next = (await pick(restaurants[1].name)).result.current;
  result = await call('/api/current',{method:'DELETE',body:JSON.stringify({id:one.current.id})}); assert.equal(result.response.status,409);
  result = await call('/api/current',{method:'DELETE',body:JSON.stringify({id:next.id})}); assert.equal(result.response.status,200);
});
