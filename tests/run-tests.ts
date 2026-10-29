import { baselineService } from '../server/services/baselineService';
import { leakCaseService } from '../server/services/leakCaseService';
import { meterSeriesService } from '../server/services/meterSeriesService';
import { kafkaBroker, KAFKA_TOPIC_SOA_EVENTS, KafkaMessage, NightFlowAnomalyDetectedPayload } from '../server/kafka';
import { getDb } from '../server/db';
import { generateToken, verifyPassword } from '../server/auth';
import { evaluateFlow } from '../src/utils/detection';
import jwt from 'jsonwebtoken';

async function runAllTests() {
  console.log('\n======================================================');
  console.log('  HydroWatch Automated Verification Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // Suite 1: Exact Requirements Specification Tests
    // ----------------------------------------------------
    console.log('[Suite 1: Calculation & Status Logic Fixes]');

    // Req 3: baseline = 10, current flow = 40, threshold = 55%
    // Expected deviation: +300%, expected status: Possible Leak Detected
    const req3Backend = await baselineService.evaluateReading('home-a', 40.0, 55.0);
    const req3Frontend = evaluateFlow(40.0, 10.0, 55.0);

    assert(
      req3Backend.deviationPercentage === 300.0 && req3Frontend.deviationPercentage === 300.0,
      'Req 3.1: Deviation calculated as exactly +300% for baseline=10, current=40 (Formula: ((40-10)/10)*100)',
      `Backend: ${req3Backend.deviationPercentage}%, Frontend: ${req3Frontend.deviationPercentage}%`
    );
    assert(
      req3Backend.isAnomaly === true && req3Backend.isPossibleLeak === true,
      'Req 3.2: Backend returns isAnomaly=true AND isPossibleLeak=true when 300% > 55%'
    );
    assert(
      req3Frontend.isPossibleLeak === true && req3Frontend.isAnomaly === true,
      'Req 3.3: Frontend evaluateFlow returns isPossibleLeak=true when 300% > 55%'
    );
    assert(
      req3Backend.explanation.includes('Possible Leak Detected'),
      'Req 3.4: Status explanation confirms "Possible Leak Detected"'
    );
    assert(
      req3Backend.kafkaEventPublished === true,
      'Req 3.5: Anomaly reading publishes NightFlowAnomalyDetected event to Kafka'
    );

    // Req 4: baseline = 10, current flow = 8, threshold = 55%
    // Expected deviation: -20%, expected status: Normal Flow
    const req4Backend = await baselineService.evaluateReading('home-a', 8.0, 55.0);
    const req4Frontend = evaluateFlow(8.0, 10.0, 55.0);

    assert(
      req4Backend.deviationPercentage === -20.0 && req4Frontend.deviationPercentage === -20.0,
      'Req 4.1: Deviation calculated as exactly -20% for baseline=10, current=8 (Formula: ((8-10)/10)*100)',
      `Backend: ${req4Backend.deviationPercentage}%, Frontend: ${req4Frontend.deviationPercentage}%`
    );
    assert(
      req4Backend.isAnomaly === false && req4Backend.isPossibleLeak === false,
      'Req 4.2: Backend returns isAnomaly=false AND isPossibleLeak=false when -20% <= 55%'
    );
    assert(
      req4Frontend.isPossibleLeak === false && req4Frontend.isAnomaly === false,
      'Req 4.3: Frontend evaluateFlow returns isPossibleLeak=false when -20% <= 55%'
    );
    assert(
      req4Backend.explanation.includes('Normal Flow') && req4Frontend.explanation.includes('Normal Flow'),
      'Req 4.4: Status explanation confirms "Normal Flow"'
    );
    assert(
      req4Backend.kafkaEventPublished === false,
      'Req 4.5: Normal reading does NOT publish Kafka anomaly event'
    );

    // Req 8: Safe handling of zero baseline without division-by-zero errors
    const req8Frontend = evaluateFlow(25.0, 0, 55.0);
    assert(
      req8Frontend.insufficientData === true && req8Frontend.deviationPercentage === null,
      'Req 8.1: Zero baseline sets insufficientData=true and deviationPercentage=null safely'
    );
    assert(
      req8Frontend.explanation.includes('Insufficient Baseline Data'),
      'Req 8.2: Zero baseline displays "Insufficient Baseline Data"'
    );
    assert(
      req8Frontend.isPossibleLeak === false,
      'Req 8.3: Zero baseline does not trigger false positive leak'
    );

    // Example 5: Home B baseline 30 L/h, current 35 L/h, threshold 55%
    const resHomeB = await baselineService.evaluateReading('home-b', 35.0, 55.0);
    assert(
      resHomeB.deviationPercentage !== null && Math.abs(resHomeB.deviationPercentage - 16.67) < 0.1,
      'Test 1.4: Home B deviation is ~+16.67% (35 L/h vs 30 L/h baseline)'
    );
    assert(
      resHomeB.isAnomaly === false && resHomeB.isPossibleLeak === false,
      'Test 1.5: Home B (+16.67% <= +55%) is classified as Normal Flow'
    );

    // ----------------------------------------------------
    // Suite 2: Kafka Event Bus & Service-Oriented Architecture
    // ----------------------------------------------------
    console.log('\n[Suite 2: Kafka Event Bus & Service-Oriented Architecture]');
    const testEventId = `evt-test-${Date.now()}`;
    const testPayload: NightFlowAnomalyDetectedPayload = {
      propertyId: 'home-a',
      propertyName: 'Home A',
      address: '14 Elm Creek Lane',
      currentFlow: 40.0,
      baselineFlow: 10.0,
      deviationPercentage: 300.0,
      thresholdPercent: 55.0,
      severity: 'Severe',
      timestamp: new Date().toISOString(),
    };

    const publishedMsg = await kafkaBroker.publish(
      KAFKA_TOPIC_SOA_EVENTS,
      'NightFlowAnomalyDetected',
      testPayload,
      testEventId
    );

    assert(
      publishedMsg.topic === KAFKA_TOPIC_SOA_EVENTS,
      `Test 2.1: Message published to specified Kafka topic '${KAFKA_TOPIC_SOA_EVENTS}'`
    );
    assert(
      publishedMsg.eventId === testEventId,
      'Test 2.2: Message carries designated event UUID'
    );

    // Wait 50ms for asynchronous consumer dispatch
    await new Promise((r) => setTimeout(r, 60));

    // Verify LeakCase service event consumption & database persistence
    const dbAfterEvent = getDb();
    const createdCase = dbAfterEvent.cases.find((c) => c.eventId === testEventId);
    assert(
      createdCase !== undefined,
      'Test 2.3: LeakCase service consumed event and persisted new investigation case'
    );
    assert(
      createdCase?.currentFlow === 40.0 && createdCase?.deviationPercentage === 300.0,
      'Test 2.4: Investigation case preserves exact telemetry (+300.0% deviation, 40 L/h flow)'
    );
    assert(
      createdCase?.status === 'Open',
      'Test 2.5: Newly created case has initial status of "Open"'
    );

    // ----------------------------------------------------
    // Suite 3: Idempotency & Fault Tolerance
    // ----------------------------------------------------
    console.log('\n[Suite 3: Idempotency & Fault Tolerance]');
    const fakeMessage: KafkaMessage<NightFlowAnomalyDetectedPayload> = {
      eventId: testEventId, // SAME ID
      eventType: 'NightFlowAnomalyDetected',
      topic: KAFKA_TOPIC_SOA_EVENTS,
      partition: 0,
      offset: 9999,
      timestamp: new Date().toISOString(),
      payload: testPayload,
    };

    const duplicateResult = await leakCaseService.handleKafkaEvent(fakeMessage);
    assert(
      duplicateResult.status === 'duplicate_ignored',
      'Test 3.1: Duplicate Kafka event with same eventId was safely rejected by idempotency guard'
    );

    const duplicateCasesCount = getDb().cases.filter((c) => c.eventId === testEventId).length;
    assert(
      duplicateCasesCount === 1,
      'Test 3.2: Database contains exactly one case for the duplicate event (no duplicate cases created)'
    );

    // ----------------------------------------------------
    // Suite 4: Security, Authentication & Role Separation
    // ----------------------------------------------------
    console.log('\n[Suite 4: Security, Authentication & Role Separation]');
    const db = getDb();
    const residentUser = db.users.find((u) => u.email === 'resident@hydrowatch.demo');
    const analystUser = db.users.find((u) => u.email === 'analyst@hydrowatch.demo');

    assert(
      residentUser !== undefined && residentUser.role === 'resident',
      'Test 4.1: Demo account resident@hydrowatch.demo seeded with role="resident"'
    );
    assert(
      analystUser !== undefined && analystUser.role === 'utilityAnalyst',
      'Test 4.2: Demo account analyst@hydrowatch.demo seeded with role="utilityAnalyst"'
    );

    const residentPassOk = verifyPassword('Resident@123', residentUser!.passwordHash);
    const analystPassOk = verifyPassword('Analyst@123', analystUser!.passwordHash);
    const wrongPassFails = !verifyPassword('WrongPass123', residentUser!.passwordHash);

    assert(
      residentPassOk && analystPassOk && wrongPassFails,
      'Test 4.3: Bcrypt password validation succeeds for demo credentials and rejects wrong passwords'
    );

    const residentToken = generateToken(residentUser!);
    const analystToken = generateToken(analystUser!);

    const decodedResident = jwt.decode(residentToken) as any;
    const decodedAnalyst = jwt.decode(analystToken) as any;

    assert(
      decodedResident.role === 'resident' && decodedResident.propertyId === 'home-a',
      'Test 4.4: Resident JWT correctly encapsulates role="resident" and propertyId="home-a"'
    );
    assert(
      decodedAnalyst.role === 'utilityAnalyst',
      'Test 4.5: Utility Analyst JWT correctly encapsulates role="utilityAnalyst"'
    );

    // ----------------------------------------------------
    // Suite 5: Investigation Lifecycle Progression
    // ----------------------------------------------------
    console.log('\n[Suite 5: Investigation Lifecycle]');
    if (createdCase) {
      const underInvestigation = leakCaseService.updateCaseStatus(
        createdCase.id,
        'Under Investigation',
        'Analyst investigating pipe acoustics'
      );
      assert(
        underInvestigation.status === 'Under Investigation',
        'Test 5.1: Case transitions from "Open" to "Under Investigation"'
      );

      const resolved = leakCaseService.updateCaseStatus(
        createdCase.id,
        'Resolved',
        'Technician sealed flapper valve'
      );
      assert(
        resolved.status === 'Resolved' && resolved.resolvedAt !== undefined,
        'Test 5.2: Case transitions to "Resolved" with resolvedAt timestamp recorded'
      );
    }

    // ----------------------------------------------------
    // Suite 6: End-to-End Workflow (Resident Reading -> MeterSeries -> Baseline -> Kafka -> LeakCase)
    // ----------------------------------------------------
    console.log('\n[Suite 6: End-to-End Workflow]');
    const e2eEventId = `evt-e2e-${Date.now()}`;
    const submission = await meterSeriesService.submitReading(
      {
        propertyId: 'home-a',
        flowRate: 40.0, // 40 L/h vs 10 L/h baseline = +300%
        thresholdPercent: 55.0,
      },
      e2eEventId
    );

    assert(
      submission.reading.flowRate === 40.0 &&
      submission.evaluation.isAnomaly === true &&
      submission.evaluation.isPossibleLeak === true &&
      submission.evaluation.deviationPercentage === 300.0,
      'Test 6.1: MeterSeries accepted 40 L/h reading, Baseline calculated +300% and flagged Possible Leak'
    );

    // Wait for consumer
    await new Promise((r) => setTimeout(r, 60));

    const e2eCase = getDb().cases.find((c) => c.eventId === e2eEventId);
    assert(
      e2eCase !== undefined && e2eCase.currentFlow === 40.0 && e2eCase.deviationPercentage === 300.0,
      'Test 6.2: End-to-End workflow completed: 40 L/h leak case automatically logged for Utility Analyst'
    );

    console.log('\n======================================================');
    console.log(`  Test Suite Completed: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test failure:', err);
    process.exit(1);
  }
}

runAllTests();
