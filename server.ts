import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('resume_builder.db');
const JWT_SECRET = 'your-secret-key-change-this-in-production';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    templateId TEXT NOT NULL,
    lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users (id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const stmt = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
      const result = stmt.run(email, hashedPassword);
      const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, email } });
    } catch (e) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Resume Routes
  app.get('/api/resumes', authenticateToken, (req: any, res) => {
    const resumes = db.prepare('SELECT * FROM resumes WHERE userId = ? ORDER BY lastModified DESC').all(req.user.id);
    res.json(resumes.map((r: any) => ({ ...r, data: JSON.parse(r.data) })));
  });

  app.post('/api/resumes', authenticateToken, (req: any, res) => {
    const { title, data, templateId } = req.body;
    const stmt = db.prepare('INSERT INTO resumes (userId, title, data, templateId) VALUES (?, ?, ?, ?)');
    const result = stmt.run(req.user.id, title, JSON.stringify(data), templateId);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/resumes/:id', authenticateToken, (req: any, res) => {
    const { title, data, templateId } = req.body;
    const stmt = db.prepare('UPDATE resumes SET title = ?, data = ?, templateId = ?, lastModified = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?');
    stmt.run(title, JSON.stringify(data), templateId, req.params.id, req.user.id);
    res.json({ success: true });
  });

  app.delete('/api/resumes/:id', authenticateToken, (req: any, res) => {
    const stmt = db.prepare('DELETE FROM resumes WHERE id = ? AND userId = ?');
    stmt.run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
