package com.hydrowatch.meterseries;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class MeterSeriesApplication {
    public static void main(String[] args) {
        SpringApplication.run(MeterSeriesApplication.class, args);
    }
}
