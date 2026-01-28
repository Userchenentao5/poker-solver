package com.poker.bts.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents actions for a single hand
 * @author 30952
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HandAction {
    private String hand;  // e.g., "AA", "AKs", "AKo"
    private double fold;
    private double call;
    private double raise;

    /**
     * Validate that probabilities sum to 1.0 (with tolerance)
     */
    public boolean isValid() {
        double sum = fold + call + raise;
        return Math.abs(sum - 1.0) < 0.01;
    }
}
