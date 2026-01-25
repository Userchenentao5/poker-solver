import React from 'react';

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

const POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  onScenarioChange,
  currentScenario
}) => {
  const [positionA, setPositionA] = React.useState<Position>(
    currentScenario?.positionA || 'BTN'
  );
  const [positionB, setPositionB] = React.useState<Position>(
    currentScenario?.positionB || 'BB'
  );
  const [scenarioType, setScenarioType] = React.useState<ScenarioType>(
    currentScenario?.type || 'OPEN'
  );

  const handlePositionAChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPosA = e.target.value as Position;
    setPositionA(newPosA);
    onScenarioChange({
      positionA: newPosA,
      positionB: scenarioType === 'FACING_OPEN' ? positionB : undefined,
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
    onScenarioChange({
      positionA,
      positionB: newType === 'FACING_OPEN' ? positionB : undefined,
      type: newType
    });
  };

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

        .position-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-top: 8px;
        }

        .position-button {
          padding: 8px;
          background: #2D2D2D;
          border: 1px solid #3D3D3D;
          border-radius: 6px;
          color: #B0B0B0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }

        .position-button:hover {
          background: #383838;
          border-color: #4D4D4D;
          color: white;
        }

        .position-button.active {
          background: #4A9EFF;
          border-color: #4A9EFF;
          color: white;
        }
      `}</style>

      <div className="selector-group">
        <label className="selector-label">Scenario Type</label>
        <select className="selector-select" value={scenarioType} onChange={handleScenarioTypeChange}>
          <option value="OPEN">Open Raising</option>
          <option value="FACING_OPEN">Facing Open</option>
        </select>
      </div>

      <div className="selector-group">
        <label className="selector-label">Your Position</label>
        <select className="selector-select" value={positionA} onChange={handlePositionAChange}>
          {POSITIONS.map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </div>

      {scenarioType === 'FACING_OPEN' && (
        <>
          <div className="vs-label">vs</div>
          <div className="selector-group">
            <label className="selector-label">Opponent Position</label>
            <select className="selector-select" value={positionB} onChange={handlePositionBChange}>
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
};
