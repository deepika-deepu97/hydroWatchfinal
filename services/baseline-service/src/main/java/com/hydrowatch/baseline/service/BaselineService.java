package com.hydrowatch.baseline.service;

import com.hydrowatch.baseline.event.NightFlowAnomalyDetectedEvent;
import com.hydrowatch.baseline.producer.KafkaAnomalyProducer;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class BaselineService {

    private final KafkaAnomalyProducer kafkaProducer;

    public BaselineService(KafkaAnomalyProducer kafkaProducer) {
        this.kafkaProducer = kafkaProducer;
    }

    public EvaluationResponse evaluate(String propertyId, String propertyName, String address,
                                       double currentFlow, double baselineFlow, double thresholdPercent) {
        if (baselineFlow <= 0) {
            return new EvaluationResponse(propertyId, propertyName, baselineFlow, currentFlow,
                    null, thresholdPercent, false, "Normal", "Insufficient baseline data", false, null);
        }

        // Formula: deviation % = ((current flow - baseline) / baseline) * 100
        double deviationPercentage = Math.round(((currentFlow - baselineFlow) / baselineFlow) * 100.0 * 100.0) / 100.0;
        boolean isAnomaly = deviationPercentage > thresholdPercent;

        String severity = "Normal";
        if (isAnomaly) {
            if (deviationPercentage > 300) severity = "Severe";
            else if (deviationPercentage > 150) severity = "High";
            else severity = "Moderate";
        }

        boolean published = false;
        String eventId = null;

        if (isAnomaly) {
            eventId = "evt-" + UUID.randomUUID().toString().substring(0, 8);
            NightFlowAnomalyDetectedEvent event = new NightFlowAnomalyDetectedEvent(
                    eventId, propertyId, propertyName, address,
                    currentFlow, baselineFlow, deviationPercentage, thresholdPercent, severity
            );
            kafkaProducer.publishAnomalyEvent(event);
            published = true;
        }

        String explanation = isAnomaly
                ? String.format("Current flow (%.1f L/h) is +%.1f%% above baseline (%.1f L/h), exceeding +%.1f%% threshold.",
                currentFlow, deviationPercentage, baselineFlow, thresholdPercent)
                : String.format("Current flow (%.1f L/h) is normal (+%.1f%% vs %.1f L/h baseline).",
                currentFlow, deviationPercentage, baselineFlow);

        return new EvaluationResponse(propertyId, propertyName, baselineFlow, currentFlow,
                deviationPercentage, thresholdPercent, isAnomaly, severity, explanation, published, eventId);
    }

    public record EvaluationResponse(
            String propertyId,
            String propertyName,
            double baselineFlow,
            double currentFlow,
            Double deviationPercentage,
            double thresholdPercent,
            boolean isAnomaly,
            String severity,
            String explanation,
            boolean kafkaEventPublished,
            String eventId
    ) {}
}
