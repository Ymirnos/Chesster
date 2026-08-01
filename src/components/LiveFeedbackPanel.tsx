import React, { useState, useEffect, useRef } from "react";
import { Move } from "chess.js";
import { Evaluation } from "../lib/useStockfish";
import { 
  Sparkles, 
  Star, 
  CheckCircle2, 
  Check, 
  BookOpen, 
  AlertTriangle, 
  AlertCircle, 
  XCircle, 
  HelpCircle,
  Loader2,
  Lock,
  ChevronRight,
  ShieldAlert,
  GraduationCap,
  WifiOff,
  Flower
} from "lucide-react";

import staticOpenings from "../db/openings.json";

import { cn } from "../lib/utils";

interface LiveFeedbackPanelProps {
  history: Move[];
  viewIndex: number; // current visible ply index (0 to history.length)
  fens: string[]; // FEN strings of all plies
  evaluation: Evaluation; // current active FEN evaluation
  isGameOver: boolean;
  opening?: { eco: string; name: string } | null;
  theme?: "black" | "white";
}

interface CoachFeedback {
  classification: string;
  commentary: string;
  engine_suggestion: string;
  threat_detection: string;
}

export function LiveFeedbackPanel({ history, viewIndex, fens, evaluation, isGameOver, opening, theme = "black" }: LiveFeedbackPanelProps) {
  // Caches for positions and feedback responses
  const [positionEvals, setPositionEvals] = useState<Record<string, Evaluation>>({});
  const [cachedFeedback, setCachedFeedback] = useState<Record<number, CoachFeedback>>({});
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Analysis paused state
  const [isPaused, setIsPaused] = useState(() => {
    return localStorage.getItem("chess_analysis_paused") === "true";
  });

  const currentFen = fens[viewIndex];

  // Helper to determine if a move was a Book Move
  const checkIsBookMove = (): boolean => {
    if (viewIndex === 0) return false;

    // 1. Check against static openings database
    const uciList = history.slice(0, viewIndex).map(m => m.from + m.to + (m.promotion || ""));
    const matchesStatic = staticOpenings.some((op: any) => {
      if (!op.moves_uci || op.moves_uci.length < uciList.length) return false;
      for (let i = 0; i < uciList.length; i++) {
        const opMove = op.moves_uci[i].replace("=", "");
        const myMove = uciList[i];
        if (opMove !== myMove) return false;
      }
      return true;
    });

    if (matchesStatic) return true;

    // 2. Online opening tag check
    if (opening && viewIndex <= 24) {
      return true;
    }

    return false;
  };

  // 1. Live Cache: Map FEN evaluations securely
  useEffect(() => {
    if (currentFen && evaluation && evaluation.value !== undefined && evaluation.fen === currentFen) {
      setPositionEvals(prev => {
        if (prev[currentFen]?.value === evaluation.value && prev[currentFen]?.bestMove === evaluation.bestMove) {
          return prev;
        }
        return {
          ...prev,
          [currentFen]: evaluation
        };
      });
    }
  }, [currentFen, evaluation]);

  // 2. Fetch Live Feedback on move change
  useEffect(() => {
    if (viewIndex === 0) return; // No moves played yet
    if (isPaused) {
      setLoadingIndex(null);
      return; // Calculations Stopped
    }
    if (cachedFeedback[viewIndex]) return;

    const analyzeMove = async () => {
      setLoadingIndex(viewIndex);
      setErrorIndex(null);

      // Get FENs
      const prevFen = fens[viewIndex - 1];
      const afterFen = fens[viewIndex];
      const playedMoveObj = history[viewIndex - 1];

      if (!playedMoveObj) {
        setLoadingIndex(null);
        return;
      }

      // Check cache for evaluation scores
      const prevEval = positionEvals[prevFen];
      const afterEval = positionEvals[afterFen] || (evaluation.fen === afterFen ? evaluation : null);

      // Classify the move based on mathematical structures
      let classification = "Best Move";
      const isBook = checkIsBookMove();

      if (isBook) {
        classification = "Book Move";
      } else {
        // Must wait until both evaluations are fully cached
        let currentPrevEval = prevEval;
        if (!currentPrevEval && viewIndex === 1) {
          currentPrevEval = { type: "cp", value: 35, bestMove: "e2e4" };
        }

        if (!currentPrevEval || !afterEval) {
          setLoadingIndex(null);
          return; // Skip classification until evaluations arrive
        }

        const prevIsWhite = playedMoveObj.color === "w";
        const afterIsWhite = playedMoveObj.color !== "w";

        let prevAbsolute = currentPrevEval.value;
        if (!prevIsWhite) prevAbsolute = -prevAbsolute;

        let afterAbsolute = afterEval.value;
        if (!afterIsWhite) afterAbsolute = -afterAbsolute;

        const isWhiteMove = playedMoveObj.color === "w";
        const drop = isWhiteMove ? (prevAbsolute - afterAbsolute) : (afterAbsolute - prevAbsolute);

        if (currentPrevEval.type === "mate" && afterEval.type !== "mate") {
          classification = "Blunder (??)";
        } else if (drop >= 200) {
          classification = "Blunder (??)";
        } else if (drop >= 100) {
          classification = "Mistake (?)";
        } else if (drop >= 50) {
          classification = "Inaccuracy (?!)";
        } else if (drop <= 0) {
          const isCapture = playedMoveObj.captured;
          if (isCapture && drop < -50) {
            classification = "Brilliant (!!)";
          } else if (drop < -15) {
            classification = "Great Move (!)";
          } else {
            classification = "Best Move";
          }
        } else if (drop < 15) {
          classification = "Excellent";
        } else {
          classification = "Good";
        }
      }

      const activePrevEval = prevEval || { type: "cp", value: 35 };
      const activeAfterEval = afterEval || evaluation;

      const evalText = `Position score changed from ${activePrevEval.type === "cp" ? (activePrevEval.value / 100).toFixed(1) : "Mate"} to ${activeAfterEval.type === "cp" ? (activeAfterEval.value / 100).toFixed(1) : "Mate"}.`;

      const payload = {
        fen: afterFen,
        move: playedMoveObj.san,
        evaluation: evalText,
        bestMove: prevEval?.bestMove || afterEval?.bestMove || "d4",
        moveClassification: classification,
        userApiKey: localStorage.getItem("chess_ai_key") || ""
      };

      try {
        const response = await fetch("/api/ai/live-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Feedback service failed.");
        }

        const data: CoachFeedback = await response.json();
        setCachedFeedback(prev => ({
          ...prev,
          [viewIndex]: data
        }));
      } catch (err: any) {
        console.error("Live Feedback Fetch Error:", err);
        setErrorIndex(viewIndex);
        setErrorMsg(err.message || "An unknown error occurred.");
      } finally {
        setLoadingIndex(null);
      }
    };

    // Delay slightly to let Stockfish evaluation settle
    const timeout = setTimeout(analyzeMove, 400);
    return () => clearTimeout(timeout);
  }, [viewIndex, fens, history, positionEvals, evaluation, cachedFeedback, opening, isPaused]);

  const togglePause = () => {
    const nextValue = !isPaused;
    setIsPaused(nextValue);
    localStorage.setItem("chess_analysis_paused", String(nextValue));
  };

  const playedMove = history[viewIndex - 1];
  const activeFeedback = cachedFeedback[viewIndex];
  const isLoading = loadingIndex === viewIndex;
  const isError = errorIndex === viewIndex;

  // Helper colors and badges based on classification
  const getBadgeStyle = (classification: string) => {
    const norm = (classification || "").toLowerCase();
    if (norm.includes("brilliant")) {
      return {
        bg: "bg-white/15 border-white/35 text-white",
        label: "Brilliant !!",
        symbol: <Sparkles className="w-5 h-5 text-neutral-950 fill-neutral-900 stroke-[1.5]" />,
        badgeColor: "bg-white"
      };
    }
    if (norm.includes("great")) {
      return {
        bg: "bg-white/10 border-white/25 text-white",
        label: "Great Move !",
        symbol: <Star className="w-4 h-4 text-neutral-950 fill-neutral-900" />,
        badgeColor: "bg-zinc-200"
      };
    }
    if (norm.includes("best")) {
      return {
        bg: "bg-white/10 border-white/20 text-white",
        label: "Best Move",
        symbol: <Check className="w-5 h-5 text-neutral-950 stroke-[3]" />,
        badgeColor: "bg-zinc-350"
      };
    }
    if (norm.includes("excellent")) {
      return {
        bg: "bg-white/5 border-white/15 text-white",
        label: "Excellent",
        symbol: <Check className="w-5 h-5 text-neutral-950 stroke-[2.5]" />,
        badgeColor: "bg-zinc-400"
      };
    }
    if (norm.includes("book")) {
      return {
        bg: "bg-stone-700/20 border-stone-600/30 text-stone-300",
        label: "Book Move",
        symbol: <BookOpen className="w-4.5 h-4.5 text-neutral-950 fill-neutral-900/10 stroke-[2]" />,
        badgeColor: "bg-stone-500"
      };
    }
    if (norm.includes("inaccuracy")) {
      return {
        bg: "bg-zinc-800 border-zinc-700/50 text-zinc-300",
        label: "Inaccuracy ?!",
        symbol: <span className="font-extrabold text-neutral-950 text-sans text-xs select-none">?!</span>,
        badgeColor: "bg-zinc-650"
      };
    }
    if (norm.includes("mistake")) {
      return {
        bg: "bg-[#161512] border-zinc-800 text-zinc-400",
        label: "Mistake ?",
        symbol: <span className="font-extrabold text-neutral-950 text-sans text-sm select-none">?</span>,
        badgeColor: "bg-zinc-800"
      };
    }
    if (norm.includes("blunder")) {
      return {
        bg: "bg-[#0f0e0d] border-neutral-800 text-neutral-550",
        label: "Blunder ??",
        symbol: <span className="font-extrabold text-neutral-300 text-sans text-xs select-none">??</span>,
        badgeColor: "bg-neutral-800"
      };
    }

    // Default Good
    return {
      bg: "bg-stone-500/15 border-stone-500/30 text-stone-300",
      label: classification || "Good Move",
      symbol: <Check className="w-5 h-5 text-neutral-900 stroke-[2]" />,
      badgeColor: "bg-stone-450"
    };
  };

  const badge = getBadgeStyle(activeFeedback?.classification || "Best Move");

  return (
    <div className={cn(
      "backdrop-blur-xl rounded-lg border shadow-2xl p-4 overflow-hidden flex flex-col h-[410px]",
      theme === "black" ? "bg-black/40 border-white/10" : "bg-white border-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
    )}>
      <div className={cn(
        "text-[10px] font-bold uppercase tracking-widest pb-2 flex items-center justify-between shrink-0 border-b mb-3",
        theme === "black" ? "text-gray-400 border-white/5" : "text-gray-500 border-black/5"
      )}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={togglePause}>
          <span className={cn(
            "w-2.5 h-2.5 rounded-full animate-pulse",
            isPaused 
              ? "bg-zinc-650" 
              : (theme === "black" ? "bg-white" : "bg-black")
          )}></span>
          {isPaused ? "Analysis paused" : "Live Analysis Report"}
        </div>
        <div className="flex items-center gap-2.5">
          {playedMove && !isPaused && (
            <span className="font-mono text-gray-500">Move: {viewIndex}. {playedMove.color === "w" ? "White" : "Black"} ({playedMove.san})</span>
          )}
          <button
            onClick={togglePause}
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 cursor-pointer select-none",
              isPaused 
                ? (theme === "black" ? "text-white border-white/30 bg-white/10 hover:bg-white/20" : "text-black border-black/30 bg-black/10 hover:bg-black/20")
                : (theme === "black" ? "text-zinc-400 border-zinc-750 bg-zinc-850/40 hover:bg-zinc-850/60" : "text-zinc-500 border-zinc-300 bg-zinc-100 hover:bg-zinc-200")
            )}
            title={isPaused ? "Resume real-time analysis" : "Pause real-time analysis"}
          >
            {isPaused ? "Resume" : "Stop Analysis"}
          </button>
        </div>
      </div>

      {isPaused ? (
        /* Render beautiful Stopped state */
        <div className={cn(
          "flex-1 flex flex-col items-center justify-center text-center space-y-3 rounded-lg border border-dashed p-5 my-1 animate-fade-in",
          theme === "black" ? "bg-black/20 border-white/5" : "bg-neutral-50 border-black/10"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-full border flex items-center justify-center animate-pulse",
            theme === "black" ? "bg-zinc-800/20 border-zinc-750 text-zinc-450" : "bg-zinc-100 border-zinc-200 text-zinc-400"
          )}>
            <WifiOff className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-zinc-400 uppercase tracking-widest">Analysis paused</h4>
          </div>
        </div>
      ) : (
        /* Standard evaluation & coach feedback flows */
        <>
          {/* 1. PINNED SIGNS (ILK ONCE ANALIZIN ISARETLERI GOZUKSUN) */}
          {!isLoading && !isError && activeFeedback && (
            <div className={cn(
              "shrink-0 mb-3 border rounded-lg p-3 flex items-center justify-between shadow-inner animate-fade-in",
              theme === "black" ? "bg-black/20 border-white/5" : "bg-neutral-50 border-black/5"
            )}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md shrink-0 select-none ${badge.badgeColor}`}>
                  {badge.symbol}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1">Move Quality</div>
                  <div className={cn(
                    "text-sm font-extrabold leading-none",
                    theme === "black" ? "text-gray-200" : "text-gray-800"
                  )}>{badge.label}</div>
                </div>
              </div>
              {evaluation && (
                <div className="text-right">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1">Strength Evaluation</div>
                  <div className={cn(
                    "font-mono text-xs font-black leading-none px-1.5 py-1 rounded",
                    theme === "black" ? "text-white/95 bg-white/5" : "text-black bg-black/5"
                  )}>
                    {evaluation.type === "mate" ? `M${evaluation.value}` : `${evaluation.value > 0 ? "+" : ""}${(evaluation.value / 100).toFixed(1)}`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. SCROLLABLE WRITINGS */}
          <div className={cn(
            "flex-1 overflow-y-auto pr-1 space-y-3.5 min-h-0 [scrollbar-width:thin]",
            theme === "black" ? "[scrollbar-color:rgba(255,255,255,0.1)_transparent]" : "[scrollbar-color:rgba(0,0,0,0.1)_transparent]"
          )}>
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 animate-fade-in">
                <Loader2 className={cn("w-8 h-8 animate-spin", theme === "black" ? "text-white" : "text-black")} />
                <p className={cn("text-xs font-bold animate-pulse flex items-center gap-1", theme === "black" ? "text-white" : "text-black")}><Flower className="w-4 h-4 animate-spin duration-3000" /> Chesster AI is analyzing the position...</p>
              </div>
            )}

            {/* Error State */}
            {isError && !isLoading && (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 px-4 animate-fade-in">
                <ShieldAlert className="w-10 h-10 text-zinc-500" />
                <p className="text-xs text-zinc-400 font-semibold">Feedback could not be retrieved</p>
                <p className="text-[10px] text-gray-500 max-w-sm leading-relaxed">{errorMsg}</p>
                <button 
                  onClick={() => {
                    setCachedFeedback(prev => {
                      const copy = { ...prev };
                      delete copy[viewIndex];
                      return copy;
                    });
                  }}
                  className={cn(
                    "mt-2 px-3 py-1.5 text-xs rounded font-semibold transition cursor-pointer border",
                    theme === "black" ? "bg-white/10 hover:bg-white/15 text-gray-200 border-white/5" : "bg-black/5 hover:bg-black/10 text-gray-700 border-black/10"
                  )}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loaded Feedback Content */}
            {!isLoading && !isError && activeFeedback && (
              <div className="space-y-3.5 animate-fade-in">
                {/* Advice commentary */}
                <div className="space-y-1">
                  <div className={cn(
                    "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                    theme === "black" ? "text-white" : "text-black"
                  )}>
                    <Flower className={cn("w-3.5 h-3.5 animate-pulse", theme === "black" ? "text-white" : "text-black")} />
                    Chesster AI Commentary
                  </div>
                  <div className={cn(
                    "text-xs p-3 rounded-lg border leading-relaxed font-semibold",
                    theme === "black" ? "bg-black/20 text-gray-300 border-white/5" : "bg-neutral-50 text-gray-700 border-black/5"
                  )}>
                    "{activeFeedback.commentary}"
                  </div>
                </div>

                {/* Coach Suggestions and Threat Detection cards */}
                <div className="grid grid-cols-1 gap-2.5 mt-1">
                  {/* Suggestion Card */}
                  <div className={cn(
                    "rounded-lg p-3 border flex gap-2.5 items-start",
                    theme === "black" ? "bg-black/20 border-white/5" : "bg-neutral-50 border-black/5"
                  )}>
                    <div className={cn(
                      "p-1.5 rounded shrink-0",
                      theme === "black" ? "bg-white/10 text-white" : "bg-black/5 text-black"
                    )}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className={cn(
                        "text-[10px] font-bold uppercase tracking-wider mb-0.5",
                        theme === "black" ? "text-white" : "text-black"
                      )}>Recommended Alternative</div>
                      <p className={cn(
                        "text-[11px] leading-relaxed font-medium",
                        theme === "black" ? "text-gray-300" : "text-gray-600"
                      )}>
                        {activeFeedback.engine_suggestion}
                      </p>
                    </div>
                  </div>

                  {/* Threat Card */}
                  <div className={cn(
                    "rounded-lg p-3 border flex gap-2.5 items-start",
                    theme === "black" ? "bg-black/20 border-white/5" : "bg-neutral-50 border-black/5"
                  )}>
                    <div className={cn(
                      "p-1.5 rounded shrink-0",
                      theme === "black" ? "bg-zinc-800/50 text-zinc-400" : "bg-black/5 text-zinc-500"
                    )}>
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Threat Analysis</div>
                      <p className={cn(
                        "text-[11px] leading-relaxed font-medium",
                        theme === "black" ? "text-gray-300" : "text-gray-600"
                      )}>
                        {activeFeedback.threat_detection}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edge Case: No moves yet */}
            {viewIndex === 0 && !isPaused && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 animate-fade-in">
                <div className="relative flex items-center justify-center w-8 h-8">
                  <div className="absolute inset-0 rounded-full border border-dashed border-gray-600 animate-spin"></div>
                  <div className={cn("w-2 h-2 rounded-full", theme === "black" ? "bg-white" : "bg-black")}></div>
                </div>
                <p className="text-xs text-gray-550 font-bold">Waiting for move</p>
                <p className="text-[10px] text-gray-500 max-w-[200px]">Make a move on the board to trigger real-time AI and Stockfish analysis.</p>
              </div>
            )}

            {/* Edge Case: No feedback fetch condition matches but move has been played */}
            {!isLoading && !isError && !activeFeedback && viewIndex > 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <div className="relative flex items-center justify-center w-8 h-8">
                  <div className="absolute inset-0 rounded-full border border-dashed border-gray-600 animate-spin"></div>
                  <div className={cn("w-2 h-2 rounded-full", theme === "black" ? "bg-white" : "bg-black")}></div>
                </div>
                <p className="text-xs text-gray-500 font-bold">Evaluating move...</p>
              </div>
            )}
          </div>
        </>
      )}

      <div className={cn(
        "pt-2 border-t flex justify-between items-center text-[10px] text-gray-500 mt-2 shrink-0 font-medium",
        theme === "black" ? "border-white/5" : "border-black/5"
      )}>
        <span>Stockfish Engine 15 & Chesster AI Coach</span>
        <span className="font-mono">v1.2 (Premium Review)</span>
      </div>
    </div>
  );
}
