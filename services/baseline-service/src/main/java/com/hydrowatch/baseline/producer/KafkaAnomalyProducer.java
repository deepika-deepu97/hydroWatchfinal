package com.hydrowatch.baseline.producer;

import com.hydrowatch.baseline.event.NightFlowAnomalyDetectedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class KafkaAnomalyProducer {
    private static final Logger log = LoggerFactory.getLogger(KafkaAnomalyProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.anomaly-events:soa.s10.t02.events}")
    private String topicName;

    public KafkaAnomalyProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishAnomalyEvent(NightFlowAnomalyDetectedEvent event) {
        log.info("[Kafka Producer] Publishing NightFlowAnomalyDetected event {} to topic {}", event.getEventId(), topicName);
        kafkaTemplate.send(topicName, event.getPropertyId(), event);
    }
}
