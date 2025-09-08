/**
 * League of English - Server v2.0
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Config
const config = require('./config/server.config.json');

// Database
const database = require('./models/database');

// Routes
// Use fixed auth routes for broader DB compatibility
const authRoutes = require('./routes/auth.routes.fixed');
const documentRoutes = require('./routes/document.routes');
const problemRoutes = require('./routes/problem.routes');
const rankingRoutes = require('./routes/ranking.routes');
const analysisRoutes = require('./routes/analysis');

// App init
const app = express();
const PORT = process.env.PORT || config.server.port;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors(config.server.corsOptions));
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
app.use('/api/analysis', analysisRoutes);

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
