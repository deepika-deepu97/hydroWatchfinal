package com.hydrowatch.meterseries.controller;

import com.hydrowatch.meterseries.model.MeterReading;
import com.hydrowatch.meterseries.repository.MeterReadingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/meter-series")
public class MeterSeriesController {

    private final MeterReadingRepository repository;

    public MeterSeriesController(MeterReadingRepository repository) {
        this.repository = repository;
    }

    @PostMapping("/readings")
    public ResponseEntity<MeterReading> recordReading(@RequestBody ReadingSubmissionRequest request) {
        MeterReading reading = new MeterReading(
                request.propertyId(),
                request.flowRate(),
                Instant.now()
        );
        MeterReading saved = repository.save(reading);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/readings")
    public ResponseEntity<List<MeterReading>> getReadings(@RequestParam String propertyId) {
        return ResponseEntity.ok(repository.findByPropertyIdOrderByTimestampDesc(propertyId));
    }

    public record ReadingSubmissionRequest(String propertyId, double flowRate) {}
}
