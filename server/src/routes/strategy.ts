import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Valid positions and types
const VALID_POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const VALID_TYPES = ['OPEN', 'FACING_OPEN'];

// Hand labels (169 hands)
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

interface StrategyQuery {
  positionA: string;
  positionB?: string;
  type: string;
}

// GET /api/strategy
router.get('/', (req: Request<{}, {}, {}, StrategyQuery>, res: Response) => {
  const { positionA, positionB, type } = req.query;

  // Validate parameters
  if (!VALID_POSITIONS.includes(positionA)) {
    return res.status(400).json({
      error: 'Invalid parameters',
      details: `Invalid positionA: ${positionA}`
    });
  }

  if (type === 'FACING_OPEN' && (!positionB || !VALID_POSITIONS.includes(positionB))) {
    return res.status(400).json({
      error: 'Invalid parameters',
      details: `positionB is required for FACING_OPEN type`
    });
  }

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: 'Invalid parameters',
      details: `Invalid type: ${type}`
    });
  }

  // Build file path
  let filePath: string;
  if (type === 'OPEN') {
    filePath = path.join(__dirname, '../data/bts/open', `${positionA.toLowerCase()}.json`);
  } else {
    // positionB is guaranteed to be defined here due to validation above
    // For FACING_OPEN: positionA is defender facing raise from positionB
    // File naming: defender-vs-raiser (e.g., bb-vs-btn.json)
    filePath = path.join(__dirname, '../data/bts/facing-open', `${positionA.toLowerCase()}-vs-${positionB!.toLowerCase()}.json`);
  }

  // Try to load data file
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'Scenario not found',
      message: `No strategy data for positionA=${positionA}, positionB=${positionB || 'N/A'}, type=${type}`,
      availableScenarios: {
        open: ['BTN'],
        facingOpen: {
          BB: ['BTN', 'UTG']
        }
      }
    });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Build response
    const response = {
      scenario: data.scenario,
      strategy: {
        matrix: data.matrix,
        actions: ['fold', 'call', 'raise'],
        handLabels: HAND_LABELS
      },
      summary: calculateSummary(data.matrix)
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load strategy data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Calculate summary statistics
function calculateSummary(matrix: number[][]): {
  totalHands: number;
  foldRange: string;
  callRange: string;
  raiseRange: string;
} {
  const totalHands = matrix.length;
  let totalFold = 0;
  let totalCall = 0;
  let totalRaise = 0;

  for (const row of matrix) {
    totalFold += row[0];
    totalCall += row[1];
    totalRaise += row[2];
  }

  // Calculate percentages: average action frequency across all hands
  const foldPercent = (totalFold / totalHands) * 100;
  const callPercent = (totalCall / totalHands) * 100;
  const raisePercent = (totalRaise / totalHands) * 100;

  return {
    totalHands,
    foldRange: `${foldPercent.toFixed(1)}%`,
    callRange: `${callPercent.toFixed(1)}%`,
    raiseRange: `${raisePercent.toFixed(1)}%`
  };
}

export default router;
