import express from 'express';
import cors from 'cors';
import strategyRouter from './routes/strategy';
import scenariosRouter from './routes/scenarios';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/strategy', strategyRouter);
app.use('/api/scenarios', scenariosRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'BTS Preflop Strategy API' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
