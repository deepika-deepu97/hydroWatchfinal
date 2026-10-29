import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { getDb } from './server/db';
import {
  authenticateJwt,
  requireRole,
  generateToken,
  verifyPassword,
  AuthenticatedRequest,
  AuthUserPayload,
} from './server/auth';
import { meterSeriesService } from './server/services/meterSeriesService';
import { leakCaseService } from './server/services/leakCaseService';
import { kafkaBroker, KAFKA_TOPIC_SOA_EVENTS } from './server/kafka';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'hydrowatch_super_secure_jwt_secret_key_2026';

// Enable CORS for cross-origin requests (e.g. Vercel frontend calling standalone backend)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

app.use(express.json());

// ==========================================
// 0. Health Check & Diagnostics Endpoint
// ==========================================
app.get('/api/health', (_req: Request, res: Response) => {
  const db = getDb();
  res.json({
    status: 'ok',
    service: 'HydroWatch SOA Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    demoAccounts: db.users.map((u) => ({ email: u.email, role: u.role, name: u.name })),
  });
});

// ==========================================
// 1. Authentication Routes
// ==========================================

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid email or password. Please verify credentials.' });
    return;
  }

  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      propertyId: user.propertyId,
    },
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// ==========================================
// 2. Resident-Scoped Routes (Enforces Role & Property Scope)
// ==========================================

// GET /api/resident/property
app.get(
  '/api/resident/property',
  authenticateJwt,
  requireRole(['resident']),
  (req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const propertyId = req.user?.propertyId;
    const property = db.properties.find((p) => p.id === propertyId);

    if (!property) {
      res.status(404).json({ error: 'No authorized property found for this resident account.' });
      return;
    }

    res.json({ property });
  }
);

// POST /api/resident/readings
// Resident submits a new water-flow reading for evaluation
app.post(
  '/api/resident/readings',
  authenticateJwt,
  requireRole(['resident']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.user?.propertyId;
      if (!propertyId) {
        res.status(403).json({ error: 'No property associated with resident.' });
        return;
      }

      const { flowRate, thresholdPercent } = req.body;
      const result = await meterSeriesService.submitReading({
        propertyId,
        flowRate: Number(flowRate),
        thresholdPercent: thresholdPercent !== undefined ? Number(thresholdPercent) : undefined,
      });

      res.status(201).json(result);
    } catch (err: any) {
      console.error('Error in POST /api/resident/readings:', err);
      res.status(400).json({ error: err.message || 'Failed to submit reading' });
    }
  }
);

// GET /api/resident/readings
app.get(
  '/api/resident/readings',
  authenticateJwt,
  requireRole(['resident']),
  (req: AuthenticatedRequest, res: Response) => {
    const propertyId = req.user?.propertyId;
    if (!propertyId) {
      res.status(403).json({ error: 'No property associated with resident.' });
      return;
    }
    const readings = meterSeriesService.getReadingsForProperty(propertyId);
    res.json({ readings });
  }
);

// ==========================================
// 3. Utility Analyst Routes (Enforces Role: utilityAnalyst)
// ==========================================

// GET /api/analyst/properties - All monitored properties
app.get(
  '/api/analyst/properties',
  authenticateJwt,
  requireRole(['utilityAnalyst']),
  (req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    res.json({ properties: db.properties });
  }
);

// GET /api/analyst/metrics - Overview statistics
app.get(
  '/api/analyst/metrics',
  authenticateJwt,
  requireRole(['utilityAnalyst']),
  (req: AuthenticatedRequest, res: Response) => {
    const metrics = leakCaseService.getMetrics();
    res.json({ metrics });
  }
);

// GET /api/leak-cases - List all investigation cases
app.get(
  '/api/leak-cases',
  authenticateJwt,
  requireRole(['utilityAnalyst']),
  (req: AuthenticatedRequest, res: Response) => {
    const cases = leakCaseService.getAllCases();
    res.json({ cases });
  }
);

// GET /api/leak-cases/:id - Get specific case details
app.get(
  '/api/leak-cases/:id',
  authenticateJwt,
  requireRole(['utilityAnalyst']),
  (req: AuthenticatedRequest, res: Response) => {
    const caseItem = leakCaseService.getCaseById(req.params.id);
    if (!caseItem) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }
    res.json({ case: caseItem });
  }
);

// PATCH /api/leak-cases/:id/status - Start investigation or resolve
app.patch(
  '/api/leak-cases/:id/status',
  authenticateJwt,
  requireRole(['utilityAnalyst']),
  (req: AuthenticatedRequest, res: Response) => {
    const { status, notes } = req.body;
    if (!status || !['Open', 'Under Investigation', 'Resolved'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be Open, Under Investigation, or Resolved.' });
      return;
    }

    try {
      const updatedCase = leakCaseService.updateCaseStatus(req.params.id, status, notes);
      res.json({ case: updatedCase });
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }
);

// ==========================================
// 4. Server-Sent Events (SSE) Stream for Real-Time Updates
// ==========================================

app.get('/api/events/stream', (req: Request, res: Response) => {
  // Check authorization via Bearer header or query token parameter (for EventSource)
  const token =
    (req.headers.authorization && req.headers.authorization.split(' ')[1]) ||
    (req.query.token as string);

  if (!token) {
    res.status(401).json({ error: 'Authentication token required for SSE stream.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    if (decoded.role !== 'utilityAnalyst') {
      res.status(403).json({ error: 'Only Utility Analysts can subscribe to live alert stream.' });
      return;
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to HydroWatch live alert stream' })}\n\n`);

  const unregister = kafkaBroker.registerSseClient(res);

  // Send periodic ping to prevent socket timeout
  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    unregister();
  });
});

// GET /api/kafka/events - Kafka broker audit trail
app.get(
  '/api/kafka/events',
  authenticateJwt,
  requireRole(['utilityAnalyst']),
  (req: AuthenticatedRequest, res: Response) => {
    const messages = kafkaBroker.getMessageLog();
    res.json({ topic: KAFKA_TOPIC_SOA_EVENTS, messages });
  }
);

// ==========================================
// 5. Mount Vite Middlewares or Static Dist
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In dev mode, mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static assets
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Only bind port if not running in a serverless environment (e.g. Vercel)
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[HydroWatch] Full-Stack server running on port ${PORT}`);
      console.log(`[HydroWatch] Kafka topic '${KAFKA_TOPIC_SOA_EVENTS}' active`);
    });
  }
}

// Start if directly executed
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  });
}

export { app };
export default app;
