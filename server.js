const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const port = Number(process.env.PORT) || 3000;
const databasePath = path.resolve(process.env.DATABASE_PATH || './data/colleges.sqlite');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS colleges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country TEXT NOT NULL,
    college TEXT NOT NULL,
    igcse_needed TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function validateRow(body) {
  const country = typeof body.country === 'string' ? body.country.trim() : '';
  const college = typeof body.college === 'string' ? body.college.trim() : '';
  const igcseNeeded = typeof body.igcseNeeded === 'string' ? body.igcseNeeded.trim() : '';
  if (!country || !college || !igcseNeeded) return { error: 'Please fill in all three fields.' };
  if (country.length > 100 || college.length > 160 || igcseNeeded.length > 500) {
    return { error: 'Country must be 100 characters or less, college 160, and IGCSE needed 500.' };
  }
  return { country, college, igcseNeeded };
}

app.get('/api/colleges', (_req, res) => {
  res.json(db.prepare('SELECT id, country, college, igcse_needed AS igcseNeeded FROM colleges ORDER BY country COLLATE NOCASE, college COLLATE NOCASE').all());
});

app.post('/api/colleges', (req, res) => {
  const row = validateRow(req.body);
  if (row.error) return res.status(400).json({ error: row.error });
  const result = db.prepare('INSERT INTO colleges (country, college, igcse_needed) VALUES (?, ?, ?)').run(row.country, row.college, row.igcseNeeded);
  res.status(201).json({ id: Number(result.lastInsertRowid), ...row });
});

app.put('/api/colleges/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid row ID.' });
  const row = validateRow(req.body);
  if (row.error) return res.status(400).json({ error: row.error });
  const result = db.prepare('UPDATE colleges SET country = ?, college = ?, igcse_needed = ? WHERE id = ?').run(row.country, row.college, row.igcseNeeded, id);
  if (!result.changes) return res.status(404).json({ error: 'Row not found.' });
  res.json({ id, ...row });
});

app.delete('/api/colleges/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid row ID.' });
  const result = db.prepare('DELETE FROM colleges WHERE id = ?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'Row not found.' });
  res.status(204).end();
});

app.listen(port, '0.0.0.0', () => console.log(`College requirements app listening on port ${port}`));
