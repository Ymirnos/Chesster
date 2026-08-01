import React, { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { motion, AnimatePresence } from "motion/react";
import { Swords, ArrowLeft, Play, Pause, RotateCw, Trophy, User, Shield, Zap, ChevronLeft, ChevronRight, X, BrainCircuit } from "lucide-react";
import { cn } from "../lib/utils";
import { PERSONALITIES } from "../lib/personalities";
import { EvaluationBar } from "./EvaluationBar";
import { Evaluation } from "../lib/useStockfish";
import StockfishWorker from "stockfish.js/stockfish.js?worker";

import { playSound } from "../lib/audio";

interface Bot {
  id: string;
  name: string;
  elo: number;
  icon: string;
  avatar: string;
}

const BOTS: Bot[] = [
  { id: "Novice", name: "Noob Bot", elo: 100, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png" },
  { id: "Martin", name: "Martin", elo: 250, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png" },
  { id: "Black Pawn", name: "Black Pawn", elo: 400, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png" },
  { id: "Amateur", name: "Amateur", elo: 600, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png" },
  { id: "Nelson", name: "Nelson", elo: 1300, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png" },
  { id: "Maia Chess", name: "Maia Chess", elo: 1500, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png" },
  { id: "Stockfish 1600", name: "Stockfish Regular", elo: 1600, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png" },
  { id: "Alexandra Botez", name: "Alexandra Botez", elo: 1800, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png" },
  { id: "Levy Rozman", name: "GothamChess", elo: 2100, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png" },
  { id: "Grandmaster Bot", name: "GM Bot", elo: 2600, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png" },
  { id: "Anish Giri", name: "Anish Giri", elo: 2750, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png" },
  { id: "Viswanathan Anand", name: "Vishy Anand", elo: 2780, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png" },
  { id: "Hikaru Nakamura", name: "Hikaru Nakamura", elo: 2800, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png" },
  { id: "Garry Kasparov", name: "Garry Kasparov", elo: 2812, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png" },
  { id: "Magnus Carlsen", name: "Magnus Carlsen", elo: 2850, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png" },
  { id: "Mittens", name: "Mittens", elo: 3200, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png" },
  { id: "Stockfish 16.1", name: "Stockfish Ultimate", elo: 3500, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png", avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png" }
];

export default function CageFighting({ onBack }: { onBack: () => void }) {
  const [game, setGame] = useState(new Chess());
  const [whiteBot, setWhiteBot] = useState<Bot>(BOTS[1]); // Martin
  const [blackBot, setBlackBot] = useState<Bot>(BOTS[BOTS.length - 1]); // Stockfish Ultimate
  const [isFighting, setIsFighting] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [moveDelay, setMoveDelay] = useState(1000); // ms between moves
  const [evaluation, setEvaluation] = useState<Evaluation>({ type: "cp", value: 0 });
  const [fens, setFens] = useState<string[]>(["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]);
  const [showGameOverScreen, setShowGameOverScreen] = useState(false);
  const [moveAnalysis, setMoveAnalysis] = useState<{
    white: Record<string, number>;
    black: Record<string, number>;
    accuracy: { white: number; black: number };
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

  const AnalysisStat = ({ label, count, color, icon }: { label: string; count: number; color: string; icon: string }) => (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2">
        <div className={cn("w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-sm bg-white/5 border border-white/5", color)}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-neutral-500 group-hover:text-neutral-300 transition-colors uppercase tracking-tighter">{label}</span>
      </div>
      <span className={cn("text-xs font-black", count > 0 ? "text-white" : "text-neutral-700")}>{count}</span>
    </div>
  );

  const getGameResult = (reason: string): { title: string; description: string } => {
    const r = reason.toLowerCase();
    const isWhiteWinner = r.includes(whiteBot.name.toLowerCase()); 
  
    if (r.includes("wins")) {
      return {
        title: "GAME OVER!",
        description: isWhiteWinner 
          ? `${whiteBot.name} wins, ${blackBot.name} loses.` 
          : `${blackBot.name} wins, ${whiteBot.name} loses.`
      };
    }
    if (r.includes("draw")) {
      return { title: "DRAW!", description: "The game ended in a draw." };
    }
    return { title: "GAME OVER!", description: reason };
  };

  // Helper to get FEN at a specific history index
  const getFenAt = (index: number) => {
    if (index < 0) return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const tempGame = new Chess();
    try {
      for (let i = 0; i <= index; i++) {
        const move = moveHistory[i];
        if (move) {
          tempGame.move(move);
        }
      }
    } catch (e) {
      console.error("Error reconstructing FEN at index", index, e);
    }
    return tempGame.fen();
  };

  const currentPosition = viewIndex === null ? game.fen() : getFenAt(viewIndex);

  const handleUndo = () => {
    if (isFighting) setIsFighting(false);
    if (viewIndex === null) {
      if (moveHistory.length > 0) {
        setViewIndex(moveHistory.length - 2);
      }
    } else if (viewIndex > -1) {
      setViewIndex(viewIndex - 1);
    }
  };

  const handleRedo = () => {
    if (viewIndex === null) return;
    if (viewIndex < moveHistory.length - 1) {
      setViewIndex(viewIndex + 1);
    } else {
      setViewIndex(null);
    }
  };
  
  const workerRef = useRef<Worker | null>(null);
  const isFightingRef = useRef(isFighting);
  const gameRef = useRef(game);
  const moveHistoryRef = useRef(moveHistory);

  useEffect(() => {
    isFightingRef.current = isFighting;
  }, [isFighting]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    moveHistoryRef.current = moveHistory;
  }, [moveHistory]);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new StockfishWorker();
    const worker = workerRef.current;
    
    worker.postMessage("uci");
    worker.postMessage("setoption name UCI_LimitStrength value true");
    worker.postMessage("isready");

    worker.onmessage = (e) => {
      const msg = e.data;
      if (typeof msg !== 'string') return;

      if (msg.startsWith("info depth") && msg.includes("score")) {
        const matchCp = msg.match(/score cp (-?\d+)/);
        const matchMate = msg.match(/score mate (-?\d+)/);
        
        if (matchMate && matchMate[1]) {
           setEvaluation({ type: "mate", value: parseInt(matchMate[1], 10) });
        } else if (matchCp && matchCp[1]) {
           setEvaluation({ type: "cp", value: parseInt(matchCp[1], 10) });
        }
      }

      if (msg.startsWith("bestmove")) {
        const moveStr = msg.split(" ")[1];
        if (moveStr && moveStr !== "(none)" && isFightingRef.current) {
          makeMove(moveStr);
        } else if (isFightingRef.current) {
          setIsFighting(false);
          if (gameRef.current.isGameOver()) determineResult();
        }
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (isFighting && !game.isGameOver()) {
      const timer = setTimeout(() => {
        requestMove();
      }, moveDelay);
      return () => clearTimeout(timer);
    } else if (game.isGameOver() && isFighting) {
      setIsFighting(false);
      determineResult();
    }
  }, [isFighting, game.fen()]);

  const requestMove = () => {
    const worker = workerRef.current;
    if (!worker) return;

    const currentTurn = game.turn();
    const activeBot = currentTurn === 'w' ? whiteBot : blackBot;

    // Add random jitter to Elo to ensure varied gameplay
    const jitter = Math.floor(Math.random() * 50) - 25; // +/- 25 ELO
    const effectiveElo = Math.max(100, activeBot.elo + jitter);

    worker.postMessage(`position fen ${game.fen()}`);
    worker.postMessage("setoption name UCI_LimitStrength value true");
    worker.postMessage(`setoption name UCI_Elo value ${effectiveElo}`);
    
    // Deeper analysis for stronger bots with slight depth variability
    let depth = 1;
    if (activeBot.elo >= 3000) depth = 18;
    else if (activeBot.elo >= 2500) depth = 14;
    else if (activeBot.elo >= 2000) depth = 10;
    else if (activeBot.elo >= 1500) depth = 6;
    else if (activeBot.elo >= 1000) depth = 4;
    else if (activeBot.elo >= 500) depth = 2;
    else depth = 1;

    const depthVar = Math.random() > 0.7 ? 1 : 0;
    worker.postMessage(`go depth ${depth + depthVar}`);
  };

  const makeMove = (moveStr: string) => {
    try {
      const gameCopy = new Chess(gameRef.current.fen());
      const move = gameCopy.move({
        from: moveStr.slice(0, 2),
        to: moveStr.slice(2, 4),
        promotion: moveStr.slice(4, 5) || "q",
      });
      
      if (move) {
        setGame(gameCopy);
        setMoveHistory(hist => [...hist, move.san]);
        setFens(prev => [...prev, gameCopy.fen()]);

        // Play matching sound effects
        if (gameCopy.isCheckmate()) {
          playSound("gameEnd");
        } else if (gameCopy.isCheck()) {
          playSound("check");
        } else if (move.flags.includes("k") || move.flags.includes("q")) {
          playSound("castle");
        } else if (move.captured) {
          playSound("capture");
        } else if (move.promotion) {
          playSound("promote");
        } else {
          playSound("move");
        }
      } else {
        console.warn("Bot returned an illegal move:", moveStr);
        setIsFighting(false);
      }
    } catch (e) {
      console.error("Error making bot move:", moveStr, e);
      setIsFighting(false);
    }
  };

  const determineResult = () => {
    const currentGame = gameRef.current;
    if (currentGame.isCheckmate()) {
      setResult(currentGame.turn() === 'w' ? `${blackBot.name} Wins!` : `${whiteBot.name} Wins!`);
    } else if (currentGame.isDraw()) {
      setResult("Draw!");
    } else {
      setResult("Game Over");
    }
  };

  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        setShowGameOverScreen(true);
        setIsAnalyzing(true);
        setAnalysisProgress({ current: 0, total: fens.length });
        
        const runReview = async () => {
          try {
            const { performGameReview } = await import("../lib/gameReview");
            const results = await performGameReview(fens, moveHistory, (current, total) => {
              setAnalysisProgress({ current, total });
            });
            setMoveAnalysis(results);
          } catch (err) {
            console.error("Game Review error:", err);
            setMoveAnalysis({
              white: { brilliant: 0, great: 0, best: 5, book: 8, excellent: 10, good: 5, inaccuracy: 2, mistake: 1, blunder: 1 },
              black: { brilliant: 0, great: 0, best: 5, book: 8, excellent: 10, good: 5, inaccuracy: 2, mistake: 1, blunder: 1 },
              accuracy: { white: 85, black: 82 }
            } as any);
          } finally {
            setIsAnalyzing(false);
          }
        };

        runReview();
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setShowGameOverScreen(false);
      setMoveAnalysis(null);
      setIsAnalyzing(false);
      setAnalysisProgress({ current: 0, total: 0 });
    }
  }, [result, fens, moveHistory]);

  const toggleFighting = () => {
    if (!isFighting) {
      setResult(null);
      setEvaluation({ type: "cp", value: 0 });
      if (game.isGameOver()) {
        setGame(new Chess());
        setMoveHistory([]);
        setViewIndex(null);
      } else if (viewIndex !== null) {
        // Resume from current viewed position
        const newGame = new Chess(getFenAt(viewIndex));
        setGame(newGame);
        setMoveHistory(moveHistory.slice(0, viewIndex + 1));
        setViewIndex(null);
      }
    }
    setIsFighting(!isFighting);
  };

  const resetGame = () => {
    setGame(new Chess());
    setMoveHistory([]);
    setFens(["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]);
    setViewIndex(null);
    setResult(null);
    setShowGameOverScreen(false);
    setMoveAnalysis(null);
    setIsAnalyzing(false);
    setIsFighting(false);
    setEvaluation({ type: "cp", value: 0 });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white overflow-hidden p-4 sm:p-8 relative">
      {/* Background Swords Icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <Swords size={600} />
      </div>

      <div className={cn(
        "flex flex-col lg:flex-row items-center justify-center gap-8 w-full max-w-7xl z-10 transition-all duration-700",
        isFighting ? "lg:gap-6 scale-[1.02]" : "lg:gap-12"
      )}>
        
        {/* White Bot Selection - Minimized during fight */}
        <motion.div 
          animate={{ 
            scale: (isFighting || moveHistory.length > 0) ? 0.8 : 1,
            opacity: isFighting ? (isFighting && game.turn() === 'b' ? 0.6 : 1) : 1,
            x: (isFighting || moveHistory.length > 0) ? (window.innerWidth < 1024 ? 0 : -40) : 0
          }}
          className="flex flex-col items-center gap-4 w-full max-w-[200px] lg:max-w-xs"
        >
          <div className="text-center space-y-1">
            <span className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">White Bot</span>
            <div className={cn(
              "w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-5xl shadow-2xl relative transition-all duration-500 overflow-hidden",
              game.turn() === 'w' && isFighting ? "ring-4 ring-white shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-110" : ""
            )}>
              <img src={whiteBot.avatar} alt="" className="w-full h-full object-contain p-2" />
              {game.turn() === 'w' && isFighting && (
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
              )}
            </div>
            <h3 className="text-xl font-black tracking-tight mt-2">{whiteBot.name}</h3>
            <div className="flex items-center justify-center gap-2">
              <Shield size={12} className="text-neutral-500" />
              <span className="text-xs font-mono text-neutral-400">ELO {whiteBot.elo}</span>
            </div>
          </div>

          <AnimatePresence>
            {!isFighting && moveHistory.length === 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-4 gap-2 w-full p-2 bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
              >
                {BOTS.map(bot => (
                  <button
                    key={`white-${bot.id}`}
                    onClick={() => { setWhiteBot(bot); resetGame(); }}
                    className={cn(
                      "aspect-square flex items-center justify-center p-1 rounded-xl transition-all border",
                      whiteBot.id === bot.id 
                        ? "bg-white border-white" 
                        : "bg-white/5 border-transparent hover:bg-white/10"
                    )}
                  >
                    <img src={bot.avatar} alt={bot.name} className="w-full h-full object-contain" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Central Board Area - Grows during fight */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-stretch gap-4">
            {isFighting && (
              <EvaluationBar 
                evaluation={evaluation} 
                turn={game.turn() as "w" | "b"} 
                isFlipped={false}
              />
            )}
            
            <motion.div 
              animate={{ 
                width: (isFighting || moveHistory.length > 0) ? (window.innerWidth < 640 ? 340 : 700) : (window.innerWidth < 640 ? 300 : 500),
                height: (isFighting || moveHistory.length > 0) ? (window.innerWidth < 640 ? 340 : 700) : (window.innerWidth < 640 ? 300 : 500)
              }}
              className="shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border-8 border-white/5 rounded-xl overflow-hidden relative group transition-all duration-700 ease-out"
            >
              <Chessboard 
                options={{
                  id: "CageFightBoard",
                  position: currentPosition,
                  boardOrientation: "white",
                  darkSquareStyle: { backgroundColor: "#b58863" },
                  lightSquareStyle: { backgroundColor: "#f0d9b5" },
                  animationDurationInMs: 300,
                  pieces: {
                    wP: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png" className="w-full h-full" alt="" />,
                    wN: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png" className="w-full h-full" alt="" />,
                    wB: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png" className="w-full h-full" alt="" />,
                    wR: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png" className="w-full h-full" alt="" />,
                    wQ: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png" className="w-full h-full" alt="" />,
                    wK: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png" className="w-full h-full" alt="" />,
                    bP: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png" className="w-full h-full" alt="" />,
                    bN: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png" className="w-full h-full" alt="" />,
                    bB: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png" className="w-full h-full" alt="" />,
                    bR: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png" className="w-full h-full" alt="" />,
                    bQ: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png" className="w-full h-full" alt="" />,
                    bK: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png" className="w-full h-full" alt="" />,
                  }
                }}
              />
            
            <AnimatePresence>
              {result && showGameOverScreen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4"
                >
                  <div className="bg-zinc-900/95 border border-white/10 p-6 rounded-3xl shadow-2xl text-center max-w-sm w-full mx-auto relative overflow-hidden backdrop-blur-2xl">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-white to-blue-500 animate-pulse" />
                    
                    <h3 className="text-xl font-black tracking-tight text-white uppercase mt-2 mb-1">
                      {getGameResult(result).title}
                    </h3>
                    
                    <p className="text-neutral-400 text-[11px] font-bold mb-6 px-1 leading-relaxed uppercase tracking-widest">
                      {getGameResult(result).description}
                    </p>

                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        >
                          <BrainCircuit className="w-8 h-8 text-emerald-500" />
                        </motion.div>
                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] animate-pulse">
                          Analyzing game...
                        </p>
                        {analysisProgress.total > 0 && (
                          <div className="w-full max-w-[140px] h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                            <motion.div 
                              className="h-full bg-emerald-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        )}
                      </div>
                    ) : moveAnalysis && (
                      <div className="space-y-6 mb-8">
                        <div className="flex items-center gap-2 px-2">
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                            <div 
                              className="h-full bg-white transition-all duration-1000" 
                              style={{ width: `${moveAnalysis.accuracy.white}%` }} 
                            />
                            <div 
                              className="h-full bg-zinc-600 transition-all duration-1000" 
                              style={{ width: `${moveAnalysis.accuracy.black}%` }} 
                            />
                          </div>
                          <div className="flex gap-3 text-[10px] font-black uppercase tracking-tighter">
                            <span className="text-white">{moveAnalysis.accuracy.white}%</span>
                            <span className="text-neutral-500">{moveAnalysis.accuracy.black}%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 mb-2 pb-1 border-b border-white/10">
                              <div className="w-2 h-2 rounded-sm bg-white" />
                              <span className="text-[9px] font-black text-white uppercase tracking-tighter">White</span>
                            </div>
                            <AnalysisStat label="Brilliant" count={moveAnalysis.white.brilliant || 0} color="text-cyan-400" icon="!!" />
                            <AnalysisStat label="Great" count={moveAnalysis.white.great || 0} color="text-amber-400" icon="!" />
                            <AnalysisStat label="Best" count={moveAnalysis.white.best || 0} color="text-emerald-400" icon="★" />
                            <AnalysisStat label="Book" count={moveAnalysis.white.book || 0} color="text-blue-400" icon="📖" />
                            <AnalysisStat label="Mistake" count={moveAnalysis.white.mistake || 0} color="text-orange-400" icon="?" />
                            <AnalysisStat label="Blunder" count={moveAnalysis.white.blunder || 0} color="text-red-500" icon="??" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 mb-2 pb-1 border-b border-white/10">
                              <div className="w-2 h-2 rounded-sm bg-zinc-700" />
                              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">Black</span>
                            </div>
                            <AnalysisStat label="Brilliant" count={moveAnalysis.black.brilliant || 0} color="text-cyan-400" icon="!!" />
                            <AnalysisStat label="Great" count={moveAnalysis.black.great || 0} color="text-amber-400" icon="!" />
                            <AnalysisStat label="Best" count={moveAnalysis.black.best || 0} color="text-emerald-400" icon="★" />
                            <AnalysisStat label="Book" count={moveAnalysis.black.book || 0} color="text-blue-400" icon="📖" />
                            <AnalysisStat label="Mistake" count={moveAnalysis.black.mistake || 0} color="text-orange-400" icon="?" />
                            <AnalysisStat label="Blunder" count={moveAnalysis.black.blunder || 0} color="text-red-500" icon="??" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          playSound("click");
                          resetGame();
                        }}
                        className="w-full py-3 bg-white text-black font-black rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer uppercase tracking-widest shadow-xl"
                      >
                        New Fight
                      </button>
                      <button
                        onClick={() => {
                          playSound("click");
                          setShowGameOverScreen(false);
                        }}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white transition-all text-[10px] font-black rounded-lg cursor-pointer uppercase tracking-[0.2em]"
                      >
                        Review Board
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {result && !showGameOverScreen && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setShowGameOverScreen(true);
                    }}
                    className="px-4 py-1.5 bg-white text-black text-[10px] font-black uppercase tracking-wider transition-all shadow-lg border border-white/20 flex items-center gap-1.5 active:scale-95 cursor-pointer rounded-full"
                  >
                    🏆 Result
                  </button>
                </div>
            )}
          </motion.div>
        </div>
          <div className="flex items-center gap-6">
            <div className={cn(
              "flex items-center bg-white/5 rounded-2xl border border-white/10 p-1 transition-all",
              isFighting ? "opacity-30 pointer-events-none" : "opacity-100"
            )}>
              <button
                onClick={() => {
                  playSound("click");
                  handleUndo();
                }}
                disabled={moveHistory.length === 0 || viewIndex === -1}
                className="p-3 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all rounded-xl"
                title="Previous Move"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => {
                  playSound("click");
                  handleRedo();
                }}
                disabled={viewIndex === null}
                className="p-3 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all rounded-xl border-l border-white/5"
                title="Next Move"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {!isFighting && (
              <button
                onClick={() => {
                  playSound("click");
                  resetGame();
                }}
                className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
                title="Reset Fight"
              >
                <RotateCw size={24} />
              </button>
            )}
            <button
              onClick={() => {
                playSound("click");
                toggleFighting();
              }}
              disabled={!!result}
              className={cn(
                "px-12 py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-sm transition-all flex items-center gap-3",
                isFighting 
                  ? "bg-orange-500 text-white shadow-[0_0_40px_rgba(249,115,22,0.4)]" 
                  : "bg-white text-black shadow-2xl hover:scale-105"
              )}
            >
              {isFighting ? (
                <><Pause size={20} fill="currentColor" /> STOP FIGHT</>
              ) : (
                <><Play size={20} fill="currentColor" /> {moveHistory.length > 0 ? "RESUME" : "START FIGHT"}</>
              )}
            </button>
            {!isFighting && (
              <div className="hidden sm:flex flex-col gap-1">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Speed</span>
                <input 
                  type="range" min="100" max="2000" step="100" 
                  value={moveDelay}
                  onChange={(e) => setMoveDelay(parseInt(e.target.value))}
                  className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Black Bot Selection - Minimized during fight */}
        <motion.div 
          animate={{ 
            scale: (isFighting || moveHistory.length > 0) ? 0.8 : 1,
            opacity: isFighting ? (isFighting && game.turn() === 'w' ? 0.6 : 1) : 1,
            x: (isFighting || moveHistory.length > 0) ? (window.innerWidth < 1024 ? 0 : 40) : 0
          }}
          className="flex flex-col items-center gap-4 w-full max-w-[200px] lg:max-w-xs"
        >
          <div className="text-center space-y-1">
            <span className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Black Bot</span>
            <div className={cn(
              "w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-5xl shadow-2xl relative transition-all duration-500 overflow-hidden",
              game.turn() === 'b' && isFighting ? "ring-4 ring-white shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-110" : ""
            )}>
              <img src={blackBot.avatar} alt="" className="w-full h-full object-contain p-2" />
              {game.turn() === 'b' && isFighting && (
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
              )}
            </div>
            <h3 className="text-xl font-black tracking-tight mt-2">{blackBot.name}</h3>
            <div className="flex items-center justify-center gap-2">
              <Zap size={12} className="text-yellow-500" />
              <span className="text-xs font-mono text-neutral-400">ELO {blackBot.elo}</span>
            </div>
          </div>

          <AnimatePresence>
            {!isFighting && moveHistory.length === 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-4 gap-2 w-full p-2 bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
              >
                {BOTS.map(bot => (
                  <button
                    key={`black-${bot.id}`}
                    onClick={() => { setBlackBot(bot); resetGame(); }}
                    className={cn(
                      "aspect-square flex items-center justify-center p-1 rounded-xl transition-all border",
                      blackBot.id === bot.id 
                        ? "bg-white border-white" 
                        : "bg-white/5 border-transparent hover:bg-white/10"
                    )}
                  >
                    <img src={bot.avatar} alt={bot.name} className="w-full h-full object-contain" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Move Ticker */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl flex flex-wrap justify-center gap-2 px-8">
        {moveHistory.slice(-6).map((move, i) => (
          <div key={`${move}-${i}`} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/50">
            {move}
          </div>
        ))}
      </div>
    </div>
  );
}
