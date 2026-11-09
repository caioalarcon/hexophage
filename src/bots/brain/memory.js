import { ECONOMY_KEYS } from '../../match/constructive-economy.js';

const STORE_KEY = 'hexophage.brains.v1';
const MAX_NAMESPACES = 8, MAX_STORE_CHARS = 2_000_000;
// Six broad observations per stamp fit the entire Callahan catalog. A moving
// front can generate many rare signatures without crowding out those lessons.
const limits = { stamps: 1024, situations: 256 };
const kinds = Object.keys(limits);
const records = from => ({ stamps: new Map(from?.stamps), situations: new Map(from?.situations) });
const kindOf = context => context.includes('/') && !context.startsWith('field/') ? 'situations' : 'stamps';
const MAX_KEY_LENGTH = 192;
const EMPTY = Object.freeze({ count: 0, mean: 0 });

// Hash only on session creation or when the tariffs change, never per simulated cell.
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

const staticKeys = new WeakMap();
const quoteKeys = new WeakMap();
function quoteKey(economy) {
  if (!economy.generationQuote) return economy.policy;
  // A closure cannot be reconstructed after a reload. A custom policy can
  // explicitly version its semantics to enable durable sharing.
  if (economy.brainKey) return 'quote:' + economy.brainKey;
  if (!quoteKeys.has(economy.generationQuote))
    quoteKeys.set(economy.generationQuote, 'session:' + Math.random().toString(36).slice(2));
  return quoteKeys.get(economy.generationQuote);
}

export function brainNamespace(world, game) {
  const { profile, gameplay, economy } = game;
  let key = staticKeys.get(profile);
  if (!key) {
    const tables = world.physics.tables.slice(5).flatMap(pair => pair.map(t => t.join('')));
    const catalog = gameplay.patterns.map(p => [p.id, p.rle]);
    key = [profile.key, profile.brainVersion ?? 1, hash(tables.join('/')), hash(JSON.stringify(catalog))];
    staticKeys.set(profile, key);
  }
  return JSON.stringify([...key, quoteKey(economy), ...ECONOMY_KEYS.map(k => economy[k])]);
}

// Maps are ordered by most recent observation. Reads never promote a failed experiment.
function put(map, key, value, limit) {
  map.delete(key);
  map.set(key, value);
  if (map.size > limit) map.delete(map.keys().next().value);
  return value;
}

function scope(map, key) {
  return map.get(key) ?? put(map, key, new Map(), MAX_NAMESPACES);
}

function combine(old, fresh) {
  if (!old) return fresh;
  if (!fresh) return old;
  const count = old.count + fresh.count;
  return { count, mean: old.mean + (fresh.mean - old.mean) * (fresh.count / count) };
}

function record(rows, key, sample, kind) {
  const bank = rows[kind];
  put(bank, key, combine(bank.get(key), sample), limits[kind]);
}

function readArchive(raw) {
  if (!raw || raw.length > MAX_STORE_CHARS) return new Map();
  const scopes = JSON.parse(raw);
  const result = new Map();
  if (!Array.isArray(scopes)) return result;
  for (const item of scopes.slice(-MAX_NAMESPACES)) {
    if (!Array.isArray(item)) continue;
    const [name, entries] = item;
    if (typeof name !== 'string' || name.length > 512 || !entries) continue;
    const rows = records();
    for (const kind of kinds) {
      if (!Array.isArray(entries[kind])) continue;
      for (const row of entries[kind].slice(-limits[kind])) {
        if (!Array.isArray(row)) continue;
        const [key, count, mean] = row;
        if (typeof key === 'string' && key.length <= 512 &&
            Number.isSafeInteger(count) && count > 0 && Number.isFinite(mean))
          rows[kind].set(key, { count, mean });
      }
    }
    result.set(name, rows);
  }
  return result;
}

function encode([ns, rows]) {
  return [ns, Object.fromEntries(kinds.map(kind =>
    [kind, [...rows[kind]].map(([key, { count, mean }]) => [key, count, mean])]))];
}

// Each session freezes its inherited observations. Checkpoints publish only new
// samples to the archive; the other live bots continue reading their own views.
export function createBrainArchive(storage, onDirty) {
  let archive = new Map();
  function refresh() {
    if (!storage) return;
    let raw;
    try { raw = storage.getItem(STORE_KEY); }
    catch { storage = null; return; }
    try { archive = readArchive(raw); }
    catch { /* Keep the last good snapshot if a previous save was damaged. */ }
  }

  function open(namespace) {
    refresh();
    const inherited = new Map(archive);
    const personal = new Map(), pending = new Map();
    let lookups = 0, hits = 0, observations = 0, checkpoints = 0, closed = false;
    function botRows(id) {
      const bots = scope(personal, namespace);
      if (!bots.has(id)) bots.set(id, records());
      return bots.get(id);
    }
    function checkpoint() {
      if (!pending.size) return;
      refresh();
      for (const [ns, updates] of pending) {
        const rows = records(archive.get(ns));
        for (const kind of kinds)
          for (const [key, sample] of updates[kind]) record(rows, key, sample, kind);
        put(archive, ns, rows, MAX_NAMESPACES);
      }
      pending.clear();
      checkpoints++;
      if (!storage) return;
      const scopes = [...archive].map(encode);
      let raw = JSON.stringify(scopes);
      while (raw.length > MAX_STORE_CHARS && scopes.length > 1) {
        archive.delete(scopes.shift()[0]);
        raw = JSON.stringify(scopes);
      }
      try { storage.setItem(STORE_KEY, raw); }
      catch { storage = null; } // Full or disabled storage leaves the in-memory archive usable.
    }
    return {
      select(ns) { if (!closed) namespace = ns; },
      lookup(botId, context, action) {
        lookups++;
        const key = JSON.stringify([context, action]), kind = kindOf(context);
        const seen = combine(inherited.get(namespace)?.[kind].get(key), personal.get(namespace)?.get(botId)?.[kind].get(key));
        if (seen) hits++;
        return seen ? { ...seen } : EMPTY;
      },
      observe(botId, context, action, utility) {
        if (closed || !Number.isInteger(botId) || botId < 1 || botId > 6 || !Number.isFinite(utility) ||
            typeof context !== 'string' || context.length > MAX_KEY_LENGTH ||
            typeof action !== 'string' || action.length > MAX_KEY_LENGTH) return;
        const key = JSON.stringify([context, action]), sample = { count: 1, mean: utility };
        if (key.length > 512) return;
        const kind = kindOf(context);
        record(botRows(botId), key, sample, kind);
        let updates = pending.get(namespace);
        // A long headless run may never receive a browser checkpoint. Merge
        // the batch before a new observation could evict uncommitted samples.
        if ((updates && !updates[kind].has(key) && updates[kind].size >= limits[kind]) ||
            (!updates && pending.size >= MAX_NAMESPACES)) {
          checkpoint();
          updates = undefined;
        }
        const dirty = pending.size !== 0;
        if (!updates) pending.set(namespace, updates = records());
        record(updates, key, sample, kind);
        observations++;
        if (!dirty) onDirty?.();
      },
      stats() {
        const prior = inherited.get(namespace) ?? records();
        const bots = [...(personal.get(namespace)?.values() ?? [])];
        const samples = rows => kinds.reduce((n, kind) =>
          n + [...rows[kind].values()].reduce((sum, row) => sum + row.count, 0), 0);
        const size = rows => rows.stamps.size + rows.situations.size;
        return { namespace, inheritedEntries: size(prior), priorSamples: samples(prior),
          privateEntries: bots.reduce((n, rows) => n + size(rows), 0),
          privateSamples: bots.reduce((n, rows) => n + samples(rows), 0),
          observations, lookups, hits, checkpoints };
      },
      checkpoint,
      finish() { checkpoint(); closed = true; },
    };
  }
  return { open };
}
