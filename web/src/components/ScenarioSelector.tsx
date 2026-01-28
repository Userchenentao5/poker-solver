import React from 'react';
import { useScenarios } from '../hooks/useScenarios';

export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
export type ScenarioType = 'OPEN' | 'FACING_OPEN';

export interface Scenario {
  positionA: Position;
  positionB?: Position;
  type: ScenarioType;
}

interface ScenarioSelectorProps {
  onScenarioChange: (scenario: Scenario) => void;
  currentScenario?: Scenario;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  onScenarioChange,
  currentScenario
}) => {
  const { scenarios, loading, error } = useScenarios();

  const [positionA, setPositionA] = React.useState<Position>(
    currentScenario?.positionA || 'BTN'
  );
  const [positionB, setPositionB] = React.useState<Position>(
    currentScenario?.positionB || 'BB'
  );
  const [scenarioType, setScenarioType] = React.useState<ScenarioType>(
    currentScenario?.type || 'OPEN'
  );

  // Get available options based on scenario type and loaded data
  const getAvailablePositionsForA = (): Position[] => {
    if (!scenarios) return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

    if (scenarioType === 'OPEN') {
      return scenarios.open as Position[];
    } else {
      // FACING_OPEN: positionA is the defender position
      return Object.keys(scenarios.facingOpen) as Position[];
    }
  };

  // Get valid positionB options based on positionA for FACING_OPEN
  const getAvailablePositionsForB = (): Position[] => {
    if (!scenarios || scenarioType !== 'FACING_OPEN') {
      return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    }

    // Get valid opponents for current positionA (defender)
    const validOpponents = scenarios.facingOpen[positionA];
    return validOpponents as Position[];
  };

  const handlePositionAChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPosA = e.target.value as Position;
    setPositionA(newPosA);

    // Reset positionB when switching positionA in FACING_OPEN mode
    const newPosB = scenarioType === 'FACING_OPEN'
      ? getAvailablePositionsForB()[0]
      : positionB;

    if (scenarioType === 'FACING_OPEN' && newPosB) {
      setPositionB(newPosB);
    }

    onScenarioChange({
      positionA: newPosA,
      positionB: scenarioType === 'FACING_OPEN' ? newPosB : undefined,
      type: scenarioType
    });
  };

  const handlePositionBChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPosB = e.target.value as Position;
    setPositionB(newPosB);
    onScenarioChange({
      positionA,
      positionB: newPosB,
      type: scenarioType
    });
  };

  const handleScenarioTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as ScenarioType;
    setScenarioType(newType);

    // Reset positions when switching scenario type
    let newPosA: Position;
    let newPosB: Position | undefined;

    if (newType === 'OPEN' && scenarios) {
      newPosA = scenarios.open[0] as Position;
      newPosB = undefined;
    } else if (newType === 'FACING_OPEN' && scenarios) {
      const defenders = Object.keys(scenarios.facingOpen) as Position[];
      newPosA = defenders[0];
      newPosB = scenarios.facingOpen[newPosA][0] as Position;
    } else {
      newPosA = positionA;
      newPosB = newType === 'FACING_OPEN' ? positionB : undefined;
    }

    setPositionA(newPosA);
    if (newPosB) setPositionB(newPosB);

    onScenarioChange({
      positionA: newPosA,
      positionB: newPosB,
      type: newType
    });
  };

  // Update local state when currentScenario changes externally
  React.useEffect(() => {
    if (currentScenario) {
      setPositionA(currentScenario.positionA);
      if (currentScenario.positionB) {
        setPositionB(currentScenario.positionB);
      }
      setScenarioType(currentScenario.type);
    }
  }, [currentScenario]);

  const availablePositionsA = getAvailablePositionsForA();
  const availablePositionsB = getAvailablePositionsForB();

  if (loading) {
    return (
      <div className="scenario-selector">
        <div style={{ color: '#888', fontSize: 14 }}>Loading scenarios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scenario-selector">
        <div style={{ color: '#D62728', fontSize: 14 }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="scenario-selector">
      <style>{`
        .scenario-selector {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .selector-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .selector-label {
          font-size: 11px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .selector-select {
          padding: 10px 12px;
          background: #2D2D2D;
          border: 1px solid #3D3D3D;
          border-radius: 6px;
          color: #E0E0E0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }

        .selector-select:hover {
          border-color: #4D4D4D;
          background-color: #383838;
        }

        .selector-select:focus {
          outline: none;
          border-color: #4A9EFF;
          box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1);
        }

        .selector-select option {
          background: #2D2D2D;
          color: #E0E0E0;
          padding: 8px;
        }

        .vs-label {
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #666;
          margin: 4px 0;
        }
      `}</style>

      <div className="selector-group">
        <label className="selector-label">Scenario Type</label>
        <select
          className="selector-select"
          value={scenarioType}
          onChange={handleScenarioTypeChange}
          disabled={!scenarios}
        >
          <option value="OPEN">Open Raising</option>
          <option value="FACING_OPEN">Facing Open</option>
        </select>
      </div>

      <div className="selector-group">
        <label className="selector-label">
          {scenarioType === 'OPEN' ? 'Your Position' : 'Defending Position'}
        </label>
        <select
          className="selector-select"
          value={positionA}
          onChange={handlePositionAChange}
          disabled={!scenarios}
        >
          {availablePositionsA.map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </div>

      {scenarioType === 'FACING_OPEN' && (
        <>
          <div className="vs-label">vs</div>
          <div className="selector-group">
            <label className="selector-label">Opponent Position</label>
            <select
              className="selector-select"
              value={positionB}
              onChange={handlePositionBChange}
              disabled={!scenarios}
            >
              {availablePositionsB.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
};
