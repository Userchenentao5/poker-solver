package com.poker.bts.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.poker.bts.exception.ScenarioNotFoundException;
import com.poker.bts.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;

/**
 * Repository for loading and caching strategy data from JSON files
 */
@Slf4j
@Repository
public class StrategyRepository {

    private static final String DATA_BASE_PATH = "data/bts/";
    private static final String SCENARIOS_INDEX_FILE = "data/scenarios-index.json";

    private final ObjectMapper objectMapper;
    private ScenariosIndex scenariosIndex = new ScenariosIndex(); // 默认初始化

    public StrategyRepository(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        try {
            loadScenariosIndex();
            log.info("StrategyRepository initialized with {} scenarios",
                    scenariosIndex.getTotalScenarios());
        } catch (Exception e) {
            log.warn("Failed to load scenarios index: {}", e.getMessage());
        }
    }

    /**
     * Load scenarios index from JSON file
     */
    private void loadScenariosIndex() {
        try (InputStream is = new ClassPathResource(SCENARIOS_INDEX_FILE).getInputStream()) {
            scenariosIndex = objectMapper.readValue(is, ScenariosIndex.class);
        } catch (IOException e) {
            // Create default index if file doesn't exist
            scenariosIndex = new ScenariosIndex();
            log.warn("Using default scenarios index");
        }
    }

    /**
     * Find strategy data for a specific scenario
     * Results are cached using Caffeine
     */
    @Cacheable(value = "strategyCache", key = "#scenario.toKey()")
    public StrategyData findByScenario(Scenario scenario) {
        log.debug("Loading strategy for: {}", scenario);

        String dataPath = buildDataPath(scenario);
        try (InputStream is = new ClassPathResource(dataPath).getInputStream()) {
            StrategyJson json = objectMapper.readValue(is, StrategyJson.class);
            return convertToStrategyData(json, scenario);
        } catch (IOException e) {
            throw new ScenarioNotFoundException(
                    scenario,
                    scenariosIndex,
                    "Strategy data not found at: " + dataPath
            );
        }
    }

    /**
     * Get all available scenarios
     */
    public ScenariosIndex getAllScenarios() {
        return scenariosIndex;
    }

    /**
     * Build file path for scenario data
     */
    private String buildDataPath(Scenario scenario) {
        String filename;
        if (scenario.getType() == ScenarioType.OPEN) {
            filename = scenario.getPositionA().getCode().toLowerCase() + ".json";
            return DATA_BASE_PATH + "open/" + filename;
        } else {
            String posA = scenario.getPositionA().getCode().toLowerCase();
            String posB = scenario.getPositionB().getCode().toLowerCase();
            filename = posB + "-vs-" + posA + ".json";
            return DATA_BASE_PATH + "facing-open/" + filename;
        }
    }

    /**
     * Convert JSON to StrategyData
     */
    private StrategyData convertToStrategyData(StrategyJson json, Scenario scenario) {
        StrategyData data = new StrategyData();
        data.setScenario(scenario);

        StrategyData.StrategyMatrix matrix = new StrategyData.StrategyMatrix();
        matrix.setMatrix(json.getMatrix());
        matrix.setActions(Arrays.asList("fold", "call", "raise"));
        matrix.setHandLabels(getHandLabels());

        data.setStrategy(matrix);

        // Calculate summary
        StrategyData.StrategySummary summary = calculateSummary(json.getMatrix());
        data.setSummary(summary);

        return data;
    }

    /**
     * Get 169 hand labels in standard order
     */
    private List<String> getHandLabels() {
        List<String> labels = new ArrayList<>();
        String[] ranks = {"A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"};

        // Pairs (13)
        for (String r1 : ranks) {
            labels.add(r1 + r1);
        }

        // Suited (78) - above diagonal
        for (int i = 0; i < ranks.length; i++) {
            for (int j = i + 1; j < ranks.length; j++) {
                labels.add(ranks[i] + ranks[j] + "s");
            }
        }

        // Offsuit (78) - below diagonal
        for (int i = 0; i < ranks.length; i++) {
            for (int j = i + 1; j < ranks.length; j++) {
                labels.add(ranks[j] + ranks[i] + "o");
            }
        }

        return labels;
    }

    /**
     * Calculate summary statistics from matrix
     */
    private StrategyData.StrategySummary calculateSummary(double[][] matrix) {
        double totalFold = 0;
        double totalCall = 0;
        double totalRaise = 0;

        for (double[] row : matrix) {
            totalFold += row[0];
            totalCall += row[1];
            totalRaise += row[2];
        }

        int totalHands = matrix.length;

        StrategyData.StrategySummary summary = new StrategyData.StrategySummary();
        summary.setTotalHands(totalHands);
        summary.setFoldRange(String.format("%.1f%%", (totalFold / totalHands) * 100));
        summary.setCallRange(String.format("%.1f%%", (totalCall / totalHands) * 100));
        summary.setRaiseRange(String.format("%.1f%%", (totalRaise / totalHands) * 100));

        return summary;
    }

    /**
     * Scenarios index structure
     */
    public static class ScenariosIndex {
        private List<String> open;
        private Map<String, List<String>> facingOpen;

        // Default constructor that initializes the data
        public ScenariosIndex() {
            this.open = new ArrayList<>(Arrays.asList("UTG", "HJ", "CO", "BTN", "SB"));
            this.facingOpen = new LinkedHashMap<>();
            this.facingOpen.put("BB", Arrays.asList("UTG", "HJ", "CO", "BTN", "SB"));
            this.facingOpen.put("SB", Arrays.asList("UTG", "HJ", "CO", "BTN"));
            this.facingOpen.put("BTN", Arrays.asList("UTG", "HJ", "CO"));
            this.facingOpen.put("CO", Arrays.asList("UTG", "HJ"));
            this.facingOpen.put("HJ", Arrays.asList("UTG"));
        }

        // Getters and setters for Jackson serialization
        public List<String> getOpen() {
            return open;
        }

        public void setOpen(List<String> open) {
            this.open = open;
        }

        public Map<String, List<String>> getFacingOpen() {
            return facingOpen;
        }

        public void setFacingOpen(Map<String, List<String>> facingOpen) {
            this.facingOpen = facingOpen;
        }

        public int getTotalScenarios() {
            return open.size() + facingOpen.values().stream().mapToInt(List::size).sum();
        }
    }

    /**
     * JSON structure for strategy data files
     */
    @lombok.Data
    private static class StrategyJson {
        private Map<String, Object> scenario;
        private double[][] matrix;
        private Map<String, Object> metadata;
    }
}
