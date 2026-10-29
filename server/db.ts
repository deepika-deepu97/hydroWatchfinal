import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  role: 'resident' | 'utilityAnalyst';
  name: string;
  propertyId?: string; // Resident's authorized property
}

export interface PropertyEntity {
  id: string;
  name: string;
  address: string;
  residentEmail: string;
  baselineFlow: number; // L/hour
  thresholdPercent: number; // default e.g. 55%
  occupants: number;
}

export interface MeterReadingEntity {
  id: string;
  propertyId: string;
  timestamp: string;
  flowRate: number; // L/hour
  evaluated: boolean;
  deviationPercentage: number | null;
  isAnomaly: boolean;
}

export interface LeakCaseEntity {
  id: string;
  caseNumber: string;
  propertyId: string;
  propertyName: string;
  address: string;
  currentFlow: number;
  baselineFlow: number;
  deviationPercentage: number;
  thresholdPercent: number;
  severity: 'Low' | 'Moderate' | 'High' | 'Severe';
  status: 'Open' | 'Under Investigation' | 'Resolved';
  detectedAt: string;
  updatedAt: string;
  investigatedAt?: string;
  resolvedAt?: string;
  eventId: string; // Used for idempotency
  notes?: string;
}

export interface ProcessedEventEntity {
  eventId: string;
  topic: string;
  processedAt: string;
}

export interface DatabaseSchema {
  users: UserEntity[];
  properties: PropertyEntity[];
  readings: MeterReadingEntity[];
  cases: LeakCaseEntity[];
  processedEvents: ProcessedEventEntity[];
}

const DB_PATH = path.resolve(process.cwd(), 'data', 'db.json');

// In-memory cache for serverless environments (e.g. Vercel) where filesystem is read-only
let inMemoryDb: DatabaseSchema | null = null;

function createInitialDatabase(): DatabaseSchema {
  const residentSalt = bcrypt.genSaltSync(10);
  const residentHash = bcrypt.hashSync('Resident@123', residentSalt);

  const analystSalt = bcrypt.genSaltSync(10);
  const analystHash = bcrypt.hashSync('Analyst@123', analystSalt);

  return {
    users: [
      {
        id: 'user-resident-1',
        email: 'resident@hydrowatch.demo',
        passwordHash: residentHash,
        role: 'resident',
        name: 'Sarah Jenkins (Resident)',
        propertyId: 'home-a',
      },
      {
        id: 'user-analyst-1',
        email: 'analyst@hydrowatch.demo',
        passwordHash: analystHash,
        role: 'utilityAnalyst',
        name: 'Marcus Chen (Senior Utility Analyst)',
      },
    ],
    properties: [
      {
        id: 'home-a',
        name: 'Home A',
        address: '14 Elm Creek Lane',
        residentEmail: 'resident@hydrowatch.demo',
        baselineFlow: 10.0,
        thresholdPercent: 55.0, // Per requirement: 55%
        occupants: 2,
      },
      {
        id: 'home-b',
        name: 'Home B',
        address: '88 Meadowbrook Way',
        residentEmail: 'resident-b@hydrowatch.demo',
        baselineFlow: 30.0,
        thresholdPercent: 55.0,
        occupants: 4,
      },
      {
        id: 'home-c',
        name: 'Home C',
        address: '42 Pinecrest Avenue, Apt 4B',
        residentEmail: 'resident-c@hydrowatch.demo',
        baselineFlow: 15.0,
        thresholdPercent: 55.0,
        occupants: 3,
      },
    ],
    readings: [
      {
        id: 'reading-init-1',
        propertyId: 'home-a',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        flowRate: 8.0,
        evaluated: true,
        deviationPercentage: -20.0,
        isAnomaly: false,
      },
    ],
    cases: [
      {
        id: 'case-demo-1',
        caseNumber: 'HW-2091',
        propertyId: 'home-c',
        propertyName: 'Home C',
        address: '42 Pinecrest Avenue, Apt 4B',
        currentFlow: 28.5,
        baselineFlow: 15.0,
        deviationPercentage: 90.0,
        thresholdPercent: 55.0,
        severity: 'Moderate',
        status: 'Under Investigation',
        detectedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        investigatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        eventId: 'evt-init-c-1',
        notes: 'Analyst Marcus dispatched field technician to inspect main intake valve.',
      },
    ],
    processedEvents: [
      {
        eventId: 'evt-init-c-1',
        topic: 'soa.s10.t02.events',
        processedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      },
    ],
  };
}

/**
 * Ensures demo accounts and initial dataset are always present, even if db.json is missing or partially populated.
 */
function verifyAndSeedDemoAccounts(db: DatabaseSchema): boolean {
  let changed = false;

  if (!db.users) db.users = [];
  if (!db.properties) db.properties = [];
  if (!db.readings) db.readings = [];
  if (!db.cases) db.cases = [];
  if (!db.processedEvents) db.processedEvents = [];

  // Verify Resident account
  const residentEmail = 'resident@hydrowatch.demo';
  const resident = db.users.find((u) => u.email.toLowerCase() === residentEmail);
  if (!resident) {
    const salt = bcrypt.genSaltSync(10);
    db.users.push({
      id: 'user-resident-1',
      email: residentEmail,
      passwordHash: bcrypt.hashSync('Resident@123', salt),
      role: 'resident',
      name: 'Sarah Jenkins (Resident)',
      propertyId: 'home-a',
    });
    changed = true;
  }

  // Verify Utility Analyst account
  const analystEmail = 'analyst@hydrowatch.demo';
  const analyst = db.users.find((u) => u.email.toLowerCase() === analystEmail);
  if (!analyst) {
    const salt = bcrypt.genSaltSync(10);
    db.users.push({
      id: 'user-analyst-1',
      email: analystEmail,
      passwordHash: bcrypt.hashSync('Analyst@123', salt),
      role: 'utilityAnalyst',
      name: 'Marcus Chen (Senior Utility Analyst)',
    });
    changed = true;
  }

  // Verify Home A exists
  if (!db.properties.some((p) => p.id === 'home-a')) {
    db.properties.push({
      id: 'home-a',
      name: 'Home A',
      address: '14 Elm Creek Lane',
      residentEmail: residentEmail,
      baselineFlow: 10.0,
      thresholdPercent: 55.0,
      occupants: 2,
    });
    changed = true;
  }

  return changed;
}

function ensureDbExists(): void {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(DB_PATH)) {
      const initialData = createInitialDatabase();
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
      inMemoryDb = initialData;
    }
  } catch (err) {
    // Filesystem may be read-only in serverless environments (e.g. Vercel)
    if (!inMemoryDb) {
      inMemoryDb = createInitialDatabase();
    }
  }
}

export function getDb(): DatabaseSchema {
  if (inMemoryDb) {
    verifyAndSeedDemoAccounts(inMemoryDb);
    return inMemoryDb;
  }

  ensureDbExists();

  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      const needsSave = verifyAndSeedDemoAccounts(parsed);
      if (needsSave) {
        saveDb(parsed);
      }
      inMemoryDb = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('[DB] File reading error, falling back to in-memory store:', err);
  }

  inMemoryDb = createInitialDatabase();
  return inMemoryDb;
}

export function saveDb(data: DatabaseSchema): void {
  inMemoryDb = data;
  try {
    ensureDbExists();
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (err) {
    // In serverless environments, file writing is non-blocking and inMemoryDb maintains state
    console.warn('[DB] Persistent file write skipped in read-only environment, using memory store.');
  }
}
