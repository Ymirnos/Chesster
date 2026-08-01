import React from "react";
import { Evaluation } from "../lib/useStockfish";

interface EvaluationBarProps {
  evaluation: Evaluation;
  turn: "w" | "b";
  isFlipped: boolean; // if true, black is on bottom
}

export function EvaluationBar({ evaluation, turn, isFlipped }: EvaluationBarProps) {
  // Score is always relative to the side to move in UCI
  // Normalize score so positive is always advantage for white
  let evalNum = Number(evaluation.value);
  if (turn === "b") {
    evalNum = -evalNum;
  }

  // Calculate percentage for the bar
  // CP is usually -1000 to 1000 for realistic bar limits
  // A typical mapping is something like: percentage = 50 + (eval / 100) * 10
  // Capping at +8 and -8 usually
  
  let whitePercentage = 50;
  let displayValue = "";

  if (evaluation.type === "mate") {
     const mateIn = evalNum; // normalized, positive = white mates
     if (mateIn > 0) {
        whitePercentage = 100;
        displayValue = `M${mateIn}`;
     } else {
        whitePercentage = 0;
        displayValue = `M${Math.abs(mateIn)}`;
     }
  } else {
     // evalNum is in centipawns. Convert to pawns.
     const pawns = evalNum / 100;
     // simple sigmoid-like clamp
     let capped = pawns;
     if (capped > 5) capped = 5;
     if (capped < -5) capped = -5;
     
     // at +5 pawns, white is winning. That maps to maybe 95% full
     whitePercentage = 50 + (capped * 9); 
     
     displayValue = pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
     if (pawns === 0) displayValue = "0.0";
  }

  const whiteFill = `${whitePercentage}%`;

  return (
    <div className="w-5 md:w-6 bg-black/40 backdrop-blur-xl rounded-sm overflow-hidden flex flex-col relative select-none border border-white/10 shrink-0 self-stretch min-h-[300px]">
      {/* Black Side */}
      <div 
        className="w-full bg-[#3f3b36] transition-all duration-300 ease-in-out absolute top-0 left-0"
        style={{ height: isFlipped ? whiteFill : `${100 - whitePercentage}%` }}
      />
      {/* White Side */}
      <div 
        className="w-full bg-white transition-all duration-300 ease-in-out absolute bottom-0 left-0"
        style={{ height: isFlipped ? `${100 - whitePercentage}%` : whiteFill }}
      />
      
      {/* Display Text */}
      <div className={`absolute w-full text-center text-[10px] font-bold z-10 p-1 flex justify-center 
        ${evaluation.type === "mate" ? "" : "font-mono"} 
        ${(evalNum >= 0 && !isFlipped) || (evalNum < 0 && isFlipped) ? "text-black bottom-0" : "text-gray-300 top-0"}
      `}>
        {displayValue}
      </div>
    </div>
  );
}
