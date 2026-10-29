# HydroWatch — Smart Water Leak Detection (Service-Oriented Architecture)

HydroWatch is a smart water leak detection platform that monitors nighttime minimum flow rates across residential properties and automatically dispatches leak alerts from the **Resident Dashboard** to the **Utility Analyst Dashboard** using an event-driven Service-Oriented Architecture (SOA).

---

## 1. Architecture Overview

HydroWatch implements an asynchronous, event-driven microservices architecture:

```
[ Resident Submits Reading ]
            │
            ▼
   ┌───────────────────┐
   │ MeterSeries Service│ (Validates & records time-series flow reading)
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │ Baseline Service  │ (Computes deviation % = ((flow - baseline) / baseline) * 100)
   └─────────┬─────────┘ (Detects anomaly when deviation > threshold, e.g. +55%)
             │
             ▼
     [ Apache Kafka ]
  Topic: soa.s10.t02.events
  Event: NightFlowAnomalyDetected
             │
             ▼
   ┌───────────────────┐
   │ LeakCase Service  │ (Idempotently consumes event, creates investigation case,
   └─────────┬─────────┘  persists in database, emits SSE real-time broadcast)
             │
             ▼
[ Utility Analyst Dashboard ] (Automatically displays alert without page refresh)
```

### Microservices Breakdown:
1. **Eureka Discovery Server** (`port 8761`): Service registry for dynamic service discovery.
2. **Spring Cloud API Gateway** (`port 8080`): Central entry point enforcing JWT authentication, rate limiting, and route forwarding.
3. **MeterSeries Service** (`port 8081`): Ingests and stores smart meter readings.
4. **Baseline Service** (`port 8082`): Evaluates readings against property baselines, detects anomalies, and acts as a Kafka Producer publishing `NightFlowAnomalyDetected` events to `soa.s10.t02.events`.
5. **LeakCase Service** (`port 8083`): Acts as a Kafka Consumer on topic `soa.s10.t02.events`, enforces **idempotent event processing** via a `processed_events` table, persists cases, and manages the investigation lifecycle (`Open` → `Under Investigation` → `Resolved`).
6. **Full-Stack Dev Server** (`port 3000`): Runs the complete reactive web application with Express backend, JWT authentication, bcrypt password hashing, persistent storage, and real-time Server-Sent Events (SSE).

---

## 2. Authentication & Security

Real backend authorization is enforced via **JSON Web Tokens (JWT)** and **bcrypt** password hashing.

### Demo Credentials:
| Role | Email | Password | Scope |
|------|-------|----------|-------|
| **Resident** | `resident@hydrowatch.demo` | `Resident@123` | Authorized **only** for Home A (`home-a`). Forbidden from other properties and analyst cases. |
| **Utility Analyst** | `analyst@hydrowatch.demo` | `Analyst@123` | System-wide access to all properties, real-time alert stream, and investigation cases. |

---

## 3. How to Verify the Automated Workflow

### Quick Browser Test (Side-by-Side or Role Switcher):
1. **Log in as Resident**:
   - Access the app at `http://localhost:3000`. Click **"Resident"** demo login.
   - The resident dashboard displays **Home A** (Baseline: `10.0 L/hour`).
2. **Simulate Leak Reading**:
   - In the Simulator, select **"Spec Leak Case"** (`17.0 L/hour`).
   - Click **"Simulate Reading & Evaluate"**.
   - Backend calculates:
     $$\text{deviation } \% = \frac{17.0 - 10.0}{10.0} \times 100 = +70.0\%$$
   - Since $+70.0\% > +55.0\%$ threshold, the Baseline service flags the anomaly and publishes a `NightFlowAnomalyDetected` event to Kafka topic `soa.s10.t02.events`.
   - The Resident dashboard displays **"Possible Leak Detected"** with confirmation that the alert was automatically dispatched.
3. **Verify Analyst Real-Time Alert**:
   - Click **"Switch to Analyst"** in the top navigation bar (or open a second browser window logged in as `analyst@hydrowatch.demo`).
   - The Utility Analyst dashboard displays:
     - A real-time **Alert Banner** for Home A with $+70.0\%$ deviation.
     - A new Investigation Case (e.g. `HW-7333`) with status **"Open"**.
     - An incremented **"Suspected Leaks"** count.
   - No manual page refresh is required! The update is streamed live via Server-Sent Events.
4. **Lifecycle Progression**:
   - Click **"Investigate"** → Status updates to **"Under Investigation"**.
   - Click **"Resolve"** → Status updates to **"Resolved"** and records the resolution timestamp.

### Test Normal Reading (Home B):
- Home B baseline: `30.0 L/hour`. Current reading: `35.0 L/hour`.
- Deviation: $\frac{35.0 - 30.0}{30.0} \times 100 = +16.67\%$.
- Result: Since $+16.67\% < +55\%$, no Kafka event is published and no leak case is created.

---

## 4. Automated Test Suite

Run the complete verification test suite:

```bash
npm test
```

This runs `tests/run-tests.ts` to test:
- Baseline deviation formula accuracy ($+70.0\%$ for Home A at $17$ L/h).
- Normal readings not triggering alerts ($+16.67\%$ for Home B at $35$ L/h).
- Safe zero-baseline handling without crashing.
- Kafka message publication to topic `soa.s10.t02.events`.
- LeakCase service consumption and database persistence.
- **Idempotent event processing** (duplicate event ID is safely rejected).
- JWT role-based access control and property authorization.
- Case status lifecycle (`Open` → `Under Investigation` → `Resolved`).
- End-to-end telemetry submission pipeline.

---

## 5. Running the Application

### Option A: Applet Full-Stack Server (Interactive)
The applet includes an integrated full-stack server running Express with SSE and Vite:

```bash
npm run dev
```

Server runs on `http://localhost:3000`.

### Option B: Docker Compose (Spring Boot & Kafka Infrastructure)
To launch the complete distributed microservice cluster with Zookeeper, Apache Kafka, Eureka, and Spring Boot containers:

```bash
docker-compose up --build
```

Services started:
- Zookeeper: `localhost:2181`
- Kafka Broker: `localhost:9092`
- Eureka Discovery Server: `http://localhost:8761`
- Spring Cloud API Gateway: `http://localhost:8080`
- MeterSeries Service: `http://localhost:8081`
- Baseline Service: `http://localhost:8082`
- LeakCase Service: `http://localhost:8083`

---

## 6. Troubleshooting

- **SSE Stream shows "Connecting..." or "Disconnected"**:
  - Ensure you are logged in as a `utilityAnalyst`. Residents do not have access to the analyst alert stream.
  - The frontend includes an automatic polling fallback every 5 seconds to guarantee dashboard synchronization even if SSE is interrupted.
- **Case Not Appearing**:
  - Check the configured threshold. For a baseline of $10$ L/h, a reading of $17$ L/h ($+70\%$) requires a threshold below $+70\%$ (default is $+55\%$).
  - Inspect the **Kafka Event Log** by clicking the "Kafka Event Log" button on the Analyst dashboard to verify message offsets and payloads.
