package com.poker.bts.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.poker.bts.exception.ScenarioNotFoundException;
import com.poker.bts.model.Position;
import com.poker.bts.model.ScenarioType;
import com.poker.bts.model.StrategyData;
import com.poker.bts.service.StrategyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for StrategyController
 * Tests REST API endpoints
 */
@WebMvcTest(StrategyController.class)
@DisplayName("StrategyController Tests")
class StrategyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private StrategyService strategyService;

    private StrategyData mockStrategyData;

    @BeforeEach
    void setUp() {
        mockStrategyData = createMockStrategyData();
    }

    @Test
    @DisplayName("GET /api/strategy - 应该返回 200 和策略数据")
    void shouldReturnStrategyData() throws Exception {
        // Given
        when(strategyService.getStrategy("BTN", "BB", "FACING_OPEN"))
                .thenReturn(mockStrategyData);

        // When & Then
        mockMvc.perform(get("/strategy")
                        .param("positionA", "BTN")
                        .param("positionB", "BB")
                        .param("type", "FACING_OPEN")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenario.positionA").value("BTN"))
                .andExpect(jsonPath("$.scenario.positionB").value("BB"))
                .andExpect(jsonPath("$.scenario.type").value("FACING_OPEN"))
                .andExpect(jsonPath("$.strategy.matrix").isArray())
                .andExpect(jsonPath("$.strategy.actions").isArray())
                .andExpect(jsonPath("$.strategy.actions[0]").value("fold"))
                .andExpect(jsonPath("$.strategy.actions[1]").value("call"))
                .andExpect(jsonPath("$.strategy.actions[2]").value("raise"))
                .andExpect(jsonPath("$.summary.totalHands").value(169));
    }

    @Test
    @DisplayName("GET /api/strategy - 参数无效时应该返回 400")
    void shouldReturnBadRequestForInvalidParameters() throws Exception {
        // Given
        when(strategyService.getStrategy(eq("INVALID"), any(), any()))
                .thenThrow(new IllegalArgumentException("Invalid position: INVALID"));

        // When & Then
        mockMvc.perform(get("/strategy")
                        .param("positionA", "INVALID")
                        .param("positionB", "BB")
                        .param("type", "OPEN")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("GET /api/strategy - 场景不存在时应该返回 404")
    void shouldReturnNotFoundWhenScenarioNotExists() throws Exception {
        // Given
        ScenarioNotFoundException ex = new ScenarioNotFoundException(
                new com.poker.bts.model.Scenario(Position.UTG, Position.UTG, ScenarioType.OPEN),
                new com.poker.bts.repository.StrategyRepository.ScenariosIndex(),
                "Scenario not found"
        );
        when(strategyService.getStrategy(any(), any(), any()))
                .thenThrow(ex);

        // When & Then
        mockMvc.perform(get("/strategy")
                        .param("positionA", "UTG")
                        .param("positionB", "UTG")
                        .param("type", "OPEN")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Scenario not found"));
    }

    @Test
    @DisplayName("GET /api/strategy - 缺少必需参数时应该返回 400")
    void shouldReturnBadRequestWhenMissingRequiredParameters() throws Exception {
        // When & Then - 缺少 positionB 参数
        mockMvc.perform(get("/strategy")
                        .param("positionA", "BTN")
                        .param("type", "OPEN")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/strategy - Open 场景应该正常工作")
    void shouldHandleOpenScenario() throws Exception {
        // Given
        mockStrategyData.setScenario(new com.poker.bts.model.Scenario(Position.BTN, null, ScenarioType.OPEN));
        when(strategyService.getStrategy("BTN", "BB", "OPEN"))
                .thenReturn(mockStrategyData);

        // When & Then
        mockMvc.perform(get("/strategy")
                        .param("positionA", "BTN")
                        .param("positionB", "BB")
                        .param("type", "OPEN")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenario.positionA").value("BTN"))
                .andExpect(jsonPath("$.scenario.type").value("OPEN"));
    }

    @Test
    @DisplayName("GET /api/strategy - 应该返回正确的矩阵数据格式")
    void shouldReturnCorrectMatrixFormat() throws Exception {
        // Given
        when(strategyService.getStrategy("BTN", "BB", "FACING_OPEN"))
                .thenReturn(mockStrategyData);

        // When & Then
        mockMvc.perform(get("/strategy")
                        .param("positionA", "BTN")
                        .param("positionB", "BB")
                        .param("type", "FACING_OPEN")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.strategy.matrix[0]").isArray())
                .andExpect(jsonPath("$.strategy.matrix[0][0]").isNumber())
                .andExpect(jsonPath("$.strategy.matrix[0][1]").isNumber())
                .andExpect(jsonPath("$.strategy.matrix[0][2]").isNumber());
    }

    @Test
    @DisplayName("GET /api/strategy - 应该返回包含 169 手牌的标签")
    void shouldReturn169HandLabels() throws Exception {
        // Given
        when(strategyService.getStrategy("BTN", "BB", "FACING_OPEN"))
                .thenReturn(mockStrategyData);

        // When & Then
        mockMvc.perform(get("/strategy")
                        .param("positionA", "BTN")
                        .param("positionB", "BB")
                        .param("type", "FACING_OPEN")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.strategy.handLabels").isArray())
                .andExpect(jsonPath("$.strategy.handLabels.length()").value(169))
                .andExpect(jsonPath("$.strategy.handLabels[0]").value("AA"))
                .andExpect(jsonPath("$.strategy.handLabels[168]").value("32o"));
    }

    // Helper method to create mock strategy data
    private StrategyData createMockStrategyData() {
        StrategyData data = new StrategyData();
        data.setScenario(new com.poker.bts.model.Scenario(Position.BTN, Position.BB, ScenarioType.FACING_OPEN));

        StrategyData.StrategyMatrix matrix = new StrategyData.StrategyMatrix();
        matrix.setMatrix(new double[169][3]);
        matrix.getMatrix()[0] = new double[]{0.0, 0.0, 1.0};  // AA
        matrix.getMatrix()[1] = new double[]{0.0, 0.1, 0.9};  // KK
        matrix.setActions(Arrays.asList("fold", "call", "raise"));

        // Create 169 hand labels
        String[] ranks = {"A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"};
        java.util.List<String> labels = new java.util.ArrayList<>();

        // Pairs (13)
        for (String r : ranks) {
            labels.add(r + r);
        }
        // Suited (78) - simplified
        for (int i = 0; i < 78; i++) {
            labels.add("A" + i + "s");
        }
        // Offsuit (78) - simplified
        for (int i = 0; i < 78; i++) {
            labels.add("K" + i + "o");
        }
        labels.set(13, "AKs");
        labels.set(168, "32o");

        matrix.setHandLabels(labels);
        data.setStrategy(matrix);

        StrategyData.StrategySummary summary = new StrategyData.StrategySummary();
        summary.setTotalHands(169);
        summary.setRaiseRange("50.0%");
        summary.setCallRange("30.0%");
        summary.setFoldRange("20.0%");
        data.setSummary(summary);

        return data;
    }
}
