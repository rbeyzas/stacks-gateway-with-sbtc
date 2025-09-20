import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { logger } from '@/utils/logger';
import { connectDatabase } from '@/utils/database';
import { connectRedis } from '@/utils/redis';

// Route imports
import paymentRoutes from '@/routes/payments';
import merchantRoutes from '@/routes/merchants';
import webhookRoutes from '@/routes/webhooks';
import healthRoutes from '@/routes/health';
import paymentLinksRoutes from '@/routes/paymentLinks';
import subscriptionRoutes from '@/routes/subscriptions';
import exchangeRateRoutes from '@/routes/exchangeRate';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }),
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Initialize connections (for serverless, these will be lazy-loaded)
let dbInitialized = false;
let redisInitialized = false;

async function initializeConnections() {
  if (!dbInitialized) {
    try {
      await connectDatabase();
      logger.info('Database connected successfully');
      dbInitialized = true;
    } catch (error) {
      logger.warn('Database connection failed, continuing:', error);
    }
  }

  if (!redisInitialized) {
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
      redisInitialized = true;
    } catch (error) {
      logger.warn('Redis connection failed, continuing without cache:', error);
    }
  }
}

// Middleware to ensure connections are initialized
app.use(async (req, res, next) => {
  await initializeConnections();
  next();
});

// API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/payment-intents', paymentRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/payment-links', paymentLinksRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/exchange-rate', exchangeRateRoutes);

// Add a simple root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'StacksGate API',
    version: '1.0.0',
    status: 'operational',
    documentation: '/api/v1/health',
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message;

  res.status(statusCode).json({
    error: {
      type: 'api_error',
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    },
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: {
      type: 'api_error',
      message: 'Route not found',
    },
  });
});

export default app;
