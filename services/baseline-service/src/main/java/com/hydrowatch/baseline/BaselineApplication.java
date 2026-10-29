package com.hydrowatch.baseline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class BaselineApplication {
    public static void main(String[] args) {
        SpringApplication.run(BaselineApplication.class, args);
    }
}
