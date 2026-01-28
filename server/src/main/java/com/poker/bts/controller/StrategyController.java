package com.poker.bts.controller;

import com.poker.bts.model.StrategyData;
import com.poker.bts.service.StrategyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for strategy queries
 */
@Slf4j
@RestController
@RequestMapping("/strategy")
@RequiredArgsConstructor
public class StrategyController {

    private final StrategyService strategyService;

    /**
     * GET /api/strategy?positionA=BTN&positionB=BB&type=FACING_OPEN
     * GET /api/strategy?positionA=BTN&type=OPEN
     *
     * Get strategy data for a specific scenario
     */
    @GetMapping
    public ResponseEntity<?> getStrategy(
            @RequestParam String positionA,
            @RequestParam(required = false) String positionB,
            @RequestParam String type) {

        // 验证必需参数
        if (positionA == null || type == null) {
            return ResponseEntity.badRequest().body(new ErrorResponse(
                    "Invalid parameters",
                    "Missing required parameters: positionA, type"
            ));
        }

        // For FACING_OPEN scenarios, positionB is required
        if ("FACING_OPEN".equalsIgnoreCase(type) && positionB == null) {
            return ResponseEntity.badRequest().body(new ErrorResponse(
                    "Invalid parameters",
                    "Missing required parameter: positionB (required for FACING_OPEN scenarios)"
            ));
        }

        try {
            log.info("Strategy request: {} vs {}, type={}", positionA, positionB, type);
            StrategyData data = strategyService.getStrategy(positionA, positionB, type);
            return ResponseEntity.ok(data);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(
                    "Invalid parameters",
                    e.getMessage()
            ));
        } catch (com.poker.bts.exception.ScenarioNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(
                    "Scenario not found",
                    e.getMessage()
            ));
        }
    }

    /**
     * Error response structure
     */
    private record ErrorResponse(String error, String details) {}
}
