package com.hydrowatch.baseline.controller;

import com.hydrowatch.baseline.service.BaselineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/baseline")
public class BaselineController {

    private final BaselineService baselineService;

    public BaselineController(BaselineService baselineService) {
        this.baselineService = baselineService;
    }

    @PostMapping("/evaluate")
    public ResponseEntity<?> evaluate(@RequestBody EvaluationRequest request) {
        var response = baselineService.evaluate(
                request.propertyId(),
                request.propertyName(),
                request.address(),
                request.currentFlow(),
                request.baselineFlow(),
                request.thresholdPercent()
        );
        return ResponseEntity.ok(response);
    }

    public record EvaluationRequest(
            String propertyId,
            String propertyName,
            String address,
            double currentFlow,
            double baselineFlow,
            double thresholdPercent
    ) {}
}
