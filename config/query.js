const { getDb, saveDb } = require('./db');

function toObjects(result) {
  if (!result || !result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

async function all(sql, params = []) {
  const db = await getDb();
  const result = db.exec(sql, params);
  return toObjects(result);
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const db = await getDb();
  db.run(sql, params);
  const last = db.exec('SELECT last_insert_rowid() as id');
  saveDb();
  return { lastID: last[0]?.values[0][0] };
}

module.exports = { all, get, run };
