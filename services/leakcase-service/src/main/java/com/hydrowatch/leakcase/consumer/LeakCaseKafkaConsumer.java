package com.hydrowatch.leakcase.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hydrowatch.leakcase.model.LeakCase;
import com.hydrowatch.leakcase.model.ProcessedEvent;
import com.hydrowatch.leakcase.repository.LeakCaseRepository;
import com.hydrowatch.leakcase.repository.ProcessedEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Random;

@Component
public class LeakCaseKafkaConsumer {
    private static final Logger log = LoggerFactory.getLogger(LeakCaseKafkaConsumer.class);

    private final LeakCaseRepository leakCaseRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final ObjectMapper objectMapper;

    public LeakCaseKafkaConsumer(LeakCaseRepository leakCaseRepository,
                                 ProcessedEventRepository processedEventRepository,
                                 ObjectMapper objectMapper) {
        this.leakCaseRepository = leakCaseRepository;
        this.processedEventRepository = processedEventRepository;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "${kafka.topics.anomaly-events:soa.s10.t02.events}", groupId = "leakcase-service-group")
    @Transactional
    public void consumeAnomalyEvent(String messagePayload) {
        try {
            JsonNode root = objectMapper.readTree(messagePayload);
            String eventId = root.path("eventId").asText();
            String topic = root.path("topic").asText("soa.s10.t02.events");

            log.info("[LeakCase Consumer] Received Kafka event {} on topic {}", eventId, topic);

            // 1. Idempotency Check: Prevent duplicate case creation
            if (processedEventRepository.existsByEventId(eventId)) {
                log.warn("[LeakCase Consumer] IDEMPOTENCY GUARD: Event {} already processed. Discarding duplicate.", eventId);
                return;
            }

            // 2. Record processed event in database
            processedEventRepository.save(new ProcessedEvent(eventId, topic, Instant.now()));

            // 3. Extract event properties
            String propertyId = root.path("propertyId").asText();
            String propertyName = root.path("propertyName").asText();
            String address = root.path("address").asText("");
            double currentFlow = root.path("currentFlow").asDouble();
            double baselineFlow = root.path("baselineFlow").asDouble();
            double deviationPercentage = root.path("deviationPercentage").asDouble();
            double thresholdPercent = root.path("thresholdPercent").asDouble(55.0);
            String severity = root.path("severity").asText("Moderate");

            String caseNumber = "HW-" + (1000 + new Random().nextInt(9000));
            String notes = String.format("Automated Kafka event %s consumed from topic %s. Baseline: %.1f L/h, Observed: %.1f L/h (+%.1f%%).",
                    eventId, topic, baselineFlow, currentFlow, deviationPercentage);

            LeakCase newCase = new LeakCase(
                    caseNumber,
                    propertyId,
                    propertyName,
                    address,
                    currentFlow,
                    baselineFlow,
                    deviationPercentage,
                    thresholdPercent,
                    severity,
                    "Open",
                    Instant.now(),
                    eventId,
                    notes
            );

            leakCaseRepository.save(newCase);
            log.info("[LeakCase Consumer] Successfully created Investigation Case {} for property {}", caseNumber, propertyName);

        } catch (Exception ex) {
            log.error("[LeakCase Consumer] Failed to process anomaly event: ", ex);
        }
    }
}
