import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

function makeEnv(apiKey: string | null = 'k'.repeat(24)) {
  const sheets = new Map<string, unknown[][]>();
  const sheetObj = (name: string) => ({
    getLastRow: () => sheets.get(name)!.length,
    getRange: (r: number, _c: number, nr: number, _nc: number) => ({
      getValues: () => sheets.get(name)!.slice(r - 1, r - 1 + nr).map((x) => [...x]),
      setValues: (v: unknown[][]) => {
        const rows = sheets.get(name)!;
        v.forEach((row, i) => (rows[r - 1 + i] = [...row]));
      },
    }),
    clearContents: () => sheets.set(name, []),
  });
  const ctx = vm.createContext({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n: string) => (sheets.has(n) ? sheetObj(n) : null),
        insertSheet: (n: string) => (sheets.set(n, [[]]), sheetObj(n)),
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => apiKey }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (t: string) => ({ text: t, setMimeType() { return this; } }),
    },
  });
  vm.runInContext(src, ctx);
  const post = (req: unknown) => {
    const o = (ctx as unknown as { doPost: (e: unknown) => { text: string } }).doPost({ postData: { contents: JSON.stringify(req) } });
    return JSON.parse(o.text) as { ok: boolean; error?: string; [k: string]: unknown };
  };
  return { post, sheets };
}

const KEY = 'k'.repeat(24);

test('rejects missing/wrong key and unset API_KEY', () => {
  assert.equal(makeEnv().post({ action: 'list' }).error, 'unauthorized');
  assert.equal(makeEnv().post({ action: 'list', key: 'x' }).error, 'unauthorized');
  assert.match(makeEnv(null).post({ action: 'ping', key: 'x' }).error!, /API_KEY/);
  assert.equal(makeEnv().post({ action: 'ping', key: KEY }).ok, true);
});

test('put then list round-trips documents', () => {
  const { post } = makeEnv();
  const r = post({ action: 'batch', key: KEY, ops: [{ op: 'put', collection: 'debts', doc: { id: 'd1', name: 'Bank', principal: 1000 } }] });
  assert.equal(r.ok, true);
  const l = post({ action: 'list', key: KEY, collections: ['debts'] }) as unknown as { data: { debts: { id: string; principal: number }[] } };
  assert.equal(l.data.debts.length, 1);
  assert.equal(l.data.debts[0]!.principal, 1000);
});

test('put updates same id and delete removes it', () => {
  const { post } = makeEnv();
  const put = (n: number) => post({ action: 'batch', key: KEY, ops: [{ op: 'put', collection: 'debts', doc: { id: 'd1', n } }] });
  put(1);
  put(2);
  let l = post({ action: 'list', key: KEY, collections: ['debts'] }) as unknown as { data: { debts: { n: number }[] } };
  assert.equal(l.data.debts.length, 1);
  assert.equal(l.data.debts[0]!.n, 2);
  post({ action: 'batch', key: KEY, ops: [{ op: 'delete', collection: 'debts', id: 'd1' }] });
  l = post({ action: 'list', key: KEY, collections: ['debts'] }) as never;
  assert.equal(l.data.debts.length, 0);
});

test('batch is all-or-nothing across collections', () => {
  const { post } = makeEnv();
  const r = post({
    action: 'batch', key: KEY,
    ops: [
      { op: 'put', collection: 'payments', doc: { id: 'p1', amount: 5 } },
      { op: 'put', collection: 'debts', doc: { id: 'bad/id' } },
    ],
  });
  assert.equal(r.ok, false);
  const l = post({ action: 'list', key: KEY, collections: ['payments'] }) as unknown as { data: { payments: unknown[] } };
  assert.equal(l.data.payments.length, 0);
});

test('rejects unknown collection, oversize doc, bad action', () => {
  const { post } = makeEnv();
  assert.equal(post({ action: 'list', key: KEY, collections: ['secrets'] }).ok, false);
  assert.equal(post({ action: 'batch', key: KEY, ops: [{ op: 'put', collection: 'debts', doc: { id: 'x', blob: 'a'.repeat(41000) } }] }).ok, false);
  assert.equal(post({ action: 'nope', key: KEY }).ok, false);
});

test('replaceAll overwrites and rejects duplicate ids', () => {
  const { post } = makeEnv();
  post({ action: 'batch', key: KEY, ops: [{ op: 'put', collection: 'categories', doc: { id: 'old' } }] });
  const r = post({ action: 'replaceAll', key: KEY, data: { categories: [{ id: 'a' }, { id: 'b' }] } }) as unknown as { ok: boolean; counts: { categories: number } };
  assert.equal(r.ok, true);
  assert.equal(r.counts.categories, 2);
  const l = post({ action: 'list', key: KEY, collections: ['categories'] }) as unknown as { data: { categories: { id: string }[] } };
  assert.deepEqual(l.data.categories.map((c) => c.id), ['a', 'b']);
  assert.equal(post({ action: 'replaceAll', key: KEY, data: { categories: [{ id: 'z' }, { id: 'z' }] } }).ok, false);
});
