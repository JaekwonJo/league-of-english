/**
 * League of English - Server v2.0
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from project root first, then server/.env (if present)
const rootEnvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const serverEnvPath = path.join(__dirname, '.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else {
  dotenv.config();
}

// Config
const config = require('./config/server.config.json');

// Database
const database = require('./models/database');

// Routes
const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const problemRoutes = require('./routes/problem.routes');
const rankingRoutes = require('./routes/ranking.routes');
const badgeRoutes = require('./routes/badge.routes');
const analysisRoutes = require('./routes/analysis');
const inquiryRoutes = require('./routes/inquiry.routes');
const adminRoutes = require('./routes/admin.routes');
const vocabRoutes = require('./routes/vocab.routes');

// App init
const app = express();
const PORT = process.env.PORT || config.server.port;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
// Optional: ASCII-only console to avoid mojibake on Windows consoles
if (String(process.env.LOE_ASCII_LOG || '').toLowerCase() === '1') {
  const wrap = (fn) => (...args) => fn(...args.map(a => typeof a === 'string' ? a.replace(/[^\x20-\x7E]/g, '?') : a));
  console.log = wrap(console.log.bind(console));
  console.info = wrap(console.info.bind(console));
  console.warn = wrap(console.warn.bind(console));
  console.error = wrap(console.error.bind(console));
}

// CORS: allow dynamic override via CORS_ORIGIN (comma-separated)
const dynamicCors = (() => {
  const origins = process.env.CORS_ORIGIN;
  if (origins && origins.trim().length) {
    return { origin: origins.split(',').map(s => s.trim()), credentials: true };
  }
  return config.server.corsOptions || {};
})();
app.use(cors(dynamicCors));
app.use(express.json({ limit: config.server.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: config.server.jsonLimit }));

// Env check
console.log('[env] variables:');
console.log('  JWT_SECRET      :', process.env.JWT_SECRET ? 'set' : 'missing');
console.log('  OPENAI_API_KEY  :', process.env.OPENAI_API_KEY ? 'set' : 'missing');
console.log('  NODE_ENV        :', process.env.NODE_ENV);
console.log('  PORT            :', PORT);

// Routes mount
app.use('/api/auth', authRoutes);
app.use('/api', documentRoutes);
app.use('/api', problemRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', vocabRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), version: '2.0.0' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[server] error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

async function startServer() {
  try {
    await database.connect();
    // Ensure teacher_codes table exists
    try {
      await database.run(`CREATE TABLE IF NOT EXISTS teacher_codes (
        code TEXT PRIMARY KEY,
        issued_by INTEGER,
        used_by INTEGER,
        used_at DATETIME,
        expires_at DATETIME,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    } catch(e) { console.warn('[init] teacher_codes table ensure failed:', e?.message || e); }
    app.listen(PORT, () => {
      console.log('========================================');
      console.log('  League of English Server v2.0');
      console.log(`  Listening on http://localhost:${PORT}`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('[server] failed to start:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n[server] shutting down...');
  await database.close();
  process.exit(0);
});

startServer();
