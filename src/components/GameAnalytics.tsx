import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Evaluation } from '../lib/useStockfish';
import { Chess } from 'chess.js';

import { cn } from '../lib/utils';

interface GameAnalyticsProps {
  fen: string;
  evaluation: Evaluation;
  moveCount: number;
  theme?: "black" | "white";
}

export function GameAnalytics({ fen, evaluation, moveCount, theme = "black" }: GameAnalyticsProps) {
  const data = useMemo(() => {
    const game = new Chess(fen);
    
    // 1. Opening Complete Progress (0-100)
    // Starting home squares occupied by original piece setup: Rank 1 for White, Rank 8 for Black.
    const whiteHomeSquares = ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'];
    const blackHomeSquares = ['a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'];
    let homeRankOccupied = 0;
    whiteHomeSquares.forEach(sq => {
      if (game.get(sq as any)) homeRankOccupied++;
    });
    blackHomeSquares.forEach(sq => {
      if (game.get(sq as any)) homeRankOccupied++;
    });

    const openingVal = Math.max(0, Math.min(100, (homeRankOccupied / 16) * 100));

    // Calculate remaining active pieces setup
    const positionPart = fen.split(' ')[0];
    const pieceValues: Record<string, number> = {
      P: 1, N: 3, B: 3, R: 5, Q: 9,
      p: 1, n: 3, b: 3, r: 5, q: 9
    };

    let whiteMat = 0;
    let blackMat = 0;
    let nonPawnCount = 0;

    for (const char of positionPart) {
      if (pieceValues[char]) {
        if (char === char.toUpperCase()) {
          whiteMat += pieceValues[char];
        } else {
          blackMat += pieceValues[char];
        }
        if (char.toLowerCase() !== 'p') {
          nonPawnCount++;
        }
      }
    }

    // 2. Midgrid phase intensity
    // 0 at move 0. Rises as opening develops. Decreases as pieces are captured.
    const developmentProgress = 100 - openingVal;
    const pieceFactor = Math.max(0, Math.min(100, (nonPawnCount - 4) / 10 * 100)); // 0 when <= 4 pieces, 100 when >= 14 pieces
    const midGameVal = moveCount === 0 ? 0 : Math.min(100, Math.max(0, (developmentProgress * pieceFactor) / 100));

    // 3. Endgame stage completeness
    const endGameVal = moveCount === 0 ? 0 : Math.max(0, Math.min(100, (12 - nonPawnCount) / 10 * 100));

    // 4. Center Control: 100% mathematical center checks
    let whiteCenterPoints = 0;
    let blackCenterPoints = 0;

    // Direct Occupancy in absolute center squares d4, e4, d5, e5
    const centerSquaresList = ['d4', 'e4', 'd5', 'e5'];
    centerSquaresList.forEach(sq => {
      const p = game.get(sq as any);
      if (p) {
        const val = p.type === 'p' ? 25 : p.type === 'n' || p.type === 'b' ? 20 : 12;
        if (p.color === 'w') whiteCenterPoints += val;
        else blackCenterPoints += val;
      }
    });

    // Control by Knight placement targeting/guarding the center
    const wKnights = ['c3', 'f3', 'd2', 'e2'];
    wKnights.forEach(sq => {
      const p = game.get(sq as any);
      if (p && p.type === 'n' && p.color === 'w') whiteCenterPoints += 15;
    });
    const bKnights = ['c6', 'f6', 'd7', 'e7'];
    bKnights.forEach(sq => {
      const p = game.get(sq as any);
      if (p && p.type === 'n' && p.color === 'b') blackCenterPoints += 15;
    });

    // Control by Bishop placement targeting center
    const wBishops = ['b2', 'g2', 'c4', 'f4', 'd3', 'e3'];
    wBishops.forEach(sq => {
      const p = game.get(sq as any);
      if (p && p.type === 'b' && p.color === 'w') whiteCenterPoints += 10;
    });
    const bBishops = ['b7', 'g7', 'c5', 'f5', 'd6', 'e6'];
    bBishops.forEach(sq => {
      const p = game.get(sq as any);
      if (p && p.type === 'b' && p.color === 'b') blackCenterPoints += 10;
    });

    const diffCenter = whiteCenterPoints - blackCenterPoints;
    const centerVal = moveCount === 0 ? 0 : Math.max(10, Math.min(100, 50 + diffCenter * 1.5));

    // 5. Material Superiority
    const materialDiff = whiteMat - blackMat;
    const materialVal = moveCount === 0 ? 50 : Math.max(5, Math.min(95, 50 + materialDiff * 6));

    // 6. Positional Superiority
    let posVal = 50;
    if (moveCount > 0) {
      let evalNum = Number(evaluation.value);
      if (game.turn() === "b") {
        evalNum = -evalNum;
      }
      if (evaluation.type === 'mate') {
        posVal = evalNum > 0 ? 100 : 0;
      } else {
        posVal = 50 + (evalNum / 10); // Standard mapping mapping +/- 500 cp to full bounds
        posVal = Math.max(5, Math.min(95, posVal));
      }
    }

    if (moveCount === 0) {
      return [
        { subject: 'Opening', A: 0, fullMark: 100 },
        { subject: 'Mid Game', A: 0, fullMark: 100 },
        { subject: 'End Game', A: 0, fullMark: 100 },
        { subject: 'Material Balance', A: 0, fullMark: 100 },
        { subject: 'Center Control', A: 0, fullMark: 100 },
        { subject: 'Positional Advantage', A: 0, fullMark: 100 },
      ];
    }

    return [
      { subject: 'Opening', A: openingVal, fullMark: 100 },
      { subject: 'Mid Game', A: midGameVal, fullMark: 100 },
      { subject: 'End Game', A: endGameVal, fullMark: 100 },
      { subject: 'Material Balance', A: materialVal, fullMark: 100 },
      { subject: 'Center Control', A: centerVal, fullMark: 100 },
      { subject: 'Positional Advantage', A: posVal, fullMark: 100 },
    ];
  }, [fen, evaluation, moveCount]);

  return (
    <div className={cn(
      "backdrop-blur-xl rounded-lg border shadow-2xl p-3 mt-1 overflow-hidden relative min-h-[285px] max-h-[305px]",
      theme === "black" ? "bg-black/40 border-white/10" : "bg-white border-black/10 shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
    )}>
      {/* Spider background effect - slightly shifted */}
      <div className={cn(
        "absolute inset-0 p-4 opacity-[0.02] pointer-events-none flex items-center justify-center",
        theme === "black" ? "text-white" : "text-black"
      )}>
        <svg width="220" height="220" viewBox="0 0 100 100" className="currentColor">
          <circle cx="50" cy="50" r="2" fill="currentColor" />
          {/* Spider Legs */}
          <path d="M50 50 Q 30 20 10 10" stroke="currentColor" fill="none" strokeWidth="0.5" />
          <path d="M50 50 Q 70 20 90 10" stroke="currentColor" fill="none" strokeWidth="0.5" />
          <path d="M50 50 Q 20 40 5 45" stroke="currentColor" fill="none" strokeWidth="0.5" />
          <path d="M50 50 Q 80 40 95 45" stroke="currentColor" fill="none" strokeWidth="0.5" />
          <path d="M50 50 Q 20 60 5 55" stroke="currentColor" fill="none" strokeWidth="0.5" />
          <path d="M50 50 Q 80 60 95 55" stroke="currentColor" fill="none" strokeWidth="0.5" />
          <path d="M50 50 Q 30 80 10 90" stroke="currentColor" fill="none" strokeWidth="0.5" />
          <path d="M50 50 Q 70 80 90 90" stroke="currentColor" fill="none" strokeWidth="0.5" />
        </svg>
      </div>

      <div className={cn(
        "text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5 leading-none shrink-0",
        theme === "black" ? "text-gray-400" : "text-gray-500"
      )}>
        <span className={cn(
          "w-1.5 h-1.5 rounded-full animate-pulse",
          theme === "black" ? "bg-white" : "bg-black"
        )}></span>
        Live Analysis Metrics (Radar Chart)
      </div>

      <div className="h-[240px] w-full flex items-center justify-center min-h-0 shrink">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke={theme === "black" ? "#444" : "#ddd"} />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: theme === "black" ? "#9ca3af" : "#6b7280", fontSize: 8, fontWeight: 'medium' }}
            />
            <Radar
              name="Game"
              dataKey="A"
              stroke={theme === "black" ? "#ffffff" : "#000000"}
              fill={theme === "black" ? "#ffffff" : "#000000"}
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
