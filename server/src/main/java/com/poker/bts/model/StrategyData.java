package com.poker.bts.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Strategy data for a specific scenario
 * Contains 169 hand matrix with action frequencies
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StrategyData {
    private Scenario scenario;
    private StrategyMatrix strategy;
    private StrategySummary summary;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StrategyMatrix {
        private double[][] matrix;  // 169 x 3 (fold, call, raise)
        private List<String> actions;  // ["fold", "call", "raise"]
        private List<String> handLabels;  // 169 hand labels
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StrategySummary {
        private int totalHands;
        private String raiseRange;
        private String callRange;
        private String foldRange;
    }
}
