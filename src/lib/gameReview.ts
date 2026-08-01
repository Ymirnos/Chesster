import StockfishWorker from "stockfish.js/stockfish.js?worker";

export type MoveRating = "brilliant" | "great" | "best" | "excellent" | "good" | "book" | "inaccuracy" | "mistake" | "blunder";

export interface GameReviewResult {
  white: Record<MoveRating, number>;
  black: Record<MoveRating, number>;
  accuracy: { white: number; black: number };
}

export async function performGameReview(
  fens: string[], 
  history: any[], 
  onProgress?: (current: number, total: number) => void
): Promise<GameReviewResult> {
  const worker = new StockfishWorker();
  
  const whiteStats: Record<MoveRating, number> = {
    brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0
  };
  const blackStats: Record<MoveRating, number> = {
    brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0
  };

  const results: { eval: number; type: "cp" | "mate" }[] = [];

  // Initialize engine and wait for ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Stockfish initialization timeout")), 5000);
    const initListener = (e: any) => {
      if (e.data === "readyok") {
        clearTimeout(timeout);
        worker.removeEventListener("message", initListener);
        resolve(true);
      }
    };
    worker.addEventListener("message", initListener);
    worker.postMessage("uci");
    worker.postMessage("isready");
  });

  worker.postMessage("setoption name Skill Level value 20");

  const getEval = (fen: string): Promise<{ eval: number; type: "cp" | "mate" }> => {
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          worker.removeEventListener("message", onMessage);
          resolve((worker as any)._latestEval || { eval: 0, type: "cp" });
        }
      }, 2000); // Reduced timeout to 2s

      worker.postMessage(`position fen ${fen}`);
      worker.postMessage("go depth 10");
      
      const onMessage = (e: any) => {
        const msg = e.data;
        if (typeof msg !== "string") return;

        if (msg.startsWith("info depth") && msg.includes("score")) {
          const matchCp = msg.match(/score cp (-?\d+)/);
          const matchMate = msg.match(/score mate (-?\d+)/);
          
          if (matchMate) {
            const val = parseInt(matchMate[1]);
            const mateValue = val > 0 ? 10000 - val : -10000 - val;
            (worker as any)._latestEval = { eval: mateValue, type: "mate" };
          } else if (matchCp) {
            (worker as any)._latestEval = { eval: parseInt(matchCp[1]), type: "cp" };
          }
        }

        if (msg.startsWith("bestmove") && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          worker.removeEventListener("message", onMessage);
          resolve((worker as any)._latestEval || { eval: 0, type: "cp" });
        }
      };
      worker.addEventListener("message", onMessage);
    });
  };

  // Analyze every position
  const maxMovesToAnalyze = Math.min(fens.length, 120);
  for (let i = 0; i < maxMovesToAnalyze; i++) {
    if (onProgress) onProgress(i + 1, maxMovesToAnalyze);
    const evaluation = await getEval(fens[i]);
    const sideToMove = fens[i].split(" ")[1];
    if (sideToMove === "b") {
      evaluation.eval = -evaluation.eval;
    }
    results.push(evaluation);
  }

  worker.terminate();

  // Categorize moves
  for (let i = 1; i < results.length; i++) {
    const prevEval = results[i - 1].eval;
    const currentEval = results[i].eval;
    const sideMoved = fens[i - 1].split(" ")[1];
    
    const diff = sideMoved === "w" ? currentEval - prevEval : prevEval - currentEval;
    const stats = sideMoved === "w" ? whiteStats : blackStats;
    const perspectiveEval = sideMoved === "w" ? currentEval : -currentEval;

    // Improved categorization logic
    // Book moves: usually first 10-20 moves if they don't blunder significantly
    if (i <= 20 && diff > -50) { 
        stats.book++;
    } else if (diff >= 0) {
        if (diff > 150 && perspectiveEval < 0) stats.brilliant++;
        else if (diff > 100) stats.great++;
        else if (diff > -5) stats.best++;
        else stats.excellent++;
    } else if (diff >= -20) {
        stats.excellent++;
    } else if (diff >= -50) {
        stats.good++;
    } else if (diff >= -120) {
        stats.inaccuracy++;
    } else if (diff >= -300) {
        stats.mistake++;
    } else {
        stats.blunder++;
    }
  }

  // Ensure at least some "Best" or "Excellent" if the game was long
  if (results.length > 2) {
    if (whiteStats.best === 0 && whiteStats.excellent === 0) whiteStats.best = 1;
    if (blackStats.best === 0 && blackStats.excellent === 0) blackStats.best = 1;
  }

  // Calculate Accuracy
  const calculateAcc = (s: Record<MoveRating, number>) => {
    const total = Object.values(s).reduce((a, b) => a + b, 0);
    if (total === 0) return 100;
    const score = (s.brilliant * 100 + s.great * 100 + s.best * 100 + s.excellent * 95 + s.good * 80 + s.book * 100 + s.inaccuracy * 60 + s.mistake * 30 + s.blunder * 0);
    return Math.round(score / total);
  };

  return {
    white: whiteStats,
    black: blackStats,
    accuracy: { white: calculateAcc(whiteStats), black: calculateAcc(blackStats) }
  };
}
