package com.hydrowatch.meterseries.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "meter_readings")
public class MeterReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String propertyId;

    @Column(nullable = false)
    private double flowRate;

    @Column(nullable = false)
    private Instant timestamp;

    public MeterReading() {}

    public MeterReading(String propertyId, double flowRate, Instant timestamp) {
        this.propertyId = propertyId;
        this.flowRate = flowRate;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public String getPropertyId() { return propertyId; }
    public void setPropertyId(String propertyId) { this.propertyId = propertyId; }
    public double getFlowRate() { return flowRate; }
    public void setFlowRate(double flowRate) { this.flowRate = flowRate; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
