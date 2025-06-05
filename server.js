const express = require('express');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = 'users.json';

app.use(express.json());
app.use(express.static('.'));

function loadUsers() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_FILE));
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const users = loadUsers();
  if (users.some(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  users.push({ username, passwordHash });
  saveUsers(users);
  res.json({ status: 'registered' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const users = loadUsers();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const exists = users.some(u => u.username === username && u.passwordHash === passwordHash);
  if (!exists) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ status: 'success' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
