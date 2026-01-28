package com.poker.bts.exception;

import com.poker.bts.model.Scenario;
import com.poker.bts.repository.StrategyRepository.ScenariosIndex;

/**
 * Exception thrown when scenario data is not found
 */
public class ScenarioNotFoundException extends RuntimeException {

    private final Scenario scenario;
    private final ScenariosIndex availableScenarios;

    public ScenarioNotFoundException(Scenario scenario, ScenariosIndex availableScenarios, String message) {
        super(message);
        this.scenario = scenario;
        this.availableScenarios = availableScenarios;
    }

    public Scenario getScenario() {
        return scenario;
    }

    public ScenariosIndex getAvailableScenarios() {
        return availableScenarios;
    }
}
