import React, { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Move } from "chess.js";
import { useChessGame, isValidChallengeMove } from "../lib/useChessGame";
import { PlayerProfile } from "./PlayerProfile";
import { motion, AnimatePresence } from "motion/react";
import { GameSidebar } from "./GameSidebar";
import { EvaluationBar } from "./EvaluationBar";
import { useStockfish, Evaluation } from "../lib/useStockfish";
import { useOpening } from "../lib/useOpening";
import { GameAnalytics } from "./GameAnalytics";
import { PERSONALITIES } from "../lib/personalities";
import { AIAssistant } from "./AIAssistant";
import { OpeningDatabase } from "./OpeningDatabase";
import { LiveFeedbackPanel } from "./LiveFeedbackPanel";
import { MagnusTrainer } from "./MagnusTrainer";
import { getStartingFen } from "../lib/challenges";
import { playSound } from "../lib/audio";
import { PanelRightClose, PanelRight, Bot, ChevronLeft, ChevronRight, Flag, Handshake, RotateCw, Palette, LayoutGrid, Image, BrainCircuit, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";

  // ROSTER_MAP maps each bot to a specific high-resolution chess piece avatar
  const ROSTER_MAP: Record<string, string> = {
    'Black Pawn': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
    'Stockfish 1600': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png',
    'Lc0 (Leela Chess Zero)': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png',
    'Maia Chess': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
    'Komodo Dragon': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
    'Stockfish 16.1': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',
    'Mittens': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png',
    'Martin': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
    'Alexandra Botez': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',
    'Levy Rozman': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
    'Magnus Carlsen': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png',
    'Hikaru Nakamura': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',
    'Garry Kasparov': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
    'Viswanathan Anand': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png',
    'Ding Liren': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png',
    'Alireza Firouzja': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',
    'Fabiano Caruana': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png',
  };

const ThemePreviewImage = ({ themeId }: { themeId: string }) => {
  const [src, setSrc] = useState(`https://images.chesscomfiles.com/chess-themes/pieces/${themeId}/150/wk.png`);
  
  useEffect(() => {
    setSrc(`https://images.chesscomfiles.com/chess-themes/pieces/${themeId}/150/wk.png`);
  }, [themeId]);

  return (
    <img 
      src={src} 
      alt="" 
      className="w-5 h-5 object-contain shrink-0"
      referrerPolicy="no-referrer"
      onError={() => {
        if (themeId !== "neo") {
          setSrc("https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png");
        }
      }}
    />
  );
};

const DynamicChessPiece = ({ theme, pieceKey, alt }: { theme: string; pieceKey: string; alt: string }) => {
  const [src, setSrc] = useState(`https://images.chesscomfiles.com/chess-themes/pieces/${theme}/150/${pieceKey}.png`);
  
  useEffect(() => {
    setSrc(`https://images.chesscomfiles.com/chess-themes/pieces/${theme}/150/${pieceKey}.png`);
  }, [theme, pieceKey]);

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => {
        const fallBackUrl = `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${pieceKey}.png`;
        if (src !== fallBackUrl) {
          setSrc(fallBackUrl);
        }
      }}
    />
  );
};

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function getPointAdvantageAndCaptures(fen: string) {
  const initialCounts = { P: 8, N: 2, B: 2, R: 2, Q: 1, p: 8, n: 2, b: 2, r: 2, q: 1 };
  const currentCounts: Record<string, number> = { P: 0, N: 0, B: 0, R: 0, Q: 0, p: 0, n: 0, b: 0, r: 0, q: 0 };
  
  const boardFen = fen.split(" ")[0];
  for (const char of boardFen) {
    if (currentCounts[char] !== undefined) {
      currentCounts[char]++;
    }
  }
  
  const whiteCaptured: string[] = [];
  let whiteCapturedScore = 0;
  
  const blackCaptured: string[] = [];
  let blackCapturedScore = 0;
  
  const pieces = ['p', 'n', 'b', 'r', 'q'];
  pieces.forEach(type => {
     let lowerType = type; // black piece
     let diffBlack = initialCounts[lowerType as keyof typeof initialCounts] - currentCounts[lowerType];
     for(let i=0; i<diffBlack; i++) {
        whiteCaptured.push("b" + lowerType);
        whiteCapturedScore += PIECE_VALUES[lowerType];
     }
     
     let upperType = type.toUpperCase(); // white piece
     let diffWhite = initialCounts[upperType as keyof typeof initialCounts] - currentCounts[upperType];
     for(let i=0; i<diffWhite; i++) {
        blackCaptured.push("w" + lowerType);
        blackCapturedScore += PIECE_VALUES[lowerType];
     }
  });
  
  return {
    whiteCaptured, 
    blackCaptured, 
    whiteAdvantage: Math.max(0, whiteCapturedScore - blackCapturedScore),
    blackAdvantage: Math.max(0, blackCapturedScore - whiteCapturedScore)
  };
}

const BOT_GROUPS = [
  {
    label: "Tutors & Partners",
    bots: [
      { id: "Black Pawn", name: "Black Pawn", elo: 400, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png" },
      { id: "Maia Chess", name: "Maia Chess", elo: 1500, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png", suffix: "Neural" },
      { id: "Martin", name: "Martin", elo: 250, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png" }
    ]
  },
  {
    label: "Grandmasters & Bots",
    bots: [
      { id: "Alexandra Botez", name: "Alexandra Botez", elo: 1800, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png" },
      { id: "Levy Rozman", name: "GothamChess", elo: 2100, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png" },
      { id: "Magnus Carlsen", name: "Magnus Carlsen", elo: 2850, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png" },
      { id: "Hikaru Nakamura", name: "Hikaru Nakamura", elo: 2800, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png" },
      { id: "Garry Kasparov", name: "Garry Kasparov", elo: 2812, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png" },
      { id: "Viswanathan Anand", name: "Viswanathan Anand", elo: 2750, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png" },
      { id: "Ding Liren", name: "Ding Liren", elo: 2780, icon: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/wk.png" },
      { id: "Alireza Firouzja", name: "Alireza Firouzja", elo: 2770, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png" },
      { id: "Fabiano Caruana", name: "Fabiano Caruana", elo: 2795, icon: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/wr.png" },
      { id: "Mittens", name: "Mittens", elo: 3200, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png", suffix: "Evil Cat" }
    ]
  },
  {
    label: "Engines (Open Source)",
    bots: [
      { id: "Stockfish 1600", name: "Stockfish Regular", elo: 1600, icon: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/bn.png" },
      { id: "Lc0 (Leela Chess Zero)", name: "Leela Chess Zero", elo: 3200, icon: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/bb.png" },
      { id: "Komodo Dragon", name: "Komodo Dragon", elo: 3400, icon: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/br.png" },
      { id: "Stockfish 16.1", name: "Stockfish Ultimate", elo: 3500, icon: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/bq.png" }
    ]
  }
];

const promotionChoices = [
  { id: 'q', name: 'Queen', symbol: '♕', icon: '👑' },
  { id: 'n', name: 'Knight', symbol: '♘', icon: '🐎' },
  { id: 'r', name: 'Rook', symbol: '♖', icon: '🏰' },
  { id: 'b', name: 'Bishop', symbol: '♗', icon: '🧙' }
];

const getGameResult = (reason: string): { title: string; description: string } => {
  const r = reason.toLowerCase();
  const isWhiteWinner = r.includes("white"); // White won / White won by ...

  if (r.includes("checkmate")) {
    return {
      title: "CHECKMATE!",
      description: isWhiteWinner 
        ? "Black is checkmated! White wins, Black loses." 
        : "White is checkmated! Black wins, White loses."
    };
  }
  if (r.includes("stalemate")) {
    return { title: "STALEMATE!", description: "The game ended in a stalemate (draw)." };
  }
  if (r.includes("insufficient material")) {
    return { title: "DRAW!", description: "The game is drawn due to insufficient material." };
  }
  if (r.includes("repetition")) {
    return { title: "DRAW!", description: "The game is drawn due to threefold repetition." };
  }
  if (r.includes("draw")) {
    return { title: "DRAW!", description: "The game ended in a draw." };
  }
  if (r.includes("time")) {
    return {
      title: "OUT OF TIME!",
      description: isWhiteWinner 
        ? "Black ran out of time! White wins, Black loses." 
        : "White ran out of time! Black wins, White loses."
    };
  }
  if (r.includes("resignation") || r.includes("abandoned") || r.includes("abandon")) {
    return {
      title: "GAME OVER!",
      description: isWhiteWinner 
        ? "Black resigned/abandoned! White wins, Black loses." 
        : "White resigned/abandoned! Black wins, White loses."
    };
  }
  return { title: "GAME OVER", description: reason || "The game is complete." };
};

const PIECE_THEMES = [
  { id: "neo", name: "Neo Style" },
  { id: "classic", name: "Classic" },
  { id: "gothic", name: "Gothic" },
  { id: "alpha", name: "Alpha" },
  { id: "wood", name: "Wood" },
  { id: "glass", name: "Glass" },
  { id: "newspaper", name: "Newspaper" },
  { id: "cases", name: "Special Season" },
  { id: "vintage", name: "Vintage" },
  { id: "dash", name: "Dash" },
  { id: "neon", name: "Neon Glow (Cyber)" },
  { id: "lolz", name: "Lolz (Meme Faces)" },
  { id: "space", name: "Space & Astronaut" },
  { id: "graffiti", name: "Graffiti (Street)" },
  { id: "nature", name: "Nature Force (Animals)" },
  { id: "ocean", name: "Under the Ocean (Sea)" }
];

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

const BOARD_THEMES = [
  { id: "classic2D", name: "Classic Brown", light: "#f0d9b5", dark: "#b58863" },
  { id: "green", name: "Modern Green", light: "#ececd7", dark: "#739552" },
  { id: "blue", name: "Ocean Blue", light: "#dee3e6", dark: "#8ca2ad" },
  { id: "cyber", name: "Slate Glass", light: "#f1f5f9", dark: "#475569" },
  { id: "purple", name: "Monochrome Matte", light: "#f3f4f6", dark: "#1f2937" },
  { id: "glowing_neon", name: "Cyber Neon (Glitch)", light: "#2d1a47", dark: "#0d0221" },
  { id: "lava", name: "Lava Volcano (Magma)", light: "#ff7b00", dark: "#4a0000" },
  { id: "gold", name: "Gold Legacy (Champion)", light: "#fff3cd", dark: "#856404" },
  { id: "emerald", name: "Emerald Nature (Forest)", light: "#e2f0d9", dark: "#385723" },
  { id: "tournament", name: "Tournament Gray", light: "#e2e4e6", dark: "#97a2a9" },
  { id: "midnight", name: "Midnight", light: "#e2e8f0", dark: "#334155" }
];

const BACKGROUND_GIFS = [
  { id: "katana-forest", name: "Katana Forest (Monochrome)", url: "https://i.giphy.com/1CTYzBtL77D767n6vD.gif" },
  { id: "cozy-anime", name: "Rainy Anime Room", url: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXRncjF3bjRxZmR6anFhNGs1cGpwbGhldzh4cDgwNzNlZGZ1Mmh1cSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/b29IZK1dP4aWs/giphy.gif" },
  { id: "pixel-lounge", name: "Pixel Cat Lounge", url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzJsMTFyZXFpZmoyNHk4aW5obmgxem05Ynhpdm9nY3V1bTNkOW11NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8SzmrGqs6oD7i/giphy.gif" },
  { id: "anime-library", name: "Anime Library", url: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYmhidzYzeXJ0aDVsc2t3bW04c2sxZzl3b3BsN2ZhamljOGFsMDlyZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ri2bxzIyxFfIk/giphy.gif" },
  { id: "retro-pixel-study", name: "Retro Study Room", url: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHdmM24wbnQ0aTNnOHI2eGF3NnNrZGs2YnE1c2syYjV0dnZmcThsaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VDo1OeV57IPPG/giphy.gif" },
  { id: "cyberpunk-retro", name: "Cyberpunk City", url: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExejg1dTI3aXVramFyMXVhM3B1M3FzeWl4dmppNDV5ZGl0andlbGVtMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/U8wCBLhkjNknS/giphy.gif" },
  { id: "coffee-chill", name: "Classic Coffee Shop", url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExb2ZjMng1MTIybmE1b2JlY2J6bnV1d21uMHdmZ21saXdyazN1YWRuYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/lnq52t8atIw3m/giphy.gif" }
];

interface ChessGameProps {
  playerName?: string;
  playerAvatar?: string;
  bgGif: string;
  setBgGif: (url: string) => void;
  isOnlineMatch?: boolean;
  socket?: any;
  roomId?: string;
  initialColor?: "w" | "b";
  opponentName?: string;
  opponentAvatar?: string;
  isBotOpponent?: boolean;
  initialTime?: number;
  onLeaveGame?: () => void;
  theme?: "black" | "white";
  challenges?: string[];
}

export default function ChessGame({
  playerName = "You",
  playerAvatar = "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png",
  bgGif,
  setBgGif,
  isOnlineMatch = false,
  socket = null,
  roomId = "",
  initialColor = "w",
  opponentName = "Opponent",
  opponentAvatar = "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png",
  isBotOpponent = false,
  initialTime = 600,
  onLeaveGame,
  theme = "black",
  challenges = []
}: ChessGameProps) {
  const initialFen = getStartingFen(challenges);
  const {
    game,
    fen,
    fens,
    history,
    makeMove,
    isGameOver,
    setIsGameOver,
    setGameOverReason,
    gameOverReason,
    resetGame,
    timers,
    setTimers,
    resign,
    claimDraw,
    checkSquare,
    lastMoveSquares,
    selectedSquare,
    setSelectedSquare,
    possibleMoves,
    setPossibleMoves,
    undoMove,
    redoMove,
    viewIndex,
    setViewIndex,
    isViewingHistory,
    loadPGN,
    loadMoveListUci,
    getValidChallengeMoves
  } = useChessGame(initialTime, initialFen, challenges);

  const turn = game.turn();
  const [botPersonality, setBotPersonality] = useState(PERSONALITIES['Black Pawn']);
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [aiArrows, setAiArrows] = useState<[string, string, string][]>([]);
  const isChallengeMatch = isBotOpponent || (challenges && challenges.length > 0);
  const [isPanelsExpanded, setIsPanelsExpanded] = useState(!isOnlineMatch && !isChallengeMatch);
  const [isBotPanelOpen, setIsBotPanelOpen] = useState(false);
  const [pieceTheme, setPieceTheme] = useState<string>("neo");
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [boardTheme, setBoardTheme] = useState<string>("classic2D");
  const [isBoardThemeMenuOpen, setIsBoardThemeMenuOpen] = useState(false);
  const [isBgMenuOpen, setIsBgMenuOpen] = useState(false);
  const [isMagnusCoachOpen, setIsMagnusCoachOpen] = useState(false);

  // Multiplayer Specific States
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [drawOfferReceived, setDrawOfferReceived] = useState<boolean>(false);

  // Sync color with settings
  useEffect(() => {
    if (initialColor) {
      setPlayerColor(initialColor);
    }
  }, [initialColor]);

  // Online Multiplayer Socket Event Listeners
  useEffect(() => {
    if (!isOnlineMatch || !socket) return;

    const handleMoveMade = (moveData: any) => {
      makeMove({
        from: moveData.from,
        to: moveData.to,
        promotion: moveData.promotion
      });
    };

    const handleOpponentDisconnected = () => {
      setIsGameOver(true);
      setGameOverReason(initialColor === "w" ? "Black left the game (White won)" : "White left the game (Black won)");
      playSound("gameEnd");
      setChatMessages(prev => [
        ...prev,
        {
          senderName: "System",
          text: "Opponent disconnected. You won by forfeit!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    };

    const handleMatchResigned = ({ winningColor }: { winningColor: "w" | "b" }) => {
      setIsGameOver(true);
      setGameOverReason(winningColor === "w" ? "Black resigned (White won)" : "White resigned (Black won)");
      playSound("gameEnd");
      setChatMessages(prev => [
        ...prev,
        {
          senderName: "System",
          text: `${winningColor === "w" ? "White" : "Black"} won the game by resignation!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    };

    const handleDrawOffered = ({ senderColor }: { senderColor: "w" | "b" }) => {
      if (senderColor !== initialColor) {
        setDrawOfferReceived(true);
      }
    };

    const handleDrawResponded = ({ accepted }: { accepted: boolean }) => {
      if (accepted) {
        setIsGameOver(true);
        setGameOverReason("Draw agreed (Draw)");
        playSound("gameEnd");
        setChatMessages(prev => [
          ...prev,
          {
            senderName: "System",
            text: "Draw offer accepted. The game ended in a draw.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            senderName: "System",
            text: "Draw offer declined.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    };

    const handleReceiveChat = (msg: any) => {
      setChatMessages(prev => [...prev, msg]);
    };

    const handleTimeSync = ({ whiteTime, blackTime }: { whiteTime: number; blackTime: number }) => {
      setTimers({ white: whiteTime, black: blackTime });
    };

    socket.on("move-made", handleMoveMade);
    socket.on("opponent-disconnected", handleOpponentDisconnected);
    socket.on("match-resigned", handleMatchResigned);
    socket.on("draw-offered", handleDrawOffered);
    socket.on("draw-responded", handleDrawResponded);
    socket.on("receive-chat", handleReceiveChat);
    socket.on("time-sync", handleTimeSync);

    return () => {
      socket.off("move-made", handleMoveMade);
      socket.off("opponent-disconnected", handleOpponentDisconnected);
      socket.off("match-resigned", handleMatchResigned);
      socket.off("draw-offered", handleDrawOffered);
      socket.off("draw-responded", handleDrawResponded);
      socket.off("receive-chat", handleReceiveChat);
      socket.off("time-sync", handleTimeSync);
    };
  }, [isOnlineMatch, socket, roomId, initialColor, makeMove, setIsGameOver, setGameOverReason, setTimers]);

  // Click outside menus to close them
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      if (
        target.closest("#bot-selection-sidebar") ||
        target.closest("#piece-theme-selection-sidebar") ||
        target.closest("#board-theme-selection-sidebar") ||
        target.closest("#bg-theme-selection-sidebar") ||
        target.closest(".theme-toggle-btn")
      ) {
        return;
      }

      setIsThemeMenuOpen(false);
      setIsBoardThemeMenuOpen(false);
      setIsBgMenuOpen(false);
      setIsBotPanelOpen(false);
    };

    if (isThemeMenuOpen || isBoardThemeMenuOpen || isBgMenuOpen || isBotPanelOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isThemeMenuOpen, isBoardThemeMenuOpen, isBgMenuOpen, isBotPanelOpen]);


  const getCustomPieceRenderers = (theme: string) => {
    const pieces = ["wP", "wR", "wN", "wB", "wQ", "wK", "bP", "bR", "bN", "bB", "bQ", "bK"];
    const renderers: any = {};
    pieces.forEach(p => {
      const key = p.toLowerCase();
      renderers[p] = () => (
        <DynamicChessPiece theme={theme} pieceKey={key} alt={p} />
      );
    });
    return renderers;
  };

  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [showGameOverScreen, setShowGameOverScreen] = useState(false);
  const [moveAnalysis, setMoveAnalysis] = useState<{
    white: Record<string, number>;
    black: Record<string, number>;
    accuracy: { white: number; black: number };
  } | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (isGameOver && !isViewingHistory) {
      const timeout = isOnlineMatch ? 500 : 2000;
      const timer = setTimeout(() => {
        setShowGameOverScreen(true);
        setIsAnalyzing(true);
        setAnalysisProgress({ current: 0, total: fens.length });
        
        const runReview = async () => {
          try {
            const { performGameReview } = await import("../lib/gameReview");
            const results = await performGameReview(fens, history, (current, total) => {
              setAnalysisProgress({ current, total });
            });
            setMoveAnalysis(results);
          } catch (err) {
            console.error("Game Review error:", err);
            // Fallback to minimal stats if it fails
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
      }, timeout);

      return () => clearTimeout(timer);
    } else {
      setShowGameOverScreen(false);
      if (!isGameOver) {
        setMoveAnalysis(null);
        setIsAnalyzing(false);
        setAnalysisProgress({ current: 0, total: 0 });
      }
    }
  }, [isGameOver, isViewingHistory, fens, history]);

  const isPromotionMove = (from: string, to: string, piece?: string): boolean => {
    const fromPiece = game.get(from as any);
    const movingPiece = fromPiece || (piece ? { type: piece[1]?.toLowerCase(), color: piece[0] } : null);
    if (!movingPiece || movingPiece.type !== 'p') return false;
    
    const targetRank = to[1];
    if (movingPiece.color === 'w' && targetRank === '8') return true;
    if (movingPiece.color === 'b' && targetRank === '1') return true;
    return false;
  };

  const playMoveAndSync = (moveObj: { from: string; to: string; promotion?: string }) => {
    const success = makeMove(moveObj);
    if (success && isOnlineMatch && socket && roomId) {
      const gClone = new Chess(game.fen());
      gClone.move(moveObj);
      const nextFen = gClone.fen();

      socket.emit("make-move", {
        roomId,
        move: {
          from: moveObj.from,
          to: moveObj.to,
          promotion: moveObj.promotion,
          fen: nextFen
        }
      });
    }
    return success;
  };

  const handleSelectPromotion = (promotionPiece: string) => {
    if (!pendingPromotion) return;
    
    playMoveAndSync({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promotionPiece
    });
    
    setPendingPromotion(null);
    setSelectedSquare(null);
    setPossibleMoves([]);
  };



  // Disable AI Analysis panels if in online match, unless it's a bot opponent
  const showAI = !isOnlineMatch || isBotOpponent;

  // Chess.com loaded game player states
  const [loadedWhitePlayer, setLoadedWhitePlayer] = useState<{ name: string; rating?: number } | null>(null);
  const [loadedBlackPlayer, setLoadedBlackPlayer] = useState<{ name: string; rating?: number } | null>(null);

  const handleLoadPGN = (pgn: string, whiteName?: string, blackName?: string, whiteRating?: number, blackRating?: number) => {
    if (whiteName && blackName) {
      setLoadedWhitePlayer({ name: whiteName, rating: whiteRating });
      setLoadedBlackPlayer({ name: blackName, rating: blackRating });
    } else {
      setLoadedWhitePlayer(null);
      setLoadedBlackPlayer(null);
    }
    loadPGN(pgn);
  };

  const handleLoadMoveList = (movesUci: string[]) => {
    setLoadedWhitePlayer(null);
    setLoadedBlackPlayer(null);
    loadMoveListUci(movesUci);
  };

  const handleResetGame = () => {
    setLoadedWhitePlayer(null);
    setLoadedBlackPlayer(null);
    resetGame();
    setIsAutoPlay(false);
  };

  // Map ELO to Stockfish Skill Level (0-20)
  const getSkillLevel = (elo: number) => {
    if (elo >= 3000) return 20;
    if (elo >= 2500) return 18;
    if (elo >= 2000) return 15;
    if (elo >= 1500) return 12;
    if (elo >= 1000) return 8;
    if (elo >= 500) return 4;
    return 2; // Minimum skill level 2 for better responsiveness
  };

  const effectiveBotElo = isBotOpponent
    ? (opponentName.includes("3500") ? 3500 : opponentName.includes("2850") ? 2850 : 1600)
    : botPersonality.elo;

  const evaluation = useStockfish(
    fen, 
    isGameOver, 
    getSkillLevel(effectiveBotElo), 
    effectiveBotElo
  );

  // Online Multiplayer Bot Logic
  useEffect(() => {
    if (!isOnlineMatch || !isBotOpponent || isGameOver || isViewingHistory) return;

    const turn = game.turn();
    const isBotTurn = turn !== initialColor;

    if (isBotTurn && evaluation.bestMove && evaluation.fen === game.fen()) {
      const move = evaluation.bestMove;
      const from = move.substring(0, 2);
      const to = move.substring(2, 4);
      const promotion = move.length === 5 ? move[4] : undefined;

      // Instant play for maximum speed
      playMoveAndSync({ from, to, promotion });
    }
  }, [isOnlineMatch, isBotOpponent, isGameOver, isViewingHistory, game.fen(), evaluation.bestMove, initialColor]);
  const { opening, bookMoves } = useOpening(fen);

  const prevEval = useRef<Evaluation | null>(null);

  const handleSelectPlayer = (name: string) => {
    const personality = PERSONALITIES[name] || PERSONALITIES['Black Pawn'];
    setBotPersonality(personality);
    setAiArrows([]);
    handleResetGame();
  };

  const [isAutoPlay, setIsAutoPlay] = useState(false);

  // ... (inside existing logic)

  const handleAICommand = (command: { moves?: string[], arrows?: string[][], reset?: boolean, autoPlay?: boolean, type?: string }) => {
    // Reset if requested
    if (command.reset) {
      handleResetGame();
      setIsAutoPlay(false);
      setAiArrows([]);
      // Small delay to ensure state update before moves
      if (command.moves && command.moves.length > 0) {
        setTimeout(() => executeMoves(command.moves!, false), 500);
      }
    } else if (command.moves && command.moves.length > 0) {
      executeMoves(command.moves, true);
    }
    
    if (command.autoPlay !== undefined) {
      setIsAutoPlay(command.autoPlay);
    }

    if (command.type === "complete") {
        setAiArrows([]);
        setSelectedSquare(null);
        return;
    }

    if (command.type === "torch") {
        if (evaluation.bestMove) {
            setAiArrows([[evaluation.bestMove.substring(0, 2), evaluation.bestMove.substring(2, 4), "rgba(34, 197, 94, 0.7)"]]);
        }
        return;
    }
    
    if (command.type === "var") {
        if (evaluation.bestMove) {
            // Mock alternative arrows
            setAiArrows([[evaluation.bestMove.substring(0, 2), evaluation.bestMove.substring(2, 4), "rgba(249, 115, 22, 0.7)"]]);
        }
        return;
    }

    if (command.type === "seraph") {
        if (evaluation.bestMove) {
            const startSquare = evaluation.bestMove.substring(0, 2);
            // Implement simple yellow border highlight for piece
            setSelectedSquare(startSquare);
        }
        return;
    }

    if (command.arrows && Array.isArray(command.arrows)) {
      const colorMap: Record<string, string> = {
        "g": "rgba(34, 197, 94, 0.7)",   // Green (Plan)
        "r": "rgba(239, 68, 68, 0.7)",   // Red (Threat)
        "b": "rgba(59, 130, 246, 0.7)",  // Blue (Protection)
        "y": "rgba(234, 179, 8, 0.7)"    // Yellow (Alternate)
      };

      const formattedArrows = command.arrows
        .filter(arr => Array.isArray(arr) && arr.length >= 2)
        .map(arr => {
          const moveOrSquare = arr[0];
          let start = "";
          let end = "";
          
          if (moveOrSquare.length === 4) {
             start = moveOrSquare.substring(0, 2);
             end = moveOrSquare.substring(2, 4);
          } else {
             start = moveOrSquare;
             end = arr[1];
          }

          const colorKey = moveOrSquare.length === 4 ? arr[1] : (arr[2] as string) || "g";
          return [start, end, colorMap[colorKey] || "rgba(34, 197, 94, 0.7)"] as [string, string, string];
        });

      if (formattedArrows.length > 0) {
        setAiArrows(formattedArrows);
        setTimeout(() => setAiArrows([]), 20000); // 20 seconds for deep study
      }
    }
  };

  const executeMoves = (moves: string[], startingFromCurrent: boolean = false) => {
    // Clear arrows when starting a demo
    setAiArrows([]);
    loadMoveListUci(moves, startingFromCurrent);
  };

  // Bot move logic
  useEffect(() => {
    const isBot = (botPersonality.type === 'bot' && botPersonality.name !== 'Black Pawn' && !loadedWhitePlayer) || isBotOpponent;
    const isAiTurn = isAutoPlay || (isBot && turn !== playerColor);
    
    if (isAiTurn && !isGameOver && !isViewingHistory) {
      const timer = setTimeout(() => {
        let movePlayed = false;

        // 1. Try Stockfish's bestMove if available and matches current FEN
        if (evaluation.bestMove && evaluation.fen === fen) {
          const from = evaluation.bestMove.substring(0, 2);
          const to = evaluation.bestMove.substring(2, 4);
          const promotion = evaluation.bestMove.length === 5 ? evaluation.bestMove[4] : "q";
          movePlayed = makeMove({ from, to, promotion });
        }

        // 2. If Stockfish's move is invalid under challenge rules or not ready, fallback to challenge-valid moves!
        if (!movePlayed) {
          const validMoves = getValidChallengeMoves();
          if (validMoves.length > 0) {
            // Prefer capture moves if available, otherwise pick randomly from valid challenge moves
            const captures = validMoves.filter(m => m.captured);
            const selectedMove = captures.length > 0 
              ? captures[Math.floor(Math.random() * captures.length)]
              : validMoves[Math.floor(Math.random() * validMoves.length)];
            
            makeMove({
              from: selectedMove.from,
              to: selectedMove.to,
              promotion: selectedMove.promotion || "q"
            });
          }
        }
      }, 500 + Math.random() * 400);
      return () => clearTimeout(timer);
    }
  }, [turn, playerColor, isGameOver, isViewingHistory, evaluation.bestMove, evaluation.fen, fen, makeMove, getValidChallengeMoves, botPersonality.type, botPersonality.name, loadedWhitePlayer, isAutoPlay, isBotOpponent]);

  useEffect(() => {
    prevEval.current = evaluation;
  }, [evaluation]);

  useEffect(() => {
    // Clear active coaching/visual command arrows when board changes
    setAiArrows([]);
  }, [fen]);

  const getPossibleMoves = (square: string) => {
    const allMoves = game.moves({ square: square as any, verbose: true }) as Move[];
    if (!challenges || challenges.length === 0) return allMoves;
    return allMoves.filter(m => isValidChallengeMove(game, { from: m.from, to: m.to, promotion: m.promotion || 'q' }, challenges));
  };

  const checkAndGetCastlingMove = (from: string, to: string, piece?: string): { from: string; to: string; promotion?: string } | null => {
    const fromPiece = game.get(from as any);
    const toPiece = game.get(to as any);
    const movingPiece = fromPiece || (piece ? { type: piece[1]?.toLowerCase(), color: piece[0] } : null);
    
    if (!movingPiece) return null;

    // 1. King dragged/clicked to Rook
    if (movingPiece.type === 'k') {
      if (from === 'e1' && movingPiece.color === 'w') {
        if (to === 'h1' || (toPiece && toPiece.type === 'r' && toPiece.color === 'w' && to === 'h1')) {
          return { from: 'e1', to: 'g1' };
        }
        if (to === 'a1' || (toPiece && toPiece.type === 'r' && toPiece.color === 'w' && to === 'a1')) {
          return { from: 'e1', to: 'c1' };
        }
      }
      if (from === 'e8' && movingPiece.color === 'b') {
        if (to === 'h8' || (toPiece && toPiece.type === 'r' && toPiece.color === 'b' && to === 'h8')) {
          return { from: 'e8', to: 'g8' };
        }
        if (to === 'a8' || (toPiece && toPiece.type === 'r' && toPiece.color === 'b' && to === 'a8')) {
          return { from: 'e8', to: 'c8' };
        }
      }
    }
    
    // 2. Rook dragged/clicked to King
    if (movingPiece.type === 'r') {
      if (to === 'e1' && toPiece && toPiece.type === 'k' && toPiece.color === 'w') {
        if (from === 'h1') return { from: 'e1', to: 'g1' };
        if (from === 'a1') return { from: 'e1', to: 'c1' };
      }
      if (to === 'e8' && toPiece && toPiece.type === 'k' && toPiece.color === 'b') {
        if (from === 'h8') return { from: 'e8', to: 'g8' };
        if (from === 'a8') return { from: 'e8', to: 'c8' };
      }
    }
    
    return null;
  };

  const handleSquareClick = (square: string) => {
    if (isGameOver) return;
    if (isOnlineMatch) {
      if (turn !== initialColor) return;
    } else {
      if (turn !== playerColor) return;
    }

    const piece = game.get(square as any);

    if (selectedSquare) {
      if (selectedSquare === square) {
         setSelectedSquare(null);
         setPossibleMoves([]);
         return;
      }

      // Check if it's a legal pawn promotion move
      if (isPromotionMove(selectedSquare, square)) {
         const legalMoves = getPossibleMoves(selectedSquare);
         const isLegal = legalMoves.some(m => m.to === square);
         if (isLegal) {
           setPendingPromotion({ from: selectedSquare, to: square });
           return;
         }
      }

      const castlingMove = checkAndGetCastlingMove(selectedSquare, square);
      const targetMove = castlingMove || {
        from: selectedSquare,
        to: square,
        promotion: "q"
      };

      const move = playMoveAndSync(targetMove);

      if (move) {
        setSelectedSquare(null);
        setPossibleMoves([]);
      } else {
        if (piece && piece.color === turn) {
          setSelectedSquare(square);
          setPossibleMoves(getPossibleMoves(square));
        } else {
          setSelectedSquare(null);
          setPossibleMoves([]);
        }
      }
    } else {
      if (piece && piece.color === turn) {
        setSelectedSquare(square);
        setPossibleMoves(getPossibleMoves(square));
      }
    }
  };

  const handlePieceDragBegin = (piece: string, sourceSquare: string) => {
    console.log("Drag Begin:", piece, sourceSquare);
    if (isGameOver) return;
    
    if (isOnlineMatch) {
      if (turn !== initialColor || piece[0] !== initialColor) {
        setPossibleMoves([]);
        return;
      }
    } else {
      const isBotGame = botPersonality.name !== 'Black Pawn';
      if (isBotGame) {
        if (turn !== playerColor || piece[0] !== playerColor) {
          setPossibleMoves([]);
          return;
        }
      }
    }
    
    setSelectedSquare(sourceSquare);
    if (piece[0] === turn) {
      const moves = getPossibleMoves(sourceSquare);
      console.log("Possible moves for square:", sourceSquare, moves);
      setPossibleMoves(moves);
    } else {
      setPossibleMoves([]);
    }
  };

  const handlePieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    console.log("Piece Drop Attempt:", { sourceSquare, targetSquare, piece, turn });
    if (isGameOver) return false;
    
    if (isOnlineMatch) {
      if (turn !== initialColor || piece[0] !== initialColor) {
        console.log("Rejected: Online game turn/color restriction", { turn, initialColor, pieceColor: piece[0] });
        return false;
      }
    } else {
      const isBotGame = botPersonality.name !== 'Black Pawn';
      if (isBotGame) {
        if (turn !== playerColor || piece[0] !== playerColor) {
          console.log("Rejected: Bot game turn/color restriction", { turn, playerColor, pieceColor: piece[0] });
          return false;
        }
      } else {
        // Safety check: only move on your turn
        if (piece[0] !== turn) {
          console.log("Rejected: Piece color doesn't match turn", piece[0], turn);
          return false;
        }
      }
    }

    // Check if it's a legal pawn promotion move
    if (isPromotionMove(sourceSquare, targetSquare, piece)) {
      const legalMoves = getPossibleMoves(sourceSquare);
      const isLegal = legalMoves.some(m => m.to === targetSquare);
      if (isLegal) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        return false; // Reset the piece animation, we will place the final correct piece upon selection click
      }
    }

    const castlingMove = checkAndGetCastlingMove(sourceSquare, targetSquare, piece);
    const targetMove = castlingMove || {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q"
    };

    const moveResult = playMoveAndSync(targetMove);

    console.log("Move Result:", moveResult);

    if (moveResult) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return true;
    }
    
    return false;
  };

  const handleSquareRightClick = (square: string) => {
    setSelectedSquare(null);
    setPossibleMoves([]);
  };

  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (checkSquare) {
    customSquareStyles[checkSquare] = {
      background: "radial-gradient(ellipse at center, red 0%, transparent 70%), transparent"
    };
  }

  // Last move highlight
  lastMoveSquares.forEach(sq => {
     customSquareStyles[sq] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
  });

  // Selected square highlight
  if (selectedSquare) {
     customSquareStyles[selectedSquare] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
  }

  // Possible moves highlight (Gray dots)
  possibleMoves.forEach(m => {
     const hasPiece = game.get(m.to as any);
     customSquareStyles[m.to] = {
       ...customSquareStyles[m.to],
       backgroundImage: hasPiece 
         ? "radial-gradient(circle, rgba(0,0,0,0.2) 85%, transparent 85%)" 
         : "radial-gradient(circle, rgba(0,0,0,0.15) 25%, transparent 25%)",
       backgroundRepeat: "no-repeat",
       backgroundPosition: "center",
       backgroundSize: "100%",
       cursor: "pointer",
     };
  });

  const { whiteCaptured, blackCaptured, whiteAdvantage, blackAdvantage } = getPointAdvantageAndCaptures(fen);

  return (
    <div className={cn(
      "max-w-[1700px] w-full mx-auto p-4 lg:p-6 xl:px-24 flex flex-col xl:flex-row justify-center items-start xl:h-full xl:overflow-hidden transition-all duration-500 ease-in-out",
      (isPanelsExpanded || isOnlineMatch) ? "gap-6" : "gap-0"
    )}>
      {/* Enlarged Board Area - relative so that Left Rail and Bot selection float nicely around it keeping the board perfectly mathematically centered */}
      <div className={cn(
        "w-full flex flex-col justify-start xl:h-full xl:justify-center transition-all duration-500 ease-in-out xl:relative",
        (isPanelsExpanded || isOnlineMatch) ? "flex-[2] max-w-[850px]" : "flex-1 max-w-[950px]"
      )}>
        {/* Long Glassmorphic Transparent Bar on the Left in Solo Mode */}
        {!isOnlineMatch && (
          <div id="solo-left-rail" className="hidden xl:flex flex-col items-center py-4 w-12 h-auto pb-6 bg-black/25 backdrop-blur-xl border border-white/5 rounded-2xl shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden xl:absolute xl:-left-16 xl:top-1/2 xl:-translate-y-1/2 z-40">
            {/* Flip Board Icon Button at the very top */}
            <button
               type="button"
               onClick={() => {
                 playSound("click");
                 setPlayerColor(playerColor === "w" ? "b" : "w");
               }}
               className="theme-toggle-btn flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white hover:text-neutral-300 border border-white/20 transition-all duration-200 active:scale-90 cursor-pointer shadow-md"
               title="Flip Board"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Reset Game Button */}
            <button
               type="button"
               onClick={() => {
                 playSound("click");
                 resetGame();
               }}
               className="theme-toggle-btn flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white hover:text-neutral-300 border border-white/20 transition-all duration-200 active:scale-90 cursor-pointer shadow-md mt-6"
               title="Reset Game"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Piece Theme Chooser Button */}
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setIsThemeMenuOpen(!isThemeMenuOpen);
                setIsBotPanelOpen(false);
                setIsBoardThemeMenuOpen(false);
                setIsBgMenuOpen(false);
              }}
              className={cn(
                "theme-toggle-btn flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 active:scale-90 cursor-pointer shadow-md mt-6",
                isThemeMenuOpen 
                  ? "bg-white text-black border border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]" 
                  : "bg-white/10 hover:bg-white/20 text-white hover:text-white/80 border border-white/20"
              )}
              title="Piece Themes"
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* Board Theme Chooser Button */}
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setIsBoardThemeMenuOpen(!isBoardThemeMenuOpen);
                setIsThemeMenuOpen(false);
                setIsBotPanelOpen(false);
                setIsBgMenuOpen(false);
              }}
              className={cn(
                "theme-toggle-btn flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 active:scale-90 cursor-pointer shadow-md mt-6",
                isBoardThemeMenuOpen 
                  ? "bg-white text-black border border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]" 
                  : "bg-white/10 hover:bg-white/20 text-white hover:text-white/80 border border-white/20"
              )}
              title="Board Themes"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            {/* Background Theme Chooser Button */}
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setIsBgMenuOpen(!isBgMenuOpen);
                setIsThemeMenuOpen(false);
                setIsBoardThemeMenuOpen(false);
                setIsBotPanelOpen(false);
              }}
              className={cn(
                "theme-toggle-btn flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 active:scale-90 cursor-pointer shadow-md mt-6",
                isBgMenuOpen 
                  ? "bg-white text-black border border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]" 
                  : "bg-white/10 hover:bg-white/20 text-white hover:text-white/80 border border-white/20"
              )}
              title="Backgrounds & Themes"
            >
              <Image className="w-4 h-4" />
            </button>

            {/* Bot Selection Sidebar Toggle Button */}
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setIsBotPanelOpen(!isBotPanelOpen);
                setIsThemeMenuOpen(false);
                setIsBoardThemeMenuOpen(false);
                setIsBgMenuOpen(false);
              }}
              className={cn(
                "theme-toggle-btn flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 active:scale-90 cursor-pointer shadow-md mt-6",
                isBotPanelOpen 
                  ? "bg-white text-black border border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]" 
                  : "bg-white/10 hover:bg-white/20 text-white hover:text-white/80 border border-white/20"
              )}
              title="Bot Selection Panel"
            >
              <Bot className="w-4 h-4" />
            </button>

            {/* AI Coach Toggle Button */}
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setIsMagnusCoachOpen(!isMagnusCoachOpen);
              }}
              className={cn(
                "theme-toggle-btn flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 active:scale-90 cursor-pointer shadow-md mt-6",
                isMagnusCoachOpen 
                  ? "bg-green-500 text-white border border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]" 
                  : "bg-white/10 hover:bg-white/20 text-white hover:text-green-300 border border-white/20"
              )}
              title="AI Chess Coach"
            >
              <BrainCircuit className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Animated Bot Selection Sidebar (Vertical Slide-out Panel) */}
        <AnimatePresence>
          {isBotPanelOpen && !isOnlineMatch && (
            <motion.div
              initial={{ opacity: 0, x: -40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute z-45 w-full xl:w-[288px] h-[340px] xl:h-[645px] top-full mt-3 xl:mt-0 xl:top-1/2 xl:-translate-y-1/2 xl:-left-[364px] bg-black/25 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-2xl flex flex-col"
              id="bot-selection-sidebar"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5 select-none shrink-0">
                <span className="text-[10px] text-white font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <span>🤖</span> SELECTABLE OPPONENTS
                </span>
                <span className="text-[9px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                  {BOT_GROUPS.flatMap(g => g.bots).length} BOTS
                </span>
              </div>

              {/* Bot List - vertical-scrolling rectangular items */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
                {BOT_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-1.5">
                    <div className="text-[9px] font-black uppercase tracking-wider text-gray-300 pl-1 select-none border-b border-white/5 pb-0.5">
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.bots.map((bot) => {
                        const isSelected = botPersonality.name === bot.id;
                        return (
                          <button
                            key={bot.id}
                            type="button"
                            onClick={() => handleSelectPlayer(bot.id)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.97] border cursor-pointer relative overflow-hidden select-none",
                              isSelected 
                                ? "bg-white/10 border-white/30 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]" 
                                : "bg-black/30 hover:bg-white/5 border-white/5 text-gray-400 hover:text-white"
                            )}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span className="text-sm select-none h-5 w-5 flex items-center justify-center">
                                {bot.icon.startsWith('http') ? (
                                  <img src={bot.icon} alt="" className="w-full h-full object-contain" />
                                ) : (
                                  bot.icon
                                )}
                              </span>
                              <span className="truncate">{bot.name}</span>
                              {bot.suffix && (
                                <span className={cn(
                                  "text-[8px] px-1 py-0.2 rounded font-normal",
                                  isSelected ? "bg-white/20 text-white" : "bg-white/5 text-gray-550"
                                )}>
                                  {bot.suffix}
                                </span>
                              )}
                            </span>
                            <span className={cn(
                              "text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0",
                              isSelected ? "bg-white/20 text-white" : "bg-white/5 text-gray-555"
                            )}>
                              {bot.elo}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Piece Theme Selection Sidebar (Blury, Glassy, Transparent Sibling) */}
        <AnimatePresence>
          {isThemeMenuOpen && !isOnlineMatch && (
            <motion.div
              initial={{ opacity: 0, x: -40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute z-45 w-full xl:w-[220px] h-[340px] xl:h-[450px] top-full mt-3 xl:mt-0 xl:top-1/2 xl:-translate-y-1/2 xl:-left-[296px] bg-black/25 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-2xl flex flex-col"
              id="piece-theme-selection-sidebar"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5 select-none shrink-0">
                <span className="text-[10px] text-white font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎨</span> PIECE THEMES
                </span>
                <span className="text-[9px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                  {PIECE_THEMES.length} THEMES
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {PIECE_THEMES.map((theme) => {
                  const isSelected = pieceTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => setPieceTheme(theme.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 border cursor-pointer rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.97] select-none mb-1.5",
                        isSelected 
                          ? "bg-white/10 border-white/30 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]" 
                          : "bg-black/30 hover:bg-white/5 border-white/5 text-gray-400 hover:text-white"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <ThemePreviewImage themeId={theme.id} />
                        <span className="truncate">{theme.name}</span>
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Board Theme Selection Sidebar (Blury, Glassy, Transparent Sibling) */}
        <AnimatePresence>
          {isBoardThemeMenuOpen && !isOnlineMatch && (
            <motion.div
              initial={{ opacity: 0, x: -40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute z-45 w-full xl:w-[220px] h-[340px] xl:h-[380px] top-full mt-3 xl:mt-0 xl:top-1/2 xl:-translate-y-1/2 xl:-left-[296px] bg-black/25 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-2xl flex flex-col"
              id="board-theme-selection-sidebar"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5 select-none shrink-0">
                <span className="text-[10px] text-white font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎨</span> BOARD THEMES
                </span>
                <span className="text-[9px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                  {BOARD_THEMES.length} THEMES
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {BOARD_THEMES.map((theme) => {
                  const isSelected = boardTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => setBoardTheme(theme.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 border cursor-pointer rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.97] select-none mb-1.5",
                        isSelected 
                          ? "bg-white/10 border-white/30 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]" 
                          : "bg-black/30 hover:bg-white/5 border-white/5 text-gray-400 hover:text-white"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <div className="w-5 h-5 rounded overflow-hidden flex border border-white/20 shrink-0">
                          <div style={{ backgroundColor: theme.light }} className="w-1/2 h-full" />
                          <div style={{ backgroundColor: theme.dark }} className="w-1/2 h-full" />
                        </div>
                        <span className="truncate">{theme.name}</span>
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Background Theme Selection Sidebar (Blury, Glassy, Transparent Sibling) */}
        <AnimatePresence>
          {isBgMenuOpen && !isOnlineMatch && (
            <motion.div
              initial={{ opacity: 0, x: -40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute z-45 w-full xl:w-[220px] h-[360px] xl:h-[450px] top-full mt-3 xl:mt-0 xl:top-1/2 xl:-translate-y-1/2 xl:-left-[296px] bg-black/25 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-2xl flex flex-col"
              id="bg-theme-selection-sidebar"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5 select-none shrink-0">
                <span className="text-[10px] text-white font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <span>🌌</span> BACKGROUNDS
                </span>
                <span className="text-[9px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                  {BACKGROUND_GIFS.length} BACKGROUNDS
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {BACKGROUND_GIFS.map((gif) => {
                  const isSelected = bgGif === gif.url;
                  return (
                    <button
                      key={gif.id}
                      onClick={() => setBgGif(gif.url)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 border cursor-pointer rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.97] select-none mb-1.5 outline-none",
                        isSelected 
                          ? "bg-white/10 border-white/30 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]" 
                          : "bg-black/30 hover:bg-white/5 border-white/5 text-gray-400 hover:text-white"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <div className="w-8 h-8 rounded overflow-hidden flex border border-white/10 shrink-0 bg-neutral-900">
                          <img src={gif.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <span className="truncate text-left text-[11px] leading-tight font-medium">{gif.name}</span>
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Switcher & Panel Control Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between w-full mb-3 gap-3 relative z-30">

          {/* Mobile/Tablet Controls Row (Grid Layout with no gaps/empty space) */}
          {!isOnlineMatch && !isGameOver && (
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 w-full xl:hidden">
              {/* Flip Board Button on Mobile/Tablet */}
              <button
                 onClick={() => setPlayerColor(playerColor === "w" ? "b" : "w")}
                 className="theme-toggle-btn flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 bg-white/10 hover:bg-white/20 border border-white/20 text-white hover:text-white/80 shadow-inner active:scale-95 cursor-pointer w-full text-center"
                 title="Flip Board"
              >
                <RotateCw className="w-4 h-4 text-white shrink-0" />
                <span className="truncate">Flip Board</span>
              </button>

              {/* Reset Game Button on Mobile/Tablet */}
              <button
                 onClick={() => resetGame()}
                 className="theme-toggle-btn flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 bg-white/10 hover:bg-white/20 border border-white/20 text-white hover:text-white/80 shadow-inner active:scale-95 cursor-pointer w-full text-center"
                 title="Reset Game"
              >
                <RefreshCw className="w-4 h-4 text-white shrink-0" />
                <span className="truncate">Reset Game</span>
              </button>

              {/* Piece Theme Toggle on Mobile/Tablet */}
              <button
                onClick={() => {
                  setIsThemeMenuOpen(!isThemeMenuOpen);
                  setIsBotPanelOpen(false);
                  setIsBoardThemeMenuOpen(false);
                  setIsBgMenuOpen(false);
                }}
                className={cn(
                  "theme-toggle-btn flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 shadow-inner active:scale-95 cursor-pointer w-full text-center",
                  isThemeMenuOpen
                    ? "bg-white text-black border border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                )}
                title="Piece Themes"
              >
                <Palette className={cn("w-4 h-4 shrink-0", isThemeMenuOpen ? "text-black" : "text-white")} />
                <span className="truncate">Piece: {PIECE_THEMES.find(t => t.id === pieceTheme)?.name || "Neo"}</span>
              </button>

              {/* Board Theme Toggle on Mobile/Tablet */}
              <button
                onClick={() => {
                  setIsBoardThemeMenuOpen(!isBoardThemeMenuOpen);
                  setIsThemeMenuOpen(false);
                  setIsBotPanelOpen(false);
                  setIsBgMenuOpen(false);
                }}
                className={cn(
                  "theme-toggle-btn flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 shadow-inner active:scale-95 cursor-pointer w-full text-center",
                  isBoardThemeMenuOpen
                    ? "bg-white text-black border border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                )}
                title="Board Themes"
              >
                <LayoutGrid className={cn("w-4 h-4 shrink-0", isBoardThemeMenuOpen ? "text-black" : "text-white")} />
                <span className="truncate">Board: {BOARD_THEMES.find(t => t.id === boardTheme)?.name || "Classic"}</span>
              </button>

              {/* Background Theme Toggle on Mobile/Tablet */}
              <button
                onClick={() => {
                  setIsBgMenuOpen(!isBgMenuOpen);
                  setIsThemeMenuOpen(false);
                  setIsBoardThemeMenuOpen(false);
                  setIsBotPanelOpen(false);
                }}
                className={cn(
                  "theme-toggle-btn flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 shadow-inner active:scale-95 cursor-pointer w-full text-center",
                  isBgMenuOpen
                    ? "bg-white text-black border border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                )}
                title="Backgrounds & Themes"
              >
                <Image className={cn("w-4 h-4", isBgMenuOpen ? "text-black" : "text-white")} />
                <span className="truncate">Bg: {BACKGROUND_GIFS.find(gif => gif.url === bgGif)?.name || "Classic"}</span>
              </button>

              {/* Bot Selection Toggle on Mobile/Tablet */}
              <button
                onClick={() => {
                  setIsBotPanelOpen(!isBotPanelOpen);
                  setIsThemeMenuOpen(false);
                  setIsBoardThemeMenuOpen(false);
                  setIsBgMenuOpen(false);
                }}
                className={cn(
                  "theme-toggle-btn flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 shadow-inner active:scale-95 cursor-pointer w-full text-center col-span-2 sm:col-span-1",
                  isBotPanelOpen
                    ? "bg-white text-black border border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                )}
                title="Bot Selection Panel"
              >
                <Bot className={cn("w-4 h-4 shrink-0", isBotPanelOpen ? "text-black" : "text-white")} />
                <span className="truncate">Bots: {botPersonality.name}</span>
              </button>

              {/* AI Coach Toggle on Mobile/Tablet */}
              <button
                onClick={() => setIsMagnusCoachOpen(!isMagnusCoachOpen)}
                className={cn(
                  "theme-toggle-btn flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 shadow-inner active:scale-95 cursor-pointer w-full text-center col-span-2 sm:col-span-1",
                  isMagnusCoachOpen
                    ? "bg-white text-black border border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                )}
                title="AI Chess Coach"
              >
                <BrainCircuit className={cn("w-4 h-4 shrink-0", isMagnusCoachOpen ? "text-black" : "text-white")} />
                <span className="truncate">Coach: {isMagnusCoachOpen ? "On" : "Off"}</span>
              </button>
            </div>
          )}

          {/* Panels Expand/Collapse Toggle */}
          {!isOnlineMatch && !isChallengeMatch && !isGameOver && (
            <button
              onClick={() => {
                playSound("click");
                setIsPanelsExpanded(!isPanelsExpanded);
              }}
              onMouseEnter={() => playSound("hover")}
              className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 bg-[#1e1a17]/80 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white shadow-inner active:scale-95 flex-1 xl:flex-initial min-w-[130px] xl:min-w-0 xl:ml-auto cursor-pointer"
              title={isPanelsExpanded ? "Hide Panels" : "Show Panels"}
            >
              {isPanelsExpanded ? (
                <>
                  <PanelRightClose className="w-4 h-4 text-white" />
                  <span>Hide Panels</span>
                </>
              ) : (
                <>
                  <PanelRight className="w-4 h-4 text-gray-400" />
                  <span>Show Panels</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Centered Board Game and Profile Column matching the board's width bounds */}
        <div className={cn("w-full mx-auto flex flex-col gap-3 relative z-15 select-none transition-[max-width] duration-300 ease-out", isMagnusCoachOpen && !isOnlineMatch ? "max-w-[680px]" : "max-w-[780px]")}>
          {/* Opponent Profile (Top) */}
          <PlayerProfile
            name={(isOnlineMatch || isBotOpponent) ? opponentName : (loadedBlackPlayer ? loadedBlackPlayer.name : botPersonality.name)}
            rating={(isOnlineMatch || isBotOpponent) ? effectiveBotElo : (loadedBlackPlayer ? loadedBlackPlayer.rating : botPersonality.elo)}
            avatarUrl={(isOnlineMatch || isBotOpponent) ? opponentAvatar : (ROSTER_MAP[botPersonality.name] || "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg")}
            color={playerColor === "w" ? "b" : "w"}
            isTurn={turn !== playerColor}
            timeRemainingSeconds={timers[playerColor === "w" ? "black" : "white"]}
            capturedPieces={playerColor === "w" ? blackCaptured : whiteCaptured}
            scoreAdvantage={playerColor === "w" ? blackAdvantage : whiteAdvantage}
            onClick={(!loadedBlackPlayer && botPersonality.name === "Black Pawn" && !isOnlineMatch && !isBotOpponent) ? handleResetGame : undefined}
            theme={theme}
          />

          {/* Magnus AI Trainer/Coach Speaks (Solo Mode Only with animated slide entry above board) */}
          <AnimatePresence>
            {isMagnusCoachOpen && !isOnlineMatch && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, height: "auto", scale: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full flex justify-center overflow-hidden z-25 relative"
              >
                <MagnusTrainer 
                  history={history}
                  viewIndex={viewIndex}
                  fens={fens}
                  evaluation={evaluation}
                  opening={opening}
                  isOnlineMatch={isOnlineMatch}
                  theme={theme}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Board and Eval */}
          <div className="flex items-stretch w-full gap-2 lg:gap-4 shrink-0 mx-auto justify-center min-h-[300px] relative z-10">
            <EvaluationBar 
              evaluation={evaluation} 
              turn={game.turn() as "w" | "b"} 
              isFlipped={playerColor === "b"}
            />
            <div className={cn(
              "shrink-0 w-full flex-1 rounded shadow-2xl relative z-10 transition-all duration-300 ease-out", 
              theme === "black" ? "bg-[#312e2b]" : "bg-white/90 border border-black/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)]",
              isMagnusCoachOpen && !isOnlineMatch ? "max-w-[680px]" : "max-w-[780px]"
            )}>
              <Chessboard
                options={{
                  id: "MainBoard",
                  position: fen,
                  boardOrientation: playerColor === "w" ? "white" : "black",
                  darkSquareStyle: { backgroundColor: BOARD_THEMES.find(t => t.id === boardTheme)?.dark || "#b58863", transition: "background-color 0.2s ease" },
                  lightSquareStyle: { backgroundColor: BOARD_THEMES.find(t => t.id === boardTheme)?.light || "#f0d9b5", transition: "background-color 0.2s ease" },
                  squareStyle: { transition: "background-color 0.2s ease, background-image 0.2s ease" },
                  squareStyles: customSquareStyles,
                  animationDurationInMs: 300,
                  pieces: getCustomPieceRenderers(pieceTheme),
                  draggingPieceStyle: {
                    transform: "scale(1.1)",
                    opacity: "0.9",
                    filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.3))",
                    transition: "none"
                  },
                  arrows: aiArrows.map(([startSquare, endSquare, color]) => ({
                    startSquare,
                    endSquare,
                    color
                  })),
                  onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
                    if (!targetSquare) return false;
                    return handlePieceDrop(sourceSquare, targetSquare, piece.pieceType);
                  },
                  onPieceDrag: ({ isSparePiece, piece, square }) => {
                    if (isSparePiece || !square) return;
                    handlePieceDragBegin(piece.pieceType, square);
                  },
                  onSquareClick: ({ square }) => {
                    handleSquareClick(square);
                  },
                  onSquareRightClick: ({ square }) => {
                    handleSquareRightClick(square);
                  },
                  canDragPiece: ({ piece }) => {
                    if (isGameOver) return false;
                    
                    const isBotGame = botPersonality.name !== 'Black Pawn';
                    if (isBotGame) {
                      return turn === playerColor && piece.pieceType[0] === playerColor;
                    }
                    
                    return piece.pieceType[0] === turn;
                  }
                }}
              />

              {/* Custom Promotion Choice Overlay */}
              {pendingPromotion && (() => {
                const toSquare = pendingPromotion.to;
                const fileIndex = toSquare.charCodeAt(0) - 'a'.charCodeAt(0);
                const isFlipped = playerColor === "b";
                const colIndex = isFlipped ? 7 - fileIndex : fileIndex;
                const startColIndex = Math.max(0, Math.min(4, colIndex - 1));
                const leftPercent = startColIndex * 12.5;
                const topPercent = 12.5; // row index 1 (directly below row index 0)
                const arrowOffsetPercent = ((colIndex - startColIndex) * 25) + 12.5;

                return (
                  <div 
                    id="promotion-overlay" 
                    onClick={() => {
                      setPendingPromotion(null);
                      setSelectedSquare(null);
                      setPossibleMoves([]);
                    }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-45 rounded"
                  >
                    <div 
                      id="promotion-menu"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bg-[#1e1a17]/95 border-2 border-amber-500/50 p-1.5 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 flex flex-col justify-center transition-all duration-300"
                      style={{
                        top: `${topPercent}%`,
                        left: `${leftPercent}%`,
                        width: '50%',
                      }}
                    >
                      {/* Pointer Triangle Arrow pointing directly to the promoting square above it */}
                      <div 
                        className="absolute -top-[10px] h-4 w-4 rotate-45 bg-[#1e1a17] border-l-2 border-t-2 border-amber-500/50"
                        style={{
                          left: `calc(${arrowOffsetPercent}% - 8px)`
                        }}
                      />
                      
                      <div className="grid grid-cols-4 gap-1 w-full h-full relative z-10">
                        {promotionChoices.map((choice) => (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => handleSelectPromotion(choice.id)}
                            className="flex flex-col items-center justify-center p-1 rounded-lg border border-white/5 bg-white/5 hover:bg-amber-500/15 hover:border-amber-400/40 text-white transition-all duration-150 active:scale-95 group cursor-pointer aspect-square relative pb-4 pt-1"
                          >
                            <img 
                              src={`https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${playerColor === 'w' ? 'w' : 'b'}${choice.id}.png`}
                              alt={choice.name}
                              referrerPolicy="no-referrer"
                              className="w-[85%] h-[85%] object-contain group-hover:scale-110 transition-transform duration-150"
                            />
                            <span className="text-[7px] md:text-[9px] font-black text-gray-400 group-hover:text-amber-200 absolute bottom-1 uppercase tracking-wider select-none">
                              {choice.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Custom Game Over Overlay */}
              {isGameOver && showGameOverScreen && (
                <div id="game-over-overlay" className="absolute inset-0 bg-black/60 backdrop-blur-md z-45 flex flex-col items-center justify-center p-4 rounded">
                  <div className="bg-zinc-900/90 border border-white/10 p-6 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] text-center max-w-sm w-full mx-auto relative overflow-hidden backdrop-blur-2xl">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-white to-blue-500 animate-pulse" />
                    
                    <h3 className="text-xl font-black tracking-tight text-white uppercase mt-2 mb-1 select-none drop-shadow-lg">
                      {getGameResult(gameOverReason).title}
                    </h3>
                    
                    <p className="text-neutral-400 text-[11px] font-bold mb-6 px-1 leading-relaxed uppercase tracking-widest">
                      {getGameResult(gameOverReason).description}
                    </p>

                    {/* Move Analysis Stats */}
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        >
                          <BrainCircuit className="w-8 h-8 text-emerald-500" />
                        </motion.div>
                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] animate-pulse">
                          Stockfish is analyzing...
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
                        <p className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">
                          Move {analysisProgress.current} of {analysisProgress.total}
                        </p>
                      </div>
                    ) : moveAnalysis && (
                      <div className="space-y-6 mb-8">
                        {/* Accuracy Bar */}
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
                        {/* White Column */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2 mb-2 pb-1 border-b border-white/10">
                            <div className="w-3 h-3 rounded-sm bg-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-tighter">White</span>
                          </div>
                          <AnalysisStat label="Brilliant" count={moveAnalysis.white.brilliant} color="text-cyan-400" icon="!!" />
                          <AnalysisStat label="Great" count={moveAnalysis.white.great} color="text-amber-400" icon="!" />
                          <AnalysisStat label="Best" count={moveAnalysis.white.best} color="text-emerald-400" icon="★" />
                          <AnalysisStat label="Book" count={moveAnalysis.white.book} color="text-blue-400" icon="📖" />
                          <AnalysisStat label="Mistakes" count={moveAnalysis.white.mistake} color="text-orange-400" icon="?" />
                          <AnalysisStat label="Blunders" count={moveAnalysis.white.blunder} color="text-red-500" icon="??" />
                        </div>

                        {/* Black Column */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2 mb-2 pb-1 border-b border-white/10">
                            <div className="w-3 h-3 rounded-sm bg-zinc-700" />
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-tighter">Black</span>
                          </div>
                          <AnalysisStat label="Brilliant" count={moveAnalysis.black.brilliant} color="text-cyan-400" icon="!!" />
                          <AnalysisStat label="Great" count={moveAnalysis.black.great} color="text-amber-400" icon="!" />
                          <AnalysisStat label="Best" count={moveAnalysis.black.best} color="text-emerald-400" icon="★" />
                          <AnalysisStat label="Book" count={moveAnalysis.black.book} color="text-blue-400" icon="📖" />
                          <AnalysisStat label="Mistakes" count={moveAnalysis.black.mistake} color="text-orange-400" icon="?" />
                          <AnalysisStat label="Blunders" count={moveAnalysis.black.blunder} color="text-red-500" icon="??" />
                        </div>
                      </div>
                    </div>
                  )}

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          playSound("click");
                          handleResetGame();
                        }}
                        className="w-full py-3.5 bg-white hover:bg-neutral-100 text-black font-black rounded-2xl text-xs transition-all duration-300 shadow-xl active:scale-[0.98] cursor-pointer uppercase tracking-widest"
                      >
                        Play Again
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          playSound("click");
                          setShowGameOverScreen(false);
                        }}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-neutral-400 hover:text-white transition-all text-[10px] font-black rounded-xl cursor-pointer uppercase tracking-[0.2em]"
                      >
                        Review Game
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mini result recover badge */}
              {isGameOver && !showGameOverScreen && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setShowGameOverScreen(true);
                    }}
                    className="px-4 py-1.5 bg-white/95 hover:bg-white text-black text-[10px] font-black uppercase tracking-wider transition-all shadow-lg border border-white/20 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    🏆 See Result
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls on Main Screen when Panels are closed */}
          {!isPanelsExpanded && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-1 mb-1 bg-black/25 backdrop-blur-xl py-2 px-4 rounded-xl border border-white/5 shadow-2xl w-full max-w-[540px] mx-auto transition-all duration-300">
              {/* Centered: Navigation Undos/Redo */}
              <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    playSound("click");
                    undoMove();
                  }}
                  disabled={viewIndex <= 0}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center",
                    viewIndex > 0 
                      ? "bg-white/10 hover:bg-white/20 text-white cursor-pointer border border-white/10 active:scale-90" 
                      : "text-gray-600 cursor-not-allowed opacity-40 border border-transparent"
                  )}
                  title="Previous Move"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="text-xs font-mono text-gray-300 select-none flex items-center gap-1.5 px-3 py-1 font-semibold bg-black/40 rounded-md border border-white/5">
                  <span className="text-white font-extrabold tracking-wider text-[10px]">MOVE</span>
                  <span className="text-white font-bold">{viewIndex}</span>
                  <span className="text-gray-500">/</span>
                  <span>{history.length}</span>
                </div>

                <button
                  onClick={() => {
                    playSound("click");
                    redoMove();
                  }}
                  disabled={viewIndex >= history.length}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center",
                    viewIndex < history.length 
                      ? "bg-white/10 hover:bg-white/20 text-white cursor-pointer border border-white/10 active:scale-90" 
                      : "text-gray-600 cursor-not-allowed opacity-40 border border-transparent"
                  )}
                  title="Next Move"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* User Profile (Bottom) */}
          <PlayerProfile
            name={isOnlineMatch ? playerName : (loadedWhitePlayer ? loadedWhitePlayer.name : playerName)}
            rating={isOnlineMatch ? 1200 : (loadedWhitePlayer ? loadedWhitePlayer.rating : 1200)}
            avatarUrl={playerAvatar}
            color={playerColor}
            isBottom
            isTurn={turn === playerColor}
            timeRemainingSeconds={timers[playerColor === "w" ? "white" : "black"]}
            capturedPieces={playerColor === "w" ? whiteCaptured : blackCaptured}
            scoreAdvantage={playerColor === "w" ? whiteAdvantage : blackAdvantage}
            theme={theme}
          />
        </div>
      </div>

      {/* Squeezed and Packed Panels Area on the right side */}
      {!isOnlineMatch && !isChallengeMatch && (
        <div className={cn(
          "transition-all duration-500 ease-in-out flex flex-col gap-4 xl:h-full pb-10 origin-right overflow-hidden shrink-0",
          (isPanelsExpanded) 
            ? "flex-grow xl:flex-[1] min-w-[320px] max-w-[780px] w-full opacity-100 translate-x-0 scale-100 pointer-events-auto xl:overflow-y-auto xl:pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
            : "w-0 xl:w-0 xl:min-w-0 max-w-0 opacity-0 translate-x-12 scale-95 pointer-events-none pr-0 select-none xl:m-0 xl:p-0"
        )}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4 w-full items-stretch shrink-0">
            {/* Squeezed Moves list and clock mechanics */}
            {!isOnlineMatch && (
              <div className="flex flex-col h-[460px] min-h-[400px]">
                <GameSidebar
                  history={history}
                  isGameOver={isGameOver}
                  gameOverReason={gameOverReason}
                  onResign={() => resign(playerColor)}
                  onDraw={claimDraw}
                  onNewGame={handleResetGame}
                  onUndo={undoMove}
                  onRedo={redoMove}
                  viewIndex={viewIndex}
                  opening={opening || undefined}
                  bookMoves={bookMoves}
                  playerName={playerName}
                  setPlayerName={() => {}}
                  theme={theme}
                />
              </div>
            )}

            {/* Squeezed AI Advisor Chat */}
            {!isOnlineMatch && (
              <div className="flex flex-col h-[460px] min-h-[400px]">
                <AIAssistant 
                  isActive={true} 
                  onCommand={handleAICommand} 
                  isOnlineMatch={isOnlineMatch}
                  fen={fen}
                  history={history}
                  theme={theme}
                />
              </div>
            )}
          </div>

          {/* Database, Live Feedback & Analytics dynamically packed side-by-side in a responsive grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-4 w-full items-start shrink-0">
            <LiveFeedbackPanel 
              history={history}
              viewIndex={viewIndex}
              fens={fens}
              evaluation={evaluation}
              isGameOver={isGameOver}
              opening={opening}
              theme={theme}
            />
            <OpeningDatabase 
              onLoadMoveList={handleLoadMoveList}
              onLoadPGN={handleLoadPGN}
              onSetAiArrows={setAiArrows}
              theme={theme}
            />
            <div className="w-full md:col-span-2 lg:col-span-1 xl:col-span-2">
              <GameAnalytics 
                fen={fen} 
                evaluation={evaluation} 
                moveCount={history.length}
                theme={theme}
              />
            </div>
          </div>
        </div>
      )}

      {/* Online Match Chat and Game Controls Card */}
      {isOnlineMatch && (
        <div className="flex flex-col gap-4 w-full max-w-[400px] xl:h-full shrink-0">
          <div className="flex flex-col h-[520px] xl:h-[620px] bg-black/35 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-4 overflow-hidden">
            {/* Header / Room Info */}
            <div className="border-b border-white/10 pb-3 mb-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">LIVE MATCH</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">ROOM: {roomId}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                Live Lobby
              </span>
            </div>

            {/* Draw Offer Banner inside chat if received */}
            {drawOfferReceived && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mb-3 flex flex-col gap-2 select-none">
                <span className="text-xs font-bold text-amber-300">🤝 Draw Offer Received</span>
                <p className="text-[10px] text-gray-300">Your opponent is offering a draw.</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => {
                      if (socket) socket.emit("draw-response", { roomId, accepted: true });
                      setDrawOfferReceived(false);
                    }}
                    className="py-1 bg-amber-500 text-black text-[10px] font-black uppercase rounded-lg active:scale-95 transition-all cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      if (socket) socket.emit("draw-response", { roomId, accepted: false });
                      setDrawOfferReceived(false);
                    }}
                    className="py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase rounded-lg active:scale-95 transition-all cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* Chat message logs */}
            <div className="flex-grow overflow-y-auto mb-3 space-y-2.5 pr-1 scrollbar-thin flex flex-col justify-end">
              <div className="space-y-2.5">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 text-[11px] font-semibold leading-relaxed">
                    Welcome to the chat room! You can speak with your opponent here, and use the draw/resign buttons below.
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isSystem = msg.senderName === "System";
                    return (
                      <div 
                        key={idx}
                        className={cn(
                          "max-w-[85%] rounded-xl p-2.5 text-xs",
                          isSystem
                            ? "bg-amber-500/10 border border-amber-500/10 text-amber-300 font-bold mx-auto text-center w-full"
                            : msg.senderName === playerName
                              ? "bg-emerald-500/10 border border-emerald-500/10 text-emerald-300 ml-auto text-right"
                              : "bg-white/5 border border-white/5 text-gray-200"
                        )}
                      >
                        {!isSystem && (
                          <div className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-0.5">
                            {msg.senderName}
                          </div>
                        )}
                        <p className="leading-relaxed font-medium break-words">{msg.text}</p>
                        {!isSystem && (
                          <span className="text-[8px] text-gray-500 block mt-0.5">{msg.time}</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat send input */}
            <div className="flex gap-1.5 border-t border-white/10 pt-3">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="bg-black/40 text-xs text-white px-3 py-2 rounded-xl border border-white/10 focus:border-white/20 outline-none flex-grow"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && chatInput.trim() && socket) {
                    socket.emit("send-chat", {
                      roomId,
                      text: chatInput.trim(),
                      senderName: playerName
                    });
                    setChatInput("");
                  }
                }}
              />
              <button
                onClick={() => {
                  if (chatInput.trim() && socket) {
                    socket.emit("send-chat", {
                      roomId,
                      text: chatInput.trim(),
                      senderName: playerName
                    });
                    setChatInput("");
                  }
                }}
                className="px-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                Send
              </button>
            </div>

            {/* Multiplayer action buttons */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 shrink-0">
              <button
                onClick={() => {
                  if (!window.confirm("Are you sure you want to resign the match?")) return;
                  if (socket && isOnlineMatch) {
                    socket.emit("resign-match", { roomId, playerColor: initialColor });
                  } else {
                    resign(initialColor);
                  }
                }}
                className="py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                title="Resign Match"
              >
                <Flag size={12} /> Resign
              </button>
              
              <button
                onClick={() => {
                  if (!window.confirm("Do you want to offer a draw to your opponent?")) return;
                  if (socket && isOnlineMatch) {
                    socket.emit("offer-draw", { roomId, senderColor: initialColor });
                    setChatMessages(prev => [
                      ...prev,
                      {
                        senderName: "System",
                        text: "Draw offer sent to opponent.",
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ]);
                  } else {
                    claimDraw();
                  }
                }}
                className="py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                title="Offer Draw"
              >
                <Handshake size={12} /> Offer Draw
              </button>

              <button
                onClick={() => {
                  if (!window.confirm("Do you want to leave the match and return to the lobby?")) return;
                  if (onLeaveGame) onLeaveGame();
                }}
                className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                title="Leave Match & Return to Lobby"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
