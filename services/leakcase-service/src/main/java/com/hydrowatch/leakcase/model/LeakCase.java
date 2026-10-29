package com.hydrowatch.leakcase.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "leak_cases")
public class LeakCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String caseNumber;

    @Column(nullable = false)
    private String propertyId;

    @Column(nullable = false)
    private String propertyName;

    private String address;

    @Column(nullable = false)
    private double currentFlow;

    @Column(nullable = false)
    private double baselineFlow;

    @Column(nullable = false)
    private double deviationPercentage;

    private double thresholdPercent;

    @Column(nullable = false)
    private String severity; // Low, Moderate, High, Severe

    @Column(nullable = false)
    private String status; // Open, Under Investigation, Resolved

    @Column(nullable = false)
    private Instant detectedAt;

    private Instant investigatedAt;
    private Instant resolvedAt;

    @Column(nullable = false, unique = true)
    private String eventId; // For Kafka idempotency

    @Column(length = 1000)
    private String notes;

    public LeakCase() {}

    public LeakCase(String caseNumber, String propertyId, String propertyName, String address,
                    double currentFlow, double baselineFlow, double deviationPercentage,
                    double thresholdPercent, String severity, String status, Instant detectedAt,
                    String eventId, String notes) {
        this.caseNumber = caseNumber;
        this.propertyId = propertyId;
        this.propertyName = propertyName;
        this.address = address;
        this.currentFlow = currentFlow;
        this.baselineFlow = baselineFlow;
        this.deviationPercentage = deviationPercentage;
        this.thresholdPercent = thresholdPercent;
        this.severity = severity;
        this.status = status;
        this.detectedAt = detectedAt;
        this.eventId = eventId;
        this.notes = notes;
    }

    public Long getId() { return id; }
    public String getCaseNumber() { return caseNumber; }
    public void setCaseNumber(String caseNumber) { this.caseNumber = caseNumber; }
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
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getDetectedAt() { return detectedAt; }
    public void setDetectedAt(Instant detectedAt) { this.detectedAt = detectedAt; }
    public Instant getInvestigatedAt() { return investigatedAt; }
    public void setInvestigatedAt(Instant investigatedAt) { this.investigatedAt = investigatedAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
