import React, { useMemo, useState } from 'react';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

function handToRanks(hand: string): [string, string] {
  if (hand.length === 4) return [hand[0], hand[1]];
  if (hand.length === 3) {
    if (hand[1] === hand[0]) return [hand[0], hand[0]];
    return [hand[0], hand[1]];
  }
  return ['?', '?'];
}

const HAND_LABELS = [
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
  'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
  'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s',
  'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s',
  '98s', '97s', '96s', '95s', '94s', '93s', '92s',
  '87s', '86s', '85s', '84s', '83s', '82s',
  '76s', '75s', '74s', '73s', '72s',
  '65s', '64s', '63s', '62s',
  '54s', '53s', '52s',
  '43s', '42s',
  '32s',
  'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
  'KQo', 'KJo', 'KTo', 'K9o', 'K8o', 'K7o', 'K6o', 'K5o', 'K4o', 'K3o', 'K2o',
  'QJo', 'QTo', 'Q9o', 'Q8o', 'Q7o', 'Q6o', 'Q5o', 'Q4o', 'Q3o', 'Q2o',
  'JTo', 'J9o', 'J8o', 'J7o', 'J6o', 'J5o', 'J4o', 'J3o', 'J2o',
  'T9o', 'T8o', 'T7o', 'T6o', 'T5o', 'T4o', 'T3o', 'T2o',
  '98o', '97o', '96o', '95o', '94o', '93o', '92o',
  '87o', '86o', '85o', '84o', '83o', '82o',
  '76o', '75o', '74o', '73o', '72o',
  '65o', '64o', '63o', '62o',
  '54o', '53o', '52o',
  '43o', '42o',
  '32o'
];

function getHandIndex(hand: string): number {
  return HAND_LABELS.indexOf(hand);
}

function gridToHand(row: number, col: number): string {
  const rank1 = RANKS[row];
  const rank2 = RANKS[col];
  if (row === col) return rank1 + rank1;
  return row < col ? rank1 + rank2 + 's' : rank1 + rank2 + 'o';
}

interface HeatmapProps {
  matrix: number[][];
  actions: string[];
  selectedAction: number;
  onActionSelect: (index: number) => void;
  onHandHover?: (hand: string | null) => void;
}

export const Heatmap: React.FC<HeatmapProps> = ({
  matrix,
  actions,
  selectedAction,
  onActionSelect,
  onHandHover
}) => {
  const gridData = useMemo(() => {
    const grid: Array<Array<{ hand: string; frequencies: number[] }>> = [];
    for (let row = 0; row < 13; row++) {
      grid[row] = [];
      for (let col = 0; col < 13; col++) {
        const hand = gridToHand(row, col);
        const index = getHandIndex(hand);
        grid[row][col] = {
          hand,
          frequencies: matrix[index] || [0, 0, 0]
        };
      }
    }
    return grid;
  }, [matrix]);

  // Action color scheme: Call(green), Raise(red), Fold(blue)
  const getActionColor = (actionIndex: number): string => {
    const colors = ['#2A5CAA', '#2CA02C', '#D62728']; // Fold(blue), Call(green), Raise(red)
    return colors[actionIndex] || '#2A5CAA';
  };

  const getColorForFrequency = (frequency: number, actionIndex: number): string => {
    if (frequency === 0) return '#1E1E1E';
    const baseColor = getActionColor(actionIndex);
    const opacity = 0.3 + (frequency * 0.7);
    return baseColor; // Will use opacity in style
  };

  return (
    <div className="heatmap-container">
      <style>{`
        .heatmap-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #1E1E1E;
          border-radius: 8px;
          padding: 20px;
        }

        .action-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 16px;
          border-radius: 6px;
          overflow: hidden;
        }

        .action-tab {
          padding: 10px 24px;
          background: #2D2D2D;
          border: none;
          color: #B0B0B0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border-right: 1px solid #1E1E1E;
        }

        .action-tab:last-child {
          border-right: none;
        }

        .action-tab:hover {
          background: #383838;
        }

        .action-tab.active {
          color: white;
          font-weight: 600;
        }

        .action-tab.fold.active { background: #2A5CAA; }
        .action-tab.call.active { background: #2CA02C; }
        .action-tab.raise.active { background: #D62728; }

        .heatmap-grid {
          display: grid;
          grid-template-columns: 20px repeat(13, 1fr);
          grid-template-rows: 20px repeat(13, 1fr);
          gap: 2px;
        }

        .heatmap-cell {
          position: relative;
          aspect-ratio: 1;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.1s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid #2D2D2D;
        }

        .heatmap-cell:hover {
          transform: scale(1.1);
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          border-color: white;
        }

        .heatmap-label {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: #666;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .combo-count {
          margin-top: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          color: #888;
        }

        .combo-count strong {
          color: white;
        }
      `}</style>

      <div className="action-tabs">
        {actions.map((action, index) => {
          const actionClass = action.toLowerCase();
          return (
            <button
              key={action}
              className={`action-tab ${actionClass} ${selectedAction === index ? 'active' : ''}`}
              onClick={() => onActionSelect(index)}
            >
              {action.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div className="heatmap-grid">
        <div></div>
        {RANKS.map(rank => (
          <div key={`col-${rank}`} className="heatmap-label">{rank}</div>
        ))}

        {gridData.map((rowData, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            <div className="heatmap-label">{RANKS[rowIndex]}</div>
            {rowData.map((cell, colIndex) => {
              const frequency = cell.frequencies[selectedAction];
              const bgColor = getColorForFrequency(frequency, selectedAction);
              const showPercent = frequency > 0;

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="heatmap-cell"
                  style={{
                    backgroundColor: bgColor,
                    color: showPercent ? 'white' : '#444',
                    opacity: frequency === 0 ? 1 : 0.3 + (frequency * 0.7)
                  }}
                  onMouseEnter={() => onHandHover?.(cell.hand)}
                  onMouseLeave={() => onHandHover?.(null)}
                >
                  {showPercent && (frequency * 100).toFixed(0)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="combo-count">
        <strong>{gridData.flat().filter(c => c.frequencies[selectedAction] > 0).length}</strong> combos
      </div>
    </div>
  );
};
