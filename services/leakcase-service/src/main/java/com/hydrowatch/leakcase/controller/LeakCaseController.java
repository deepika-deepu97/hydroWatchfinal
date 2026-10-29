package com.hydrowatch.leakcase.controller;

import com.hydrowatch.leakcase.model.LeakCase;
import com.hydrowatch.leakcase.repository.LeakCaseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leak-cases")
public class LeakCaseController {

    private final LeakCaseRepository leakCaseRepository;

    public LeakCaseController(LeakCaseRepository leakCaseRepository) {
        this.leakCaseRepository = leakCaseRepository;
    }

    @GetMapping
    public ResponseEntity<List<LeakCase>> getAllCases() {
        return ResponseEntity.ok(leakCaseRepository.findAllByOrderByDetectedAtDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeakCase> getCaseById(@PathVariable Long id) {
        return leakCaseRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        String notes = body.get("notes");

        return leakCaseRepository.findById(id).map(caseItem -> {
            caseItem.setStatus(newStatus);
            if ("Under Investigation".equals(newStatus) && caseItem.getInvestigatedAt() == null) {
                caseItem.setInvestigatedAt(Instant.now());
            }
            if ("Resolved".equals(newStatus)) {
                caseItem.setResolvedAt(Instant.now());
            }
            if (notes != null && !notes.isBlank()) {
                caseItem.setNotes(notes);
            }
            LeakCase saved = leakCaseRepository.save(caseItem);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }
}
