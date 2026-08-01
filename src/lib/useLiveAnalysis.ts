import { useEffect, useRef, useState } from "react";
import StockfishWorker from "stockfish.js/stockfish.js?worker";
import { Move } from "chess.js";

export type MoveClassification = "brilliant" | "great" | "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder" | "book" | "forced" | null;

export type AnalysisResult = {
  scoreCp?: number;
  mate?: number;
  bestMove?: string;
  depth: number;
};

export function useLiveAnalysis(fens: string[], history: Move[]) {
  const workerRef = useRef<Worker | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, AnalysisResult>>({});
  const [classifications, setClassifications] = useState<Record<number, MoveClassification>>({});
  
  // Track queue
  const analyzingFenRef = useRef<string | null>(null);

  useEffect(() => {
    workerRef.current = new StockfishWorker();
    const worker = workerRef.current;
    worker.postMessage("uci");
    return () => {
      worker.postMessage("quit");
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;

    // Analyze the most recent position
    const latestFen = fens[fens.length - 1];
    if (!latestFen) return;

    if (analyzingFenRef.current !== latestFen && (!evaluations[latestFen] || evaluations[latestFen].depth < 14)) {
      analyzingFenRef.current = latestFen;
      worker.postMessage("stop");
      worker.postMessage(`position fen ${latestFen}`);
      worker.postMessage("go depth 14");
    }

    worker.onmessage = (e) => {
      const msg = e.data;
      if (typeof msg === "string") {
        if (msg.startsWith("info depth") && msg.includes("score")) {
           const matchDepth = msg.match(/depth (\d+)/);
           const matchCp = msg.match(/score cp (-?\d+)/);
           const matchMate = msg.match(/score mate (-?\d+)/);
           
           if (!analyzingFenRef.current) return;
           
           const fenSplit = analyzingFenRef.current.split(" ");
           const isWhiteTurn = fenSplit[1] === "w";
           const depth = matchDepth ? parseInt(matchDepth[1], 10) : 0;
           
           let scoreCp = undefined;
           let mate = undefined;
           
           if (matchMate && matchMate[1]) {
             const m = parseInt(matchMate[1], 10);
             mate = isWhiteTurn ? m : -m;
           } else if (matchCp && matchCp[1]) {
             const cp = parseInt(matchCp[1], 10);
             scoreCp = isWhiteTurn ? cp : -cp;
           }
           
           setEvaluations(prev => ({
             ...prev,
             [analyzingFenRef.current!]: {
                ...prev[analyzingFenRef.current!],
                scoreCp: scoreCp !== undefined ? scoreCp : prev[analyzingFenRef.current!]?.scoreCp,
                mate: mate !== undefined ? mate : prev[analyzingFenRef.current!]?.mate,
                depth
             }
           }));
        } else if (msg.startsWith("bestmove")) {
           const match = msg.match(/bestmove\s+(\S+)/);
           if (match && match[1] && analyzingFenRef.current) {
             setEvaluations(prev => ({
               ...prev,
               [analyzingFenRef.current!]: {
                  ...prev[analyzingFenRef.current!],
                  bestMove: match[1]
               }
             }));
           }
           analyzingFenRef.current = null;
        }
      }
    };
  }, [fens]);

  // Classify move based on evaluation differences
  useEffect(() => {
    if (fens.length < 2 || history.length === 0) return;
    
    // Check classification for the latest move
    const moveIndex = history.length - 1;
    if (classifications[moveIndex]) return; // Already classified
    
    const prevFen = fens[fens.length - 2];
    const currFen = fens[fens.length - 1];
    const prevEval = evaluations[prevFen];
    const currEval = evaluations[currFen];
    
    // We only classify if we have reached decent depth for both, or at least currEval
    if (prevEval && currEval) {
       const isWhiteMove = history[moveIndex].color === "w";
       const prevCp = prevEval.mate !== undefined ? (prevEval.mate > 0 ? 10000 : -10000) : (prevEval.scoreCp || 0);
       const currCp = currEval.mate !== undefined ? (currEval.mate > 0 ? 10000 : -10000) : (currEval.scoreCp || 0);
       
       const diff = isWhiteMove ? (currCp - prevCp) : (prevCp - currCp);
       
       let c: MoveClassification = "good";
       
       // Simplistic classification
       if (moveIndex < 4) c = "book";
       else if (diff < -300) c = "blunder";
       else if (diff < -100) c = "mistake";
       else if (diff < -30) c = "inaccuracy";
       else if (diff > 50) c = "great"; // Positive swing!
       else {
         // Check if it was matching best move
         const prevBest = prevEval.bestMove;
         const playedUci = history[moveIndex].from + history[moveIndex].to + (history[moveIndex].promotion || "");
         if (prevBest === playedUci) {
           c = "best";
         } else if (diff >= -10) {
           c = "excellent";
         }
       }
       
       setClassifications(prev => ({ ...prev, [moveIndex]: c }));
    }
  }, [evaluations, fens, history]);

  return { evaluations, classifications };
}
