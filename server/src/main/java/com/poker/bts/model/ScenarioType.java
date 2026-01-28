package com.poker.bts.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Scenario type enum
 */
public enum ScenarioType {
    OPEN("OPEN", "Open Raising - player A opens first"),
    FACING_OPEN("FACING_OPEN", "Facing Open - player B responds to player A's open");

    private final String code;
    private final String description;

    ScenarioType(String code, String description) {
        this.code = code;
        this.description = description;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }

    public static ScenarioType fromCode(String code) {
        for (ScenarioType type : values()) {
            if (type.code.equalsIgnoreCase(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Invalid scenario type: " + code);
    }
}
