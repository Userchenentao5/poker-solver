package com.poker.bts.service;

import com.poker.bts.model.Scenario;
import com.poker.bts.model.ScenarioType;
import com.poker.bts.model.StrategyData;
import com.poker.bts.repository.StrategyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service layer for strategy operations
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StrategyService {

    private final StrategyRepository repository;

    /**
     * Get strategy data for a specific scenario
     */
    @Cacheable(value = "strategyServiceCache", key = "#positionA + '-' + #positionB + '-' + #type")
    public StrategyData getStrategy(String positionA, String positionB, String type) {
        log.info("Fetching strategy: {} vs {}, type={}", positionA, positionB, type);

        com.poker.bts.model.Position posA = com.poker.bts.model.Position.fromCode(positionA);
        com.poker.bts.model.Position posB = positionB != null
                ? com.poker.bts.model.Position.fromCode(positionB)
                : null;
        ScenarioType scenarioType = ScenarioType.fromCode(type);

        Scenario scenario = new Scenario(posA, posB, scenarioType);

        return repository.findByScenario(scenario);
    }

    /**
     * Get all available scenarios
     */
    @Cacheable(value = "scenariosCache")
    public StrategyRepository.ScenariosIndex getAllScenarios() {
        return repository.getAllScenarios();
    }

    /**
     * Clear all caches (for testing/data refresh)
     */
    @CacheEvict(value = {"strategyServiceCache", "scenariosCache"}, allEntries = true)
    public void clearCache() {
        log.info("All caches cleared");
    }
}
