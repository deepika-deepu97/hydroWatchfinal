package com.hydrowatch.baseline.event;

import java.io.Serializable;
import java.time.Instant;

public class NightFlowAnomalyDetectedEvent implements Serializable {
    private String eventId;
    private String eventType = "NightFlowAnomalyDetected";
    private String topic = "soa.s10.t02.events";
    private String propertyId;
    private String propertyName;
    private String address;
    private double currentFlow;
    private double baselineFlow;
    private double deviationPercentage;
    private double thresholdPercent;
    private String severity;
    private Instant timestamp = Instant.now();

    public NightFlowAnomalyDetectedEvent() {}

    public NightFlowAnomalyDetectedEvent(String eventId, String propertyId, String propertyName, String address,
                                        double currentFlow, double baselineFlow, double deviationPercentage,
                                        double thresholdPercent, String severity) {
        this.eventId = eventId;
        this.propertyId = propertyId;
        this.propertyName = propertyName;
        this.address = address;
        this.currentFlow = currentFlow;
        this.baselineFlow = baselineFlow;
        this.deviationPercentage = deviationPercentage;
        this.thresholdPercent = thresholdPercent;
        this.severity = severity;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getPropertyId() { return propertyId; }
    public void setPropertyId(String propertyId) { this.propertyId = propertyId; }

    public String getPropertyName() { return propertyName; }
    public void setPropertyName(String propertyName) { this.propertyName = propertyName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public double getCurrentFlow() { return currentFlow; }
    public void setCurrentFlow(double currentFlow) { this.currentFlow = currentFlow; }

    public double getBaselineFlow() { return baselineFlow; }
    public void setBaselineFlow(double baselineFlow) { this.baselineFlow = baselineFlow; }

    public double getDeviationPercentage() { return deviationPercentage; }
    public void setDeviationPercentage(double deviationPercentage) { this.deviationPercentage = deviationPercentage; }

    public double getThresholdPercent() { return thresholdPercent; }
    public void setThresholdPercent(double thresholdPercent) { this.thresholdPercent = thresholdPercent; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
