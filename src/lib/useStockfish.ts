import { useEffect, useRef, useState } from "react";
import StockfishWorker from "stockfish.js/stockfish.js?worker";

export type Evaluation = {
  type: "cp" | "mate";
  value: number; // positive for side to move
  bestMove?: string;
  fen?: string;
};

export function useStockfish(fen: string, isGameOver: boolean, skillLevel: number = 20, elo?: number) {
  const workerRef = useRef<Worker | null>(null);
  const currentFenRef = useRef(fen);
  const [evaluation, setEvaluation] = useState<Evaluation>({ type: "cp", value: 0, fen });

  useEffect(() => {
    workerRef.current = new StockfishWorker();
    const worker = workerRef.current;

    worker.postMessage("uci");
    if (elo && elo > 0) {
      worker.postMessage("setoption name UCI_LimitStrength value true");
      worker.postMessage("setoption name UCI_Elo value " + elo);
    } else {
      worker.postMessage("setoption name UCI_LimitStrength value false");
      worker.postMessage("setoption name Skill Level value " + skillLevel);
    }
    worker.postMessage("isready");

    worker.onmessage = (e) => {
      const msg = e.data;
      if (typeof msg !== 'string') return;

      if (msg.startsWith("info depth") && msg.includes("score")) {
        const matchDepth = msg.match(/info depth (\d+)/);
        const depth = matchDepth ? parseInt(matchDepth[1], 10) : 0;
        
        // Skip intermediate depth updates to avoid chart flickering and UI performance issues.
        // We always keep depth 1, depth >= 14, or multiples of 4 to have smooth and snappy updates.
        if (depth > 1 && depth < 14 && depth % 4 !== 0) {
          return;
        }

        const matchCp = msg.match(/score cp (-?\d+)/);
        const matchMate = msg.match(/score mate (-?\d+)/);
        
        if (matchMate && matchMate[1]) {
           setEvaluation(prev => ({ 
             ...prev, 
             type: "mate", 
             value: parseInt(matchMate[1], 10), 
             fen: currentFenRef.current 
           }));
        } else if (matchCp && matchCp[1]) {
           setEvaluation(prev => ({ 
             ...prev, 
             type: "cp", 
             value: parseInt(matchCp[1], 10), 
             fen: currentFenRef.current 
           }));
        }
      }

      if (msg.startsWith("bestmove")) {
        const parts = msg.split(" ");
        if (parts[1]) {
          setEvaluation(prev => ({ 
            ...prev, 
            bestMove: parts[1], 
            fen: currentFenRef.current 
          }));
        }
      }
    };

    return () => {
      worker.postMessage("quit");
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (worker) {
      if (elo && elo > 0) {
        worker.postMessage("setoption name UCI_LimitStrength value true");
        worker.postMessage("setoption name UCI_Elo value " + elo);
      } else {
        worker.postMessage("setoption name UCI_LimitStrength value false");
        worker.postMessage("setoption name Skill Level value " + skillLevel);
      }
    }
  }, [skillLevel, elo]);

  useEffect(() => {
    currentFenRef.current = fen;
    const worker = workerRef.current;
    if (!worker || isGameOver) {
      if (worker && isGameOver) worker.postMessage("stop");
      return;
    }

    worker.postMessage("stop");
    setEvaluation({ type: "cp", value: 0, bestMove: undefined, fen }); // Reset with current FEN
    worker.postMessage(`position fen ${fen}`);
    // Search with depth 12 for maximum speed while maintaining high strength
    worker.postMessage("go depth 12"); 
  }, [fen, isGameOver]);

  return evaluation;
}
