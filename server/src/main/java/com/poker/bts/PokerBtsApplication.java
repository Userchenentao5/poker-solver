package com.poker.bts;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/**
 * Spring Boot Application Entry Point
 * BTS Preflop Strategy Query Service
 */
@SpringBootApplication
@EnableCaching
public class PokerBtsApplication {

    public static void main(String[] args) {
        SpringApplication.run(PokerBtsApplication.class, args);
    }
}
