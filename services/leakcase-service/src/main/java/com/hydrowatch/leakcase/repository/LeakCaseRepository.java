package com.hydrowatch.leakcase.repository;

import com.hydrowatch.leakcase.model.LeakCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeakCaseRepository extends JpaRepository<LeakCase, Long> {
    Optional<LeakCase> findByCaseNumber(String caseNumber);
    Optional<LeakCase> findByEventId(String eventId);
    List<LeakCase> findAllByOrderByDetectedAtDesc();
    List<LeakCase> findByPropertyIdOrderByDetectedAtDesc(String propertyId);
}
