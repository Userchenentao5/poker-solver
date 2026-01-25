import { useState, useEffect } from 'react';

export interface ScenariosIndex {
  open: string[];
  facingOpen: Record<string, string[]>;
}

export const useScenarios = () => {
  const [scenarios, setScenarios] = useState<ScenariosIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScenarios = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('http://localhost:8081/api/scenarios');

        if (!response.ok) {
          throw new Error('Failed to fetch scenarios');
        }

        const data = await response.json();
        setScenarios(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Failed to fetch scenarios:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchScenarios();
  }, []);

  return { scenarios, loading, error };
};
