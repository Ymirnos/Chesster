import React from "react";
import { cn } from "../lib/utils";

interface PlayerProfileProps {
  name: string;
  rating?: number;
  avatarUrl: string;
  isBottom?: boolean;
  isTurn?: boolean;
  timeRemainingSeconds: number;
  capturedPieces?: string[]; // E.g. ['bp', 'bn', 'bq']
  scoreAdvantage?: number; // E.g. 3
  color: "w" | "b";
  message?: string;
  onClick?: () => void;
  theme?: "black" | "white";
}

export function PlayerProfile({
  name,
  rating,
  avatarUrl,
  isBottom,
  isTurn,
  timeRemainingSeconds,
  capturedPieces = [],
  scoreAdvantage = 0,
  color,
  message,
  onClick,
  theme = "black"
}: PlayerProfileProps) {
  
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeRemainingSeconds < 60;

  return (
    <div className={cn("flex justify-between items-center w-full py-2 relative transition-colors duration-300", isBottom ? "mt-2" : "mb-2", theme === "white" ? "text-black" : "text-white")}>
      <div 
        onClick={onClick} 
        className={cn(
          "flex items-center space-x-3 rounded-lg transition-all duration-200", 
          onClick && (theme === "black" ? "hover:bg-white/5" : "hover:bg-black/5"),
          onClick && "px-2 py-1 -ml-2"
        )}
        title={onClick ? "Reset Black Pawn Profile" : undefined}
      >
        <div className="relative">
          <div className={cn(
            "w-12 h-12 rounded shadow-lg flex items-center justify-center transition-all duration-300",
            isTurn 
              ? (theme === "black" ? "ring-2 ring-white bg-white/10" : "ring-2 ring-black bg-black/10") 
              : (theme === "black" ? "bg-black/20" : "bg-black/5"),
            onClick && (theme === "black" ? "group-hover:ring-1 group-hover:ring-white/30" : "group-hover:ring-1 group-hover:ring-black/30")
          )}>
            <img
              src={avatarUrl}
              alt={name}
              className={cn(
                "w-10 h-10 object-contain drop-shadow-md transition-transform duration-300",
                isTurn ? "scale-110" : "",
                onClick && "hover:scale-110"
              )}
            />
          </div>
          {isTurn && (
            <div className={cn(
              "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 animate-pulse",
              theme === "black" ? "bg-white border-[#1e1c1a]" : "bg-black border-white"
            )} />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className={cn("font-semibold text-[15px]", theme === "white" ? "text-black" : "text-white")}>{name}</span>
            {rating && <span className={cn("text-sm", theme === "white" ? "text-gray-600" : "text-gray-400")}>({rating})</span>}
          </div>
          <div className="flex items-center min-h-[20px] h-[20px]">
            {capturedPieces.map((p, i) => (
              <img 
                key={i} 
                src={`https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${p}.png`} 
                alt={p}
                className="w-4 h-4 object-contain -ml-1.5 first:ml-0"
              />
            ))}
            {scoreAdvantage > 0 && (
              <span className={cn("text-xs font-semibold ml-1.5 pt-[1px]", theme === "white" ? "text-gray-600" : "text-gray-400")}>
                +{scoreAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "px-3 py-1.5 rounded-md font-mono text-xl font-bold flex items-center justify-center transition-colors min-w-[100px]",
          isTurn && !isLowTime ? (theme === "black" ? "bg-white text-black" : "bg-black text-white") : "",
          isTurn && isLowTime ? "bg-red-500 text-white" : "",
          !isTurn ? (theme === "black" ? "bg-black/20 text-gray-400" : "bg-black/5 text-gray-500") : ""
        )}
      >
        {formatTime(timeRemainingSeconds)}
      </div>
    </div>
  );
}
