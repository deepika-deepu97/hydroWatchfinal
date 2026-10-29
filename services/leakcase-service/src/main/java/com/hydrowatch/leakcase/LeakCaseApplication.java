package com.hydrowatch.leakcase;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class LeakCaseApplication {
    public static void main(String[] args) {
        SpringApplication.run(LeakCaseApplication.class, args);
    }
}
