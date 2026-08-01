import React, { useRef, useEffect } from "react";
import { Move } from "chess.js";
import { cn } from "../lib/utils";
import { OpeningInfo, BookMove } from "../lib/useOpening";

import { useAmbientMusic } from "../lib/useAmbientMusic";
import { Music, Volume2, VolumeX, Flag } from "lucide-react";

interface GameSidebarProps {
  history: Move[];
  isGameOver: boolean;
  gameOverReason: string;
  onResign: () => void;
  onDraw?: () => void;
  onNewGame: () => void;
  onUndo: () => void;
  onRedo: () => void;
  viewIndex: number;
  opening?: OpeningInfo;
  bookMoves?: BookMove[];
  playerName: string;
  setPlayerName: (name: string) => void;
  theme?: "black" | "white";
}

const ControlIconBase = ({ bg, children }: { bg: string, children: React.ReactNode }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-[18px] h-[18px]">
    <circle cx="50" cy="50" r="50" fill={bg} />
    {children}
  </svg>
);

const FlagIcon = () => (
  <ControlIconBase bg="#302e2b">
    <path d="M35,75 V25 h30 c5,0 10,5 5,10 c-5,5 -5,10 0,15 c5,5 0,10 -5,10 H40 M30,75 h10" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </ControlIconBase>
);

const DrawIcon = () => (
  <ControlIconBase bg="#302e2b">
    <text x="50" y="72" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="55" fill="white" textAnchor="middle">½</text>
  </ControlIconBase>
);

const LeftIcon = ({ active }: { active?: boolean }) => (
  <ControlIconBase bg={active ? "#8b8987" : "#302e2b"}>
    <path d="M60,25 L40,50 L60,75" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
  </ControlIconBase>
);

const RightIcon = ({ active }: { active?: boolean }) => (
  <ControlIconBase bg={active ? "#8b8987" : "#302e2b"}>
    <path d="M40,25 L60,50 L40,75" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
  </ControlIconBase>
);

const ReloadIcon = () => (
  <ControlIconBase bg="#8b8987">
    <path d="M50,25 a25,25 0 1,1 -15,5 M35,15 v15 h15" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </ControlIconBase>
);

export function GameSidebar({ 
  history, 
  isGameOver, 
  gameOverReason, 
  onResign, 
  onDraw, 
  onNewGame, 
  onUndo, 
  onRedo, 
  viewIndex, 
  opening, 
  bookMoves = [], 
  playerName, 
  setPlayerName, 
  theme = "black" 
}: GameSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isPlaying, toggleMusic, volume, setVolume } = useAmbientMusic();

  useEffect(() => {
    if (scrollRef.current && viewIndex === history.length - 1) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, viewIndex]);

  const movePairs: { white?: Move; black?: Move }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      white: history[i],
      black: history[i + 1],
    });
  }

  const activeIndex = viewIndex;
  const canUndo = activeIndex > 0;
  const canRedo = activeIndex < history.length;

  return (
    <div className={cn(
      "flex flex-col w-full h-full backdrop-blur-xl rounded-lg overflow-hidden border shadow-2xl min-h-[350px] transition-all duration-300",
      theme === "black" ? "bg-black/40 border-white/10" : "bg-white/80 border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
    )}>
      {/* Opening Header */}
      <div className={cn("p-3 border-b shrink-0", theme === "black" ? "bg-black/20 border-white/5" : "bg-black/5 border-black/5")}>
        <div className="flex items-center gap-2 mb-1">
          <div className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
            theme === "black" ? "bg-white/5 text-gray-400" : "bg-black/5 text-gray-600"
          )}>
            {opening?.eco || "???"}
          </div>
          <span className={cn(
            "text-xs font-semibold truncate flex-1",
            theme === "black" ? "text-gray-300" : "text-gray-700"
          )}>
            {opening?.name || "Starting Position"}
          </span>
          {opening && (
            <a 
              href={`https://www.chess.com/openings/${opening.name.replace(/\s+/g, '-').replace(/:/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className={cn(
                "text-[10px] hover:underline font-bold",
                theme === "black" ? "text-white" : "text-black"
              )}
            >
              LEARN
            </a>
          )}
        </div>
        
        {/* Simple Opening Explorer (Book Moves) */}
        {!isGameOver && bookMoves.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className={cn("text-[10px] font-bold uppercase tracking-widest pl-0.5", theme === "black" ? "text-gray-500" : "text-gray-400")}>Opening Explorer</div>
            <div className="flex flex-wrap gap-1">
              {bookMoves.map((m, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-mono cursor-default border transition-colors",
                    theme === "black" 
                      ? "bg-white/5 hover:bg-white/10 text-gray-300 border-white/5" 
                      : "bg-black/5 hover:bg-black/10 text-gray-700 border-black/5"
                  )}
                  title={`Games: ${m.white + m.draws + m.black}`}
                >
                  {m.san}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {movePairs.map((pair, index) => {
          const whiteIndex = index * 2;
          const blackIndex = whiteIndex + 1;
          
          return (
            <div
              key={index}
              className={cn(
                "flex text-sm py-1 px-2 rounded-md items-center",
                index % 2 === 0 
                  ? (theme === "black" ? "bg-black/20" : "bg-black/5") 
                  : "bg-transparent"
              )}
            >
              <div className={cn("w-8 font-mono text-xs", theme === "black" ? "text-gray-500" : "text-gray-400")}>
                {index + 1}.
              </div>
              <div className={cn(
                "flex-1 font-semibold px-1 py-0.5 rounded flex items-center justify-between transition-colors", 
                theme === "black" ? "text-gray-200" : "text-gray-800",
                activeIndex === whiteIndex + 1 && (theme === "black" ? "bg-white/10" : "bg-black/10")
              )}>
                <span>{pair.white?.san}</span>
              </div>
              <div className={cn(
                "flex-1 font-semibold px-1 py-0.5 rounded flex items-center justify-between mx-1 transition-colors", 
                theme === "black" ? "text-gray-200" : "text-gray-800",
                activeIndex === blackIndex + 1 && (theme === "black" ? "bg-white/10" : "bg-black/10")
              )}>
                <span>{pair.black?.san}</span>
              </div>
            </div>
          );
        })}

        {isGameOver && (
          <div className={cn("mt-4 p-4 rounded-md text-center", theme === "black" ? "bg-black/20" : "bg-black/5")}>
            <div className={cn("font-bold text-lg mb-1", theme === "black" ? "text-white" : "text-black")}>Game Over</div>
            <div className={cn("text-sm", theme === "black" ? "text-gray-400" : "text-gray-600")}>{gameOverReason}</div>
          </div>
        )}
      </div>

      <div className={cn("px-4 py-2 border-t flex items-center justify-between group", theme === "black" ? "bg-black/20 border-white/5" : "bg-black/5 border-black/5")}>
        <button 
          onClick={toggleMusic}
          className={cn(
            "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors",
            isPlaying 
              ? (theme === "black" ? "text-white" : "text-black") 
              : (theme === "black" ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600")
          )}
        >
          {isPlaying 
            ? <Volume2 size={14} className={cn(theme === "black" ? "text-white" : "text-black", "animate-pulse")} /> 
            : <Music size={14} />
          }
          {isPlaying ? "Nature Music On" : "Nature Music Off"}
        </button>
        {isPlaying && (
          <input 
            type="range" 
            min="-40" 
            max="-10" 
            value={volume} 
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className={cn(
              "w-16 h-1 rounded-lg appearance-none cursor-pointer ml-2",
              theme === "black" ? "bg-white/10 accent-white" : "bg-black/10 accent-black"
            )}
          />
        )}
      </div>

      <div className={cn("p-4 border-t", theme === "black" ? "bg-black/20 border-white/5" : "bg-black/5 border-black/5")}>
        {isGameOver && (
          <button
            onClick={onNewGame}
            className={cn(
              "w-full py-2.5 mb-3 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all duration-200 active:scale-95 cursor-pointer",
              theme === "black" ? "bg-white text-black hover:bg-neutral-200" : "bg-black text-white hover:bg-neutral-800"
            )}
          >
            Start New Game
          </button>
        )}

        <div className="flex justify-between items-center gap-2">
          <div className="flex gap-1 w-full justify-between items-center">
            <button 
              onClick={onUndo} 
              disabled={!canUndo} 
              className={cn(
                "p-2 rounded flex-1 flex items-center justify-center transition-colors mr-1", 
                canUndo 
                  ? (theme === "black" ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10") 
                  : "bg-transparent opacity-50"
              )}
            >
              <LeftIcon active={canUndo} />
            </button>
            <button 
              onClick={onRedo} 
              disabled={!canRedo} 
              className={cn(
                "p-2 rounded flex-1 flex items-center justify-center transition-colors ml-1", 
                canRedo 
                  ? (theme === "black" ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10") 
                  : "bg-transparent opacity-50"
              )}
            >
              <RightIcon active={canRedo} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}