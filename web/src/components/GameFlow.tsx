import React, { useState } from 'react';
import { ScenarioSelector } from '../components/ScenarioSelector';
import type { Scenario } from '../components/ScenarioSelector';
import { useBTSStrategy } from '../hooks/useBTSStrategy';
import { Heatmap } from './Heatmap';

export const GameFlow: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>({
    positionA: 'UTG',
    positionB: 'BB',
    type: 'OPEN'
  });
  const [selectedAction, setSelectedAction] = useState(0);
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);

  const { strategy, loading, error } = useBTSStrategy(scenario);

  // Get hand details for sidebar
  const getHandDetails = () => {
    if (!strategy || !hoveredHand) return null;

    const handIndex = strategy.strategy.handLabels.indexOf(hoveredHand);
    if (handIndex === -1) return null;

    const frequencies = strategy.strategy.matrix[handIndex];
    return {
      hand: hoveredHand,
      actions: strategy.strategy.actions.map((action, i) => ({
        name: action,
        frequency: frequencies[i]
      }))
    };
  };

  const handDetails = getHandDetails();

  // Calculate overall stats
  const getOverallStats = () => {
    if (!strategy) return null;

    const totalHands = strategy.summary.totalHands;
    const actions = strategy.strategy.actions;

    const stats = actions.map((action, actionIndex) => {
      let comboCount = 0;
      strategy.strategy.matrix.forEach(row => {
        if (row[actionIndex] > 0) comboCount++;
      });

      // Parse percentage from summary
      const rangeKey = `${action.toLowerCase()}Range` as keyof typeof strategy.summary;
      const percentage = strategy.summary[rangeKey];

      return {
        name: action,
        comboCount,
        percentage
      };
    });

    return { totalHands, stats };
  };

  const overallStats = getOverallStats();

  // Get action color: Call(green), Raise(red), Fold(blue)
  const getActionColor = (actionName: string): string => {
    const colors: Record<string, string> = {
      'fold': '#2A5CAA',
      'call': '#2CA02C',
      'raise': '#D62728'
    };
    return colors[actionName.toLowerCase()] || '#2A5CAA';
  };

  return (
    <div className="gto-wizard-layout">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #121212;
          color: #E0E0E0;
        }

        .gto-wizard-layout {
          min-height: 100vh;
          background: #121212;
        }

        .header {
          background: #1E1E1E;
          border-bottom: 1px solid #2D2D2D;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          font-size: 20px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.5px;
        }

        .logo span {
          color: #4A9EFF;
        }

        .nav-tabs {
          display: flex;
          gap: 4px;
        }

        .nav-tab {
          padding: 8px 20px;
          background: transparent;
          border: none;
          color: #888;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .nav-tab:hover {
          background: #2D2D2D;
          color: #B0B0B0;
        }

        .nav-tab.active {
          background: #2D2D2D;
          color: white;
        }

        .main-content {
          display: flex;
          height: calc(100vh - 61px);
        }

        .left-panel {
          width: 280px;
          background: #1A1A1A;
          border-right: 1px solid #2D2D2D;
          padding: 20px;
          overflow-y: auto;
        }

        .panel-title {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }

        .position-display {
          background: #2D2D2D;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .position-label {
          font-size: 11px;
          color: #888;
          margin-bottom: 4px;
        }

        .position-value {
          font-size: 24px;
          font-weight: 700;
          color: white;
        }

        .center-panel {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .right-panel {
          width: 280px;
          background: #1A1A1A;
          border-left: 1px solid #2D2D2D;
          padding: 20px;
          overflow-y: auto;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #2D2D2D;
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .stat-action {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stat-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .stat-name {
          font-size: 14px;
          font-weight: 500;
          color: #B0B0B0;
        }

        .stat-values {
          text-align: right;
        }

        .stat-percent {
          font-size: 18px;
          font-weight: 700;
          color: white;
        }

        .stat-combos {
          font-size: 12px;
          color: #666;
        }

        .hand-detail-section {
          background: #2D2D2D;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .hand-detail-title {
          font-size: 16px;
          font-weight: 700;
          color: white;
          margin-bottom: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .detail-percent {
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .loading-state,
        .error-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 16px;
          color: #888;
        }

        .error-state {
          color: #D62728;
        }
      `}</style>

      <div className="header">
        <div className="logo">BTS <span>Wizard</span></div>
        <div className="nav-tabs">
          <button className="nav-tab active">Study</button>
          <button className="nav-tab">Practice</button>
          <button className="nav-tab">Analyze</button>
        </div>
      </div>

      <div className="main-content">
        {/* Left Panel - Scenario Selection */}
        <div className="left-panel">
          <div className="panel-title">Scenario</div>
          <ScenarioSelector
            onScenarioChange={setScenario}
            currentScenario={scenario}
          />

          <div className="position-display">
            <div className="position-label">Position</div>
            <div className="position-value">{scenario.positionA}</div>
            {scenario.type === 'FACING_OPEN' && (
              <>
                <div className="position-label" style={{ marginTop: 12 }}>vs</div>
                <div className="position-value">{scenario.positionB}</div>
              </>
            )}
          </div>

          {overallStats && (
            <>
              <div className="panel-title" style={{ marginTop: 24 }}>Total Range</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'white' }}>
                {overallStats.totalHands}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>combos</div>
            </>
          )}
        </div>

        {/* Center Panel - Heatmap */}
        <div className="center-panel">
          {loading && (
            <div className="loading-state">Loading strategy data...</div>
          )}

          {error && (
            <div className="error-state">Error: {error}</div>
          )}

          {strategy && (
            <Heatmap
              matrix={strategy.strategy.matrix}
              actions={strategy.strategy.actions}
              selectedAction={selectedAction}
              onActionSelect={setSelectedAction}
              onHandHover={setHoveredHand}
            />
          )}
        </div>

        {/* Right Panel - Hand Details & Stats */}
        <div className="right-panel">
          {handDetails ? (
            <>
              <div className="panel-title">Hand Details</div>
              <div className="hand-detail-section">
                <div className="hand-detail-title">{handDetails.hand}</div>
                {handDetails.actions.map((action) => {
                  const percent = (action.frequency * 100).toFixed(1);
                  return (
                    <div key={action.name} className="detail-row">
                      <span className="stat-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="stat-dot" style={{ background: getActionColor(action.name) }}></span>
                        {action.name.toUpperCase()}
                      </span>
                      <span className="detail-percent" style={{ color: getActionColor(action.name) }}>
                        {percent === '0.0' ? '-' : percent + '%'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="panel-title">Strategy Overview</div>
              <div className="hand-detail-section">
                <div className="hand-detail-title">Actions</div>
                {overallStats?.stats.map((stat) => (
                  <div key={stat.name} className="detail-row">
                    <span className="stat-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="stat-dot" style={{ background: getActionColor(stat.name) }}></span>
                      {stat.name.toUpperCase()}
                    </span>
                    <span className="detail-percent" style={{ color: getActionColor(stat.name) }}>
                      {stat.percentage}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {overallStats && (
            <>
              <div className="panel-title" style={{ marginTop: 24 }}>Action Breakdown</div>
              {overallStats.stats.map((stat) => (
                <div key={stat.name} className="stat-row">
                  <div className="stat-action">
                    <span className="stat-dot" style={{ background: getActionColor(stat.name) }}></span>
                    <span className="stat-name">{stat.name.toUpperCase()}</span>
                  </div>
                  <div className="stat-values">
                    <div className="stat-percent" style={{ color: getActionColor(stat.name) }}>
                      {stat.percentage}
                    </div>
                    <div className="stat-combos">{stat.comboCount} combos</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
