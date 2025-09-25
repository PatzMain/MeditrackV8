const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors({
  origin: [
    'https://meditrack-app.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/api', (req, res) => {
  res.json({ message: 'Meditrack API Server', status: 'running' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Meditrack API Server', status: 'running' });
});

module.exports = app;