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

// Ensure data directory exists
function ensureDbExists(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    // Generate initial password hashes
    // Resident@123
    const residentSalt = bcrypt.genSaltSync(10);
    const residentHash = bcrypt.hashSync('Resident@123', residentSalt);

    // Analyst@123
    const analystSalt = bcrypt.genSaltSync(10);
    const analystHash = bcrypt.hashSync('Analyst@123', analystSalt);

    const initialData: DatabaseSchema = {
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

    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

export function getDb(): DatabaseSchema {
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch (err) {
    console.error('Error reading db.json, returning empty structure', err);
    return { users: [], properties: [], readings: [], cases: [], processedEvents: [] };
  }
}

export function saveDb(data: DatabaseSchema): void {
  ensureDbExists();
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_PATH);
}
