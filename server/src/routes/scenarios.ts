import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// GET /api/scenarios
router.get('/', (_req: Request, res: Response) => {
  // For MVP, return hardcoded scenarios
  const scenarios = {
    open: ['BTN'],
    facingOpen: {
      BB: ['BTN', 'UTG']
    }
  };

  res.json(scenarios);
});

export default router;
