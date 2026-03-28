const express = require('express');
const cors = require('cors');
const dns = require('dns');
const fs = require('fs');
const app = express();

app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_FILE = './urls.json';

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch(e) {
    return { counter: 1, urls: {} };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data), 'utf8');
}

// Inisialisasi db saat startup
if (!fs.existsSync(DB_FILE)) {
  saveDB({ counter: 1, urls: {} });
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;
  let hostname;

  try {
    const parsed = new URL(originalUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }
    hostname = parsed.hostname;
  } catch(e) {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(hostname, (err) => {
    if (err) return res.json({ error: 'invalid url' });

    const db = loadDB();

    // Cek apakah URL sudah ada
    const found = Object.entries(db.urls).find(([, v]) => v === originalUrl);
    if (found) {
      return res.json({ original_url: originalUrl, short_url: parseInt(found[0]) });
    }

    // Simpan URL baru secara synchronous
    const shortUrl = db.counter;
    db.urls[shortUrl] = originalUrl;
    db.counter++;
    saveDB(db);

    console.log(`Saved: ${shortUrl} -> ${originalUrl}`);
    return res.json({ original_url: originalUrl, short_url: shortUrl });
  });
});

app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = parseInt(req.params.short_url);
  const db = loadDB();
  const originalUrl = db.urls[shortUrl];

  console.log(`GET shorturl/${shortUrl} -> ${originalUrl}`);
  console.log('DB:', JSON.stringify(db));

  if (!originalUrl) {
    return res.json({ error: 'No short URL found for the given input' });
  }

  return res.redirect(originalUrl);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di port ${PORT}`);
});