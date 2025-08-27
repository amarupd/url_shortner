
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import urlRoutes from './routes/url.js';
import redirectRoutes from './routes/redirect.js';

dotenv.config();

const app = express();

// DB connect
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_URI, {
  // options
}).then(() => console.log('MongoDB connected')).catch(err => {
  console.error('MongoDB connection error', err);
  process.exit(1);
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes); // CRUD + analytics + qr
app.use('/', redirectRoutes);    // GET /:code  -> redirect + track

// Not Found
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

export default app;
