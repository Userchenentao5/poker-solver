package com.poker.bts.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Global exception handler for REST controllers
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ScenarioNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleScenarioNotFound(ScenarioNotFoundException ex) {
        log.warn("Scenario not found: {}", ex.getScenario());

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "Scenario not found",
                "message", ex.getMessage(),
                "requestedScenario", Map.of(
                        "positionA", ex.getScenario().getPositionA(),
                        "positionB", ex.getScenario().getPositionB(),
                        "type", ex.getScenario().getType()
                ),
                "availableScenarios", ex.getAvailableScenarios()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Invalid argument: {}", ex.getMessage());

        return ResponseEntity.badRequest().body(Map.of(
                "error", "Invalid parameters",
                "details", ex.getMessage()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("Unexpected error", ex);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Internal server error",
                "message", ex.getMessage()
        ));
    }
}
