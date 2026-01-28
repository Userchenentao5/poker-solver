package com.poker.bts.service;

import com.poker.bts.model.Position;
import com.poker.bts.model.ScenarioType;
import com.poker.bts.model.StrategyData;
import com.poker.bts.repository.StrategyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Unit tests for StrategyService
 * Tests business logic and caching behavior
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("StrategyService Tests")
class StrategyServiceTest {

    @Mock
    private StrategyRepository repository;

    @InjectMocks
    private StrategyService strategyService;

    @BeforeEach
    void setUp() {
        // Mock behavior will be set up in each test
    }

    @Test
    @DisplayName("应该成功获取 BTN Open 场景策略")
    void shouldGetBtnOpenStrategy() {
        // Given
        String positionA = "BTN";
        String positionB = "BB";
        String type = "OPEN";

        org.mockito.Mockito.when(repository.findByScenario(any()))
                .thenAnswer(invocation -> {
                    com.poker.bts.model.Scenario scenario = invocation.getArgument(0);
                    return createMockStrategyData(scenario);
                });

        // When
        StrategyData result = strategyService.getStrategy(positionA, positionB, type);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getScenario().getPositionA()).isEqualTo(Position.BTN);
        verify(repository, times(1)).findByScenario(any());
    }

    @Test
    @DisplayName("应该成功获取 BB vs BTN Facing Open 场景策略")
    void shouldGetBbVsBtnStrategy() {
        // Given
        String positionA = "BTN";
        String positionB = "BB";
        String type = "FACING_OPEN";

        // 使用 Answer 来根据输入参数返回正确类型的 mock 数据
        org.mockito.Mockito.when(repository.findByScenario(any()))
                .thenAnswer(invocation -> {
                    com.poker.bts.model.Scenario scenario = invocation.getArgument(0);
                    return createMockStrategyData(scenario);
                });

        // When
        StrategyData result = strategyService.getStrategy(positionA, positionB, type);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getScenario().getPositionA()).isEqualTo(Position.BTN);
        assertThat(result.getScenario().getPositionB()).isEqualTo(Position.BB);
        assertThat(result.getScenario().getType()).isEqualTo(ScenarioType.FACING_OPEN);
    }

    @Test
    @DisplayName("应该成功获取所有可用场景")
    void shouldGetAllScenarios() {
        // Given
        StrategyRepository.ScenariosIndex mockIndex = new StrategyRepository.ScenariosIndex();
        org.mockito.Mockito.when(repository.getAllScenarios())
                .thenReturn(mockIndex);

        // When
        StrategyRepository.ScenariosIndex result = strategyService.getAllScenarios();

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getOpen()).hasSize(5);
        verify(repository, times(1)).getAllScenarios();
    }

    @Test
    @DisplayName("清空缓存后再次请求应该重新调用 Repository")
    void shouldCallRepositoryAgainAfterCacheClear() {
        // Given
        String positionA = "BTN";
        String positionB = "BB";
        String type = "OPEN";

        org.mockito.Mockito.when(repository.findByScenario(any()))
                .thenAnswer(invocation -> {
                    com.poker.bts.model.Scenario scenario = invocation.getArgument(0);
                    return createMockStrategyData(scenario);
                });

        // When - 第一次请求
        strategyService.getStrategy(positionA, positionB, type);

        // 清空缓存
        strategyService.clearCache();

        // 再次请求
        strategyService.getStrategy(positionA, positionB, type);

        // Then - 应该调用两次 repository
        verify(repository, times(2)).findByScenario(any());
    }

    @Test
    @DisplayName("应该正确处理不区分大小写的位置参数")
    void shouldHandleCaseInsensitivePositionParameters() {
        // Given
        String positionA = "btn";  // 小写
        String positionB = "bb";   // 小写
        String type = "open";      // 小写

        org.mockito.Mockito.when(repository.findByScenario(any()))
                .thenAnswer(invocation -> {
                    com.poker.bts.model.Scenario scenario = invocation.getArgument(0);
                    return createMockStrategyData(scenario);
                });

        // When
        StrategyData result = strategyService.getStrategy(positionA, positionB, type);

        // Then
        assertThat(result).isNotNull();
        verify(repository, times(1)).findByScenario(any());
    }

    // Helper method to create mock data with given scenario
    private StrategyData createMockStrategyData(com.poker.bts.model.Scenario scenario) {
        StrategyData data = new StrategyData();
        data.setScenario(scenario);

        StrategyData.StrategyMatrix matrix = new StrategyData.StrategyMatrix();
        matrix.setMatrix(new double[][]{{0.0, 0.0, 1.0}, {0.1, 0.2, 0.7}});
        matrix.setActions(java.util.Arrays.asList("fold", "call", "raise"));
        matrix.setHandLabels(java.util.Arrays.asList("AA", "KK"));
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
