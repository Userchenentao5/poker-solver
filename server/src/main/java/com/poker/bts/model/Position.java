package com.poker.bts.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Poker position enum for 6-max table
 */
public enum Position {
    UTG("UTG", "Under the Gun"),
    HJ("HJ", "Hijack"),
    CO("CO", "Cutoff"),
    BTN("BTN", "Button"),
    SB("SB", "Small Blind"),
    BB("BB", "Big Blind");

    private final String code;
    private final String description;

    Position(String code, String description) {
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

    public static Position fromCode(String code) {
        for (Position pos : values()) {
            if (pos.code.equalsIgnoreCase(code)) {
                return pos;
            }
        }
        throw new IllegalArgumentException("Invalid position: " + code);
    }
}
