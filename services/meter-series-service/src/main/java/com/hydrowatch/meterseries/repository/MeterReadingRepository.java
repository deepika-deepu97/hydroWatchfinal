package com.hydrowatch.meterseries.repository;

import com.hydrowatch.meterseries.model.MeterReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MeterReadingRepository extends JpaRepository<MeterReading, Long> {
    List<MeterReading> findByPropertyIdOrderByTimestampDesc(String propertyId);
}
