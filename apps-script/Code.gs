/**
 * Debt Tracker API — Google Apps Script bound to a Google Sheet.
 * Setup: set Script Property API_KEY (long random string), deploy as Web app
 * (Execute as: Me, Who has access: Anyone). Each collection is one sheet tab: id | json | updatedAt.
 */
var COLLECTIONS = ['debts', 'installments', 'payments', 'paymentAllocations', 'categories', 'settings'];
var MAX_DOC_CHARS = 40000; // a Sheets cell holds 50,000 characters
var MAX_OPS = 500;
var ID_RE = /^[A-Za-z0-9_\-.:]{1,200}$/;

function doGet() {
  return out_({ ok: true, name: 'debt-tracker-api' });
}

function doPost(e) {
  var res;
  try {
    var req = JSON.parse(e.postData.contents);
    res = handle_(req);
  } catch (err) {
    res = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return out_(res);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(req) {
  var key = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!key || key.length < 16) return { ok: false, error: 'API_KEY belum diatur (minimal 16 karakter).' };
  if (!req || req.key !== key) return { ok: false, error: 'unauthorized' };

  if (req.action === 'ping') return { ok: true };
  if (req.action === 'list') return withLock_(function () { return list_(req); });
  if (req.action === 'batch') return withLock_(function () { return batch_(req); });
  if (req.action === 'replaceAll') return withLock_(function () { return replaceAll_(req); });
  return { ok: false, error: 'unknown action' };
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function checkCollection_(name) {
  if (COLLECTIONS.indexOf(name) === -1) throw new Error('collection tidak dikenal: ' + name);
}

function checkDoc_(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('dokumen harus berupa object');
  if (typeof doc.id !== 'string' || !ID_RE.test(doc.id)) throw new Error('id dokumen tidak valid');
  if (JSON.stringify(doc).length > MAX_DOC_CHARS) throw new Error('dokumen terlalu besar: ' + doc.id);
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, 3).setValues([['id', 'json', 'updatedAt']]);
  }
  return sh;
}

function readAll_(name) {
  var sh = getSheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last - 1, 3).getValues();
  var docs = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][1]) docs.push(JSON.parse(rows[i][1]));
  }
  return docs;
}

function writeAll_(name, docs) {
  var sh = getSheet_(name);
  var now = new Date().toISOString();
  var rows = [['id', 'json', 'updatedAt']];
  for (var i = 0; i < docs.length; i++) rows.push([docs[i].id, JSON.stringify(docs[i]), now]);
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
}

function list_(req) {
  var names = req.collections || COLLECTIONS;
  var data = {};
  for (var i = 0; i < names.length; i++) {
    checkCollection_(names[i]);
    data[names[i]] = readAll_(names[i]);
  }
  return { ok: true, data: data };
}

// Validates everything first, writes only if every operation is valid.
function batch_(req) {
  var ops = req.ops;
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > MAX_OPS) throw new Error('ops harus berisi 1-' + MAX_OPS + ' operasi');
  var pending = {};
  for (var i = 0; i < ops.length; i++) {
    var op = ops[i];
    checkCollection_(op.collection);
    if (!pending[op.collection]) {
      var map = {};
      var existing = readAll_(op.collection);
      for (var j = 0; j < existing.length; j++) map[existing[j].id] = existing[j];
      pending[op.collection] = map;
    }
    var m = pending[op.collection];
    if (op.op === 'put') {
      checkDoc_(op.doc);
      m[op.doc.id] = op.doc;
    } else if (op.op === 'delete') {
      if (typeof op.id !== 'string' || !ID_RE.test(op.id)) throw new Error('id tidak valid');
      delete m[op.id];
    } else {
      throw new Error('op tidak dikenal');
    }
  }
  for (var name in pending) {
    var docs = [];
    for (var id in pending[name]) docs.push(pending[name][id]);
    writeAll_(name, docs);
  }
  return { ok: true, applied: ops.length };
}

// Used by "import and overwrite": replaces whole collections that are present in req.data.
function replaceAll_(req) {
  var data = req.data;
  if (!data || typeof data !== 'object') throw new Error('data tidak valid');
  var names = [];
  for (var name in data) {
    checkCollection_(name);
    if (!Array.isArray(data[name])) throw new Error(name + ' harus array');
    var seen = {};
    for (var i = 0; i < data[name].length; i++) {
      checkDoc_(data[name][i]);
      if (seen[data[name][i].id]) throw new Error('id ganda di ' + name + ': ' + data[name][i].id);
      seen[data[name][i].id] = true;
    }
    names.push(name);
  }
  var counts = {};
  for (var k = 0; k < names.length; k++) {
    writeAll_(names[k], data[names[k]]);
    counts[names[k]] = data[names[k]].length;
  }
  return { ok: true, counts: counts };
}
