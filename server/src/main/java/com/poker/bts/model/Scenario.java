package com.poker.bts.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a unique poker scenario identified by (positionA, positionB, type)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Scenario {
    private Position positionA;
    private Position positionB;
    private ScenarioType type;

    /**
     * Generate unique key for caching
     */
    public String toKey() {
        String posBStr = positionB != null ? positionB.getCode() : "NONE";
        return positionA.getCode() + "_" + posBStr + "_" + type.getCode();
    }

    @Override
    public String toString() {
        String posBStr = positionB != null ? positionB.toString() : "NONE";
        return String.format("Scenario{%s vs %s, %s}", positionA, posBStr, type);
    }
}
