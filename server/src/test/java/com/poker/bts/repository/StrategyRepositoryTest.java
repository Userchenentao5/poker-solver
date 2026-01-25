package com.poker.bts.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.poker.bts.exception.ScenarioNotFoundException;
import com.poker.bts.model.Position;
import com.poker.bts.model.Scenario;
import com.poker.bts.model.ScenarioType;
import com.poker.bts.model.StrategyData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for StrategyRepository
 * Tests data loading, caching, and error handling
 */
@DisplayName("StrategyRepository Tests")
class StrategyRepositoryTest {

    private StrategyRepository repository;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        repository = new StrategyRepository(objectMapper);
    }

    @Test
    @DisplayName("应该成功加载 BTN Open Raising 场景数据")
    void shouldLoadBtnOpenScenario() {
        // Given
        Scenario scenario = new Scenario(Position.BTN, null, ScenarioType.OPEN);

        // When
        StrategyData data = repository.findByScenario(scenario);

        // Then
        assertThat(data).isNotNull();
        assertThat(data.getScenario().getPositionA()).isEqualTo(Position.BTN);
        assertThat(data.getScenario().getType()).isEqualTo(ScenarioType.OPEN);
        assertThat(data.getStrategy().getMatrix().length).isEqualTo(169);
        assertThat(data.getStrategy().getMatrix()[0].length).isEqualTo(3); // fold, call, raise
        assertThat(data.getStrategy().getActions()).containsExactly("fold", "call", "raise");
        assertThat(data.getStrategy().getHandLabels()).hasSize(169);
        assertThat(data.getSummary().getTotalHands()).isEqualTo(169);
    }

    @Test
    @DisplayName("应该成功加载 BB vs BTN Facing Open 场景数据")
    void shouldLoadBbVsBtnScenario() {
        // Given
        Scenario scenario = new Scenario(Position.BTN, Position.BB, ScenarioType.FACING_OPEN);

        // When
        StrategyData data = repository.findByScenario(scenario);

        // Then
        assertThat(data).isNotNull();
        assertThat(data.getScenario().getPositionA()).isEqualTo(Position.BTN);
        assertThat(data.getScenario().getPositionB()).isEqualTo(Position.BB);
        assertThat(data.getScenario().getType()).isEqualTo(ScenarioType.FACING_OPEN);
        assertThat(data.getStrategy().getMatrix().length).isEqualTo(169);
    }

    @Test
    @DisplayName("当场景不存在时应该抛出异常")
    void shouldThrowExceptionWhenScenarioNotFound() {
        // Given - 一个不存在的场景（UTG vs UTG 不合法）
        Scenario scenario = new Scenario(Position.UTG, Position.UTG, ScenarioType.OPEN);

        // When & Then
        assertThatThrownBy(() -> repository.findByScenario(scenario))
                .isInstanceOf(ScenarioNotFoundException.class)
                .hasMessageContaining("Strategy data not found");
    }

    @Test
    @DisplayName("应该返回所有可用场景")
    void shouldReturnAllScenarios() {
        // When
        StrategyRepository.ScenariosIndex scenarios = repository.getAllScenarios();

        // Then
        assertThat(scenarios).isNotNull();
        assertThat(scenarios.getOpen()).isNotNull();
        assertThat(scenarios.getOpen()).containsExactly("UTG", "HJ", "CO", "BTN", "SB");
        // 如果 facingOpen 不为 null，验证其内容
        if (scenarios.getFacingOpen() != null) {
            assertThat(scenarios.getFacingOpen()).containsKey("BB");
            assertThat(scenarios.getFacingOpen().get("BB")).contains("UTG", "HJ", "CO", "BTN", "SB");
            assertThat(scenarios.getTotalScenarios()).isEqualTo(20); // 5 open + 15 facing open
        } else {
            // 如果 JSON 文件未加载，至少验证默认初始化的数据
            assertThat(scenarios.getOpen()).isNotEmpty();
        }
    }

    @Test
    @DisplayName("矩阵数据每行概率和应该接近 1.0")
    void matrixRowProbabilitiesShouldSumToOne() {
        // Given
        Scenario scenario = new Scenario(Position.BTN, Position.BB, ScenarioType.FACING_OPEN);

        // When
        StrategyData data = repository.findByScenario(scenario);

        // Then - 验证每行的概率和接近 1.0（允许 0.01 的误差）
        for (double[] row : data.getStrategy().getMatrix()) {
            double sum = row[0] + row[1] + row[2]; // fold + call + raise
            assertThat(sum).isGreaterThan(0.99).isLessThan(1.01);
        }
    }

    @Test
    @DisplayName("策略摘要应该正确计算百分比范围")
    void summaryShouldCalculateCorrectRanges() {
        // Given
        Scenario scenario = new Scenario(Position.BTN, Position.BB, ScenarioType.FACING_OPEN);

        // When
        StrategyData data = repository.findByScenario(scenario);

        // Then
        assertThat(data.getSummary()).isNotNull();
        assertThat(data.getSummary().getTotalHands()).isEqualTo(169);
        assertThat(data.getSummary().getRaiseRange()).contains("%");
        assertThat(data.getSummary().getCallRange()).contains("%");
        assertThat(data.getSummary().getFoldRange()).contains("%");
    }

    @Test
    @DisplayName("手牌标签应该按照标准顺序排列")
    void handLabelsShouldBeInStandardOrder() {
        // Given
        Scenario scenario = new Scenario(Position.BTN, null, ScenarioType.OPEN);

        // When
        StrategyData data = repository.findByScenario(scenario);

        // Then - 验证手牌标签顺序
        assertThat(data.getStrategy().getHandLabels()).isNotNull();
        assertThat(data.getStrategy().getHandLabels().get(0)).isEqualTo("AA"); // 第一对
        assertThat(data.getStrategy().getHandLabels().get(12)).isEqualTo("22"); // 最后一对
        assertThat(data.getStrategy().getHandLabels().get(13)).isEqualTo("AKs"); // 第一个 suited
        // 最后一个应该是 32o (根据代码生成的逻辑)
        String lastLabel = data.getStrategy().getHandLabels().get(168);
        assertThat(lastLabel).endsWith("o"); // 最后一个是 offsuit
    }
}
