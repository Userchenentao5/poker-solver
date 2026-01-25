package com.poker.bts.controller;

import com.poker.bts.repository.StrategyRepository.ScenariosIndex;
import com.poker.bts.service.StrategyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for scenarios list
 */
@Slf4j
@RestController
@RequestMapping("/scenarios")
@RequiredArgsConstructor
public class ScenariosController {

    private final StrategyService strategyService;

    /**
     * GET /api/scenarios
     *
     * Get all available scenarios
     */
    @GetMapping
    public ResponseEntity<ScenariosIndex> getAllScenarios() {
        log.info("Fetching all available scenarios");
        ScenariosIndex scenarios = strategyService.getAllScenarios();
        return ResponseEntity.ok(scenarios);
    }
}
