import { useState, useEffect } from 'react';
import type { Scenario } from '../components/ScenarioSelector';

export interface StrategyData {
  scenario: {
    positionA: string;
    positionB: string | null;
    type: string;
  };
  strategy: {
    matrix: number[][];
    actions: string[];
    handLabels: string[];
  };
  summary: {
    totalHands: number;
    foldRange: string;
    callRange: string;
    raiseRange: string;
  };
}

export const useBTSStrategy = (scenario: Scenario) => {
  const [strategy, setStrategy] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrategy = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          positionA: scenario.positionA,
          type: scenario.type
        });

        // Only include positionB for FACING_OPEN scenarios
        if (scenario.type === 'FACING_OPEN' && scenario.positionB) {
          params.append('positionB', scenario.positionB);
        }

        const response = await fetch(`http://localhost:8081/api/strategy?${params}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to fetch strategy');
        }

        const data = await response.json();
        setStrategy(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Failed to fetch strategy:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategy();
  }, [scenario]);

  return { strategy, loading, error };
};
