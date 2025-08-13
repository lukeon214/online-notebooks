const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

(async () => {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/public_html', express.static(path.join(__dirname, 'public_html')));

  // DB
  const db = await open({
    filename: path.join(__dirname, 'database.db'),
    driver: sqlite3.Database
  });

  // Create table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Views
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname));

  // Routes
  app.get('/', (req, res) => {
    res.render('index');
  });

  app.get('/dashboard', async (req, res) => {
    const notebooks = await db.all('SELECT * FROM notebooks ORDER BY created_at DESC');
    res.render(path.join(__dirname, 'public_html', 'dashboard.ejs'), { notebooks });
  });

  app.get('/notebook/:id', async (req, res) => {
    const notebook = await db.get('SELECT * FROM notebooks WHERE id = ?', req.params.id);
    if (!notebook) return res.status(404).send('Notebook not found');
    res.render(path.join(__dirname, 'public_html', 'notebook.ejs'), { notebook });
  });

  app.get('/edit/:id', async (req, res) => {
    const notebook = await db.get('SELECT * FROM notebooks WHERE id = ?', req.params.id);
    if (!notebook) return res.status(404).send('Notebook not found');
    res.render(path.join(__dirname, 'public_html', 'editNotebook.ejs'), { notebook });
  });

  app.delete('/api/notebooks/:id', async (req, res) => {
    await db.run('DELETE FROM notebooks WHERE id = ?', req.params.id);
    res.json({ ok: true });
  });

  // API Endpoints
  app.get('/api/notebooks', async (req, res) => {
    const notebooks = await db.all('SELECT * FROM notebooks ORDER BY created_at DESC');
    res.json({ ok: true, notebooks });
  });

  app.post('/api/notebooks', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.json({ ok: false, error: 'Name is required' });
    const result = await db.run('INSERT INTO notebooks (name) VALUES (?)', name);
    res.json({ ok: true, id: result.lastID });
  });

  app.get('/api/notebooks/:id', async (req, res) => {
    const notebook = await db.get('SELECT * FROM notebooks WHERE id = ?', req.params.id);
    if (!notebook) return res.json({ ok: false, error: 'Not found' });
    res.json({ ok: true, notebook });
  });

  app.get('/api/notebooks/:id/content', async (req, res) => {
    const notebook = await db.get('SELECT content FROM notebooks WHERE id = ?', req.params.id);
    if (!notebook) return res.json({ ok: false, error: 'Not found' });
    res.json({ ok: true, content: notebook.content });
  });

  app.put('/api/notebooks/:id/content', async (req, res) => {
    const { content } = req.body;
    await db.run('UPDATE notebooks SET content = ? WHERE id = ?', content || '', req.params.id);
    res.json({ ok: true });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
})();
