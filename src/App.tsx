/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, memo } from "react";
import ChessGame from "./components/ChessGame";
import CageFighting from "./components/CageFighting";
import SpotifyPlayer from "./components/SpotifyPlayer";
import { LandingPage } from "./components/LandingPage";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, handleFirestoreError, OperationType } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { CHALLENGES, Challenge } from "./lib/challenges";
import { playSound } from "./lib/audio";
import { Play, Sparkles, User, Shield, ArrowRight, Flower, Edit2, Check, X, Camera, BadgeCheck, Music, Copy, Plus, Users, Hourglass, AlertCircle, ArrowLeft, LogOut, Trophy, Swords, Bot } from "lucide-react";
import { cn } from "./lib/utils";

const AVAILABLE_AVATARS = [
  { id: "wp", name: "Pawn", url: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png" },
  { id: "wn", name: "Knight", url: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png" },
  { id: "wb", name: "Bishop", url: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png" },
  { id: "wr", name: "Rook", url: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png" },
  { id: "wq", name: "Queen", url: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png" },
  { id: "wk", name: "King", url: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png" }
];

// Memoized background component to prevent re-randomization on every clock tick
const FloatingBackground = memo(() => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
      {Array.from({ length: 60 }).map((_, i) => {
        const piece = AVAILABLE_AVATARS[i % AVAILABLE_AVATARS.length];
        return (
          <motion.img
            key={i}
            src={piece.url}
            className="absolute w-20 h-20 md:w-32 md:h-32"
            initial={{ 
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0,
              rotate: Math.random() * 360 
            }}
            animate={{ 
              x: [
                Math.random() * 1000 - 500, 
                Math.random() * 1000 - 500, 
                Math.random() * 1000 - 500
              ],
              y: [
                Math.random() * 1000 - 500, 
                Math.random() * 1000 - 500, 
                Math.random() * 1000 - 500
              ],
              opacity: [0, 0.7, 0],
              rotate: [0, 360, 720]
            }}
            transition={{ 
              duration: 30 + Math.random() * 60, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
        );
      })}
    </div>
  );
});

export default function App() {
  const [view, setView] = useState<"landing" | "lobby" | "game" | "cage-fighting">("landing");
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("playerName") || "You");
  const [playerAvatar, setPlayerAvatar] = useState(() => localStorage.getItem("playerAvatar") || "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [bgGif, setBgGif] = useState(() => {
    const saved = localStorage.getItem("chesster_bg_gif");
    if (!saved || saved === "/src/assets/images/katana_forest_1782483373994.jpg" || saved.includes("media0.giphy.com")) {
      return "https://i.giphy.com/1CTYzBtL77D767n6vD.gif";
    }
    return saved;
  });
  const [isSpotifyOpen, setIsSpotifyOpen] = useState(false);
  const [theme, setTheme] = useState<"black" | "white">(() => (localStorage.getItem("chesster_theme") as "black" | "white") || "black");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPlayerName(data.displayName || currentUser.displayName || "Chess Player");
        setPlayerAvatar(data.avatar || currentUser.photoURL || AVAILABLE_AVATARS[0].url);
      }
    });

    return () => unsubscribeProfile();
  }, [currentUser]);

  const CHESS_TIPS = [
    "Control the center with your pawns and pieces.",
    "Develop your minor pieces early.",
    "Don't move the same piece twice in the opening.",
    "Castle early to keep your king safe.",
    "Look for 'Checks, Captures, and Threats' on every move.",
    "A knight on the rim is dim.",
    "Bishops are generally better in open positions.",
    "Knights are powerful in closed positions.",
    "Passed pawns must be pushed!",
    "Rooks belong on open files.",
    "Always check for skewers, forks, and pins.",
    "Stalemate is a draw.",
    "The 'scholar's mate' is a common trap.",
    "Don't bring your queen out too early.",
    "Connect your rooks by clearing the back rank.",
    "Avoid doubled pawns when possible.",
    "Keep your king active in the endgame.",
    "A pawn majority on one side is a strong asset.",
    "Try to create an 'isolated' pawn for your opponent.",
    "Use your king as an attacker in pawn endgames.",
    "Checkmate is the ultimate goal, not just capturing pieces.",
    "Learn the basic endgame checkmates (K+Q, K+R).",
    "Patience is key in positional chess.",
    "Don't sacrifice material without a clear plan.",
    "Analyze your games to learn from mistakes.",
    "The center squares are d4, d5, e4, and e5.",
    "Fianchetto your bishops for long-range control.",
    "An outpost is a square protected by a pawn.",
    "Pawn structure determines the character of the game.",
    "Space is a vital advantage in chess.",
    "Tempo is the speed of your development.",
    "A 'Blunder' is a move that loses material or the game.",
    "The 'French Defense' is a solid choice for Black.",
    "The 'Sicilian Defense' is highly aggressive.",
    "Study tactical motifs to improve vision.",
    "Understand the 'Opposition' in king endgames.",
    "Z Zugzwang: when any move you make weakens your position.",
    "A 'Zwischenzug' is an intermediate move.",
    "The 'Lucena Position' is critical for rook endgames.",
    "The 'Philidor Position' is a key defensive resource.",
    "Don't block your own pieces with pawns.",
    "The 'Queen's Gambit' is a strategic opening.",
    "Study the games of the Grandmasters.",
    "Stay calm even under heavy pressure.",
    "Coordinate your pieces for maximum efficiency.",
    "The 'Evans Gambit' leads to wild complications.",
    "Always look for your opponent's threats.",
    "A 'Pin' is when a piece can't move without exposing a more valuable one.",
    "A 'Fork' attacks two pieces at once.",
    "A 'Skewer' is a reverse pin.",
    "Protect your weak squares.",
    "Create 'luft' for your king to avoid back-rank mate.",
    "A 'Battery' is two or more pieces attacking along the same line.",
    "Exchange pieces when you are ahead in material.",
    "Avoid exchanges when you are behind in material.",
    "The 'Greek Gift' sacrifice is a classic mating pattern.",
    "A 'Pawn Storm' is used to attack the enemy king.",
    "The 'Italian Game' is perfect for beginners.",
    "The 'Ruy Lopez' is one of the deepest openings.",
    "The 'King's Indian Defense' is a powerful counter-attack.",
    "Understand the value of the 'Bishop Pair'.",
    "Don't get greedy; safety first.",
    "An 'Overloaded' piece protects too many things.",
    "Exploit 'Hanging' pieces (undefended).",
    "A 'Discovered Attack' is revealed by moving another piece.",
    "Checkmate with two bishops requires precision.",
    "The 'Caro-Kann' is the solidest of defenses.",
    "Focus on one move at a time.",
    "Don't resign too early; miracles happen.",
    "A 'Windmill' is a series of discovered checks.",
    "The 'Boden's Mate' uses two criss-crossing bishops.",
    "The 'Smothered Mate' is delivered by a knight.",
    "Understand 'Pawn Chains'.",
    "A 'Bad Bishop' is restricted by its own pawns.",
    "Improve your worst-placed piece.",
    "The 'Opposition' can be direct or distant.",
    "Master the 'Rule of the Square' in pawn races.",
    "Keep your concentration until the very end.",
    "A 'Stonewall' setup is hard to break down.",
    "The 'Nimzo-Indian' is a modern masterpiece.",
    "Learn the 'Fried Liver' attack patterns.",
    "Identify 'Weak Squares' in the enemy camp.",
    "A 'Backward Pawn' is a permanent weakness.",
    "Keep your rooks behind your passed pawns.",
    "The '7th Rank' is the natural home for rooks.",
    "Double your rooks on an open file.",
    "A 'Minority Attack' aims to create pawn weaknesses.",
    "Understand the 'Typical Plans' of your openings.",
    "The 'London System' is very reliable.",
    "Be careful with 'Ghost' threats.",
    "Calculate accurately, don't just guess.",
    "The 'Endgame' begins when queens are traded.",
    "Active defense is better than passive sitting.",
    "A 'Sacrifice' is an investment for future gains.",
    "The 'Center Counter' (Scandinavian) is direct.",
    "Knight on f3/f6 is usually a great defender.",
    "Don't fear ghosts, but respect threats.",
    "A 'Quiet Move' can be the most deadly.",
    "Chess is 99% tactics - Richard Teichmann.",
    "The board has 64 squares; use them all.",
    "Time management is part of the skill.",
    "Practice makes perfect.",
    "Enjoy the beauty of the game!",
    "Never stop learning.",
    "A 'Prophylactic Move' stops the opponent's plan.",
    "The 'Benko Gambit' is a strategic pawn sacrifice.",
    "Understand 'Critical Moments' in the game.",
    "Don't rush; think before you touch.",
    "Respect your opponent, but play with confidence.",
    "A 'Swindle' is a sneaky trap in a lost position.",
    "Keep your emotions in check.",
    "Chess is a war on a board.",
    "Victory is for the most persistent.",
    "Every pawn is a potential queen."
  ];

  // Load native custom cursor
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png";
    img.onload = () => {
      const generateCursor = (size: number, scale: number) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";
        ctx.translate(size / 2, size / 2);
        ctx.rotate(-15 * Math.PI / 180);
        ctx.drawImage(img, (-size * scale) / 2, (-size * scale) / 2, size * scale, size * scale);
        return canvas.toDataURL("image/png");
      };

      const defaultCursor = generateCursor(32, 1);
      const pointerCursor = generateCursor(38, 1);

      const styleId = "custom-cursor-styles";
      let styleEl = document.getElementById(styleId) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }

      styleEl.innerHTML = `
        html, body { 
          cursor: url(${defaultCursor}) 4 4, auto !important; 
        }
        a, button, [role="button"], .cursor-pointer, [class*="cursor-pointer"], select, label { 
          cursor: url(${pointerCursor}) 4 4, pointer !important; 
        }
        input, textarea, [contenteditable="true"] { 
          cursor: text !important; 
        }
      `;
    };
  }, []);

  // Multiplayer & Challenge Match States
  const [multiplayerSocket, setMultiplayerSocket] = useState<any>(null);
  const [multiplayerRoomId, setMultiplayerRoomId] = useState<string | null>(null);
  const [multiplayerColor, setMultiplayerColor] = useState<"w" | "b" | null>(null);
  const [multiplayerChallenges, setMultiplayerChallenges] = useState<string[]>([]);
  const [activeChallengeModal, setActiveChallengeModal] = useState<Challenge | null>(null);
  const [opponentInfo, setOpponentInfo] = useState<{ name: string; avatar: string; isBot?: boolean } | null>(null);
  const [multiplayerView, setMultiplayerView] = useState<"none" | "setup">("none");
  const [multiplayerTime, setMultiplayerTime] = useState<number>(600); // 10 minutes default
  const [preferColor, setPreferColor] = useState<"w" | "b" | "random">("random");
  const [selectedBotEngine, setSelectedBotEngine] = useState<{ id: string; name: string; elo: number; icon: string }>({
    id: "Stockfish 1600",
    name: "Stockfish 1600",
    elo: 1600,
    icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png"
  });

  const enterMultiplayerLobby = () => {
    playSound("click");
    setMultiplayerView("setup");
  };

  const startStockfishChallengeMatch = () => {
    playSound("click");
    let assignedColor: "w" | "b" = "w";
    if (preferColor === "random") {
      assignedColor = Math.random() < 0.5 ? "w" : "b";
    } else {
      assignedColor = preferColor;
    }
    
    setMultiplayerColor(assignedColor);
    setOpponentInfo({
      name: selectedBotEngine.name,
      avatar: selectedBotEngine.icon,
      isBot: true
    });
    setMultiplayerRoomId(null);
    setMultiplayerSocket(null);
    setMultiplayerView("none");
    setView("game");
  };

  const exitMultiplayer = () => {
    setMultiplayerRoomId(null);
    setMultiplayerColor(null);
    setOpponentInfo(null);
    setMultiplayerView("none");
    setView("lobby");
  };

  useEffect(() => {
    localStorage.setItem("playerName", playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem("playerAvatar", playerAvatar);
  }, [playerAvatar]);

  useEffect(() => {
    document.documentElement.style.setProperty("--bg-gif", `url('${bgGif}')`);
    localStorage.setItem("chesster_bg_gif", bgGif);
  }, [bgGif]);

  useEffect(() => {
    localStorage.setItem("chesster_theme", theme);
    if (theme === "white") {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
  }, [theme]);

  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      setPlayerName(trimmed);
      setIsEditingName(false);
    }
  };

  const handleSelectAvatar = (url: string) => {
    setPlayerAvatar(url);
  };

  if (view === "landing") {
    return (
      <LandingPage
        onLoginSuccess={(name, avatarUrl) => {
          setPlayerName(name);
          setPlayerAvatar(avatarUrl);
          setView("lobby");
        }}
        defaultPlayerName={playerName === "You" ? "" : playerName}
        defaultPlayerAvatar={playerAvatar}
      />
    );
  }

  return (
    <div className="min-h-screen xl:h-screen xl:max-h-screen text-gray-100 font-sans selection:bg-white/10 relative overflow-hidden bg-transparent flex flex-col">
      {/* Semi-transparent dark overlay to keep chessboard and controls high contrast */}
      <div className="cosmic-overlay" />

      {/* Header Bar */}
      {view !== "landing" && (
        <header className={cn(
          "relative z-20 w-full border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between shrink-0 transition-all duration-300",
          (view === "lobby" || view === "cage-fighting") ? "h-18 sm:h-20 px-8 sm:px-12" : "h-14 px-6"
        )}>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex items-center gap-2 select-none cursor-pointer group" 
            onMouseEnter={() => playSound("notification")}
            onClick={() => {
            playSound("click");
            if (multiplayerSocket || multiplayerView !== "none") {
              exitMultiplayer();
            } else {
              setView("lobby");
            }
            setIsSpotifyOpen(false);
          }}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white transition-all duration-300 overflow-hidden",
                view === "lobby" ? "w-9 h-9" : "w-7 h-7"
              )}>
                <img 
                  src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png" 
                  alt=""
                  className={cn(
                    "object-contain transition-transform duration-300 group-hover:rotate-12",
                    view === "lobby" ? "w-7 h-7" : "w-5 h-5"
                  )}
                />
              </div>
              <span className={cn(
                "font-extrabold tracking-wider bg-gradient-to-r from-white via-neutral-200 to-zinc-400 bg-clip-text text-transparent transition-all duration-300",
                view === "lobby" ? "text-base sm:text-lg" : "text-sm"
              )}>
                CHESSTER
              </span>
            </div>
          </motion.div>

          {/* Profile and Logout Buttons in top right corner */}
          <div className="absolute top-4 right-4 flex items-center gap-3 z-30">
            {view !== "landing" && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playSound("click");
                    setIsSpotifyOpen(!isSpotifyOpen);
                  }}
                  onMouseEnter={() => playSound("notification")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer text-[10px] font-black uppercase tracking-[0.2em] shadow-lg",
                    isSpotifyOpen 
                      ? (theme === "black" ? "bg-white text-black border border-white" : "bg-black text-white border border-black")
                      : (theme === "black" 
                          ? "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/25 hover:text-white" 
                          : "bg-black/5 border border-black/10 text-gray-600 hover:bg-black/10 hover:border-black/25 hover:text-black")
                  )}
                  title="Music Player"
                >
                  <Music size={12} className={cn(isSpotifyOpen && "animate-pulse")} />
                  <span className="hidden sm:inline">{isSpotifyOpen ? "CLOSE" : "MUSIC"}</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playSound("click");
                    auth.signOut().catch(err => console.error("Firebase SignOut error:", err));
                    setView("landing");
                  }}
                  onMouseEnter={() => playSound("notification")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 cursor-pointer text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-black/40",
                    theme === "black"
                      ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 text-red-400"
                      : "bg-red-50/80 border-red-200 hover:bg-red-100 hover:border-red-300 text-red-600"
                  )}
                  title="Sign Out"
                >
                  <LogOut size={12} />
                  <span className="hidden sm:inline">Sign Out</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playSound("click");
                    setIsProfileOpen(!isProfileOpen);
                  }}
                  onMouseEnter={() => playSound("notification")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer text-xs font-bold shadow-md shadow-black/20",
                    theme === "black"
                      ? "bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/10 text-gray-300 hover:text-white"
                      : "bg-black/5 border border-black/10 hover:border-black/25 hover:bg-black/10 text-gray-600 hover:text-black"
                  )}
                >
                  <img src={playerAvatar} alt="Avatar" className="w-5 h-5 object-contain" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[11px] truncate max-w-[80px]">{playerName}</span>
                  </div>
                  <User size={13} className="opacity-70" />
                </motion.button>
              </>
            )}
          </div>
        </header>
      )}

      {/* Main Content Wrapper */}
      <div className="relative z-10 w-full flex-grow xl:h-[calc(100vh-104px)] xl:max-h-[calc(100vh-104px)] xl:overflow-hidden">
        <AnimatePresence>
          {/* Animated Slide-out Profile Panel */}
          {isProfileOpen && view === "lobby" && (
            <>
              {/* Overlay Backdrop to dismiss on click */}
              <div 
                className="absolute inset-0 bg-transparent z-25 cursor-default"
                onClick={() => setIsProfileOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, x: 100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={cn(
                  "absolute top-4 right-4 z-30 w-[320px] backdrop-blur-3xl border rounded-2xl shadow-2xl p-6 select-none flex flex-col space-y-4",
                  theme === "black" 
                    ? "bg-black/75 border-white/10 text-white" 
                    : "bg-white/90 border-black/10 text-black shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
                )}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-2xl rounded-full pointer-events-none" />

                <div className={cn("flex items-center justify-between border-b pb-3", theme === "black" ? "border-white/5" : "border-black/5")}>
                  <span className={cn(
                    "text-xs font-black tracking-widest uppercase",
                    theme === "black" ? "bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent" : "text-black"
                  )}>PLAYER PROFILE</span>
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-mono flex items-center gap-1", theme === "black" ? "text-white" : "text-black")}>
                        <Hourglass size={10} className="text-yellow-500" />
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <div className={cn("w-[1px] h-2 mx-1", theme === "black" ? "bg-white/10" : "bg-black/10")} />
                      <span className={cn("text-[10px] font-mono flex items-center gap-1", theme === "black" ? "text-white" : "text-black")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full animate-ping", theme === "black" ? "bg-white" : "bg-black")} />
                        ONLINE
                      </span>
                    </div>
                  </div>
                    <button 
                      onClick={() => setIsProfileOpen(false)}
                      className={cn(
                        "transition-colors cursor-pointer p-0.5 rounded",
                        theme === "black" ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-black hover:bg-black/5"
                      )}
                    >
                      <X size={15} />
                    </button>
                  </div>

                {/* Current Avatar and Name */}
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  theme === "black" ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"
                )}>
                  <div className="relative group shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-xl border flex items-center justify-center shadow-md",
                      theme === "black" ? "bg-white/10 border-white/20 text-white" : "bg-black/10 border-black/20 text-black"
                    )}>
                      <img src={playerAvatar} alt="Avatar" className="w-9 h-9 object-contain" />
                    </div>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 rounded-full p-0.5 border shadow",
                      theme === "black" ? "bg-white text-black border-black" : "bg-black text-white border-white"
                    )}>
                      <Camera size={8} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className={cn("text-[9px] font-bold uppercase tracking-wider", theme === "black" ? "text-gray-400" : "text-gray-500")}>Username</div>

                    {isEditingName ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          maxLength={15}
                          className={cn(
                            "text-xs font-semibold px-2 py-1 rounded border outline-none w-full max-w-[110px]",
                            theme === "black" ? "bg-black/50 text-white border-white/30" : "bg-white/50 text-black border-black/30"
                          )}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveName();
                            if (e.key === "Escape") setIsEditingName(false);
                          }}
                        />
                        <button
                          onClick={handleSaveName}
                          className="p-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400 hover:bg-emerald-500/30 transition-all cursor-pointer"
                          title="Save Name"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          className="p-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
                          title="Cancel"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-black truncate max-w-[120px]", theme === "black" ? "text-white" : "text-black")}>{playerName}</span>
                        <button
                          onClick={() => {
                            setTempName(playerName);
                            setIsEditingName(true);
                          }}
                          className={cn("p-1 transition-colors cursor-pointer shrink-0", theme === "black" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black")}
                          title="Edit Profile"
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Avatar Selector list */}
                <div className="space-y-1.5 pt-1">
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest pl-0.5", theme === "black" ? "text-gray-500" : "text-gray-600")}>CHOOSE PROFILE AVATAR</span>
                  <div className={cn("grid grid-cols-6 gap-1.5 border-t pt-2", theme === "black" ? "border-white/5" : "border-black/5")}>
                    {AVAILABLE_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        onClick={() => handleSelectAvatar(av.url)}
                        className={cn(
                          "aspect-square rounded-lg border flex items-center justify-center transition-all duration-300 relative group overflow-hidden cursor-pointer",
                          playerAvatar === av.url
                            ? (theme === "black" ? "border-white bg-white/5 shadow-inner" : "border-black bg-black/5 shadow-inner")
                            : (theme === "black" ? "border-white/5 hover:border-white/30 hover:bg-white/5" : "border-black/5 hover:border-black/30 hover:bg-black/5")
                        )}
                        title={av.name}
                      >
                        <img src={av.url} alt={av.name} className="w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-110" />
                        {playerAvatar === av.url && (
                          <div className={cn("absolute top-0 right-0 p-[0.5px] rounded-bl-md", theme === "black" ? "bg-white text-black" : "bg-black text-white")}>
                            <Check size={6} className="stroke-[3px] w-1.5 h-1.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logout Button */}
                <div className={cn("pt-2 border-t", theme === "black" ? "border-white/5" : "border-black/5")}>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      auth.signOut().catch(err => console.error("Firebase SignOut error:", err));
                      setView("landing");
                    }}
                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                  >
                    Sign Out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {view === "lobby" ? (
            <motion.div
              key="lobby-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/10 backdrop-blur-md overflow-y-auto"
            >
              {/* Ambient floating pieces - Full screen background */}
              <FloatingBackground />

              <div className="relative w-full max-w-xl mx-auto flex flex-col items-center justify-center min-h-[500px] shrink-0 z-10">
                <AnimatePresence mode="wait">
                  {!isSpotifyOpen && multiplayerView === "none" && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center mb-10 pointer-events-none select-none z-20"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        <div className="text-sm sm:text-lg font-black tracking-[0.5em] text-white uppercase mb-2">
                          {currentTime.toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                        <div className="text-4xl sm:text-6xl font-black tracking-tighter text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] leading-none">
                          {currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="text-xs sm:text-sm font-black tracking-[0.8em] text-white/30 uppercase mt-4 flex items-center justify-center gap-4">
                          <div className="w-12 h-[1px] bg-white/10" />
                          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          <div className="w-12 h-[1px] bg-white/10" />
                        </div>
                      </motion.div>

                      <motion.div
                        key="lobby-menu-card"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.05, y: -10 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 select-none relative w-full max-w-lg sm:max-w-2xl p-8 sm:p-12 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)]"
                      >
                        {/* Decorative corner accents for main menu */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/20 pointer-events-none rounded-tl-3xl" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/20 pointer-events-none rounded-br-3xl" />

                        {/* Solo Mode */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            playSound("click");
                            setView("game");
                          }}
                          onMouseEnter={() => playSound("notification")}
                          className="group flex flex-col items-center justify-center gap-2 p-2 transition-all duration-300 active:scale-95 cursor-pointer text-center"
                          title="Solo Mode"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all shadow-lg group-hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]">
                            <User size={28} className="transition-transform group-hover:scale-110" />
                          </div>
                          <span className="text-[10px] sm:text-xs font-black tracking-[0.2em] text-neutral-400 group-hover:text-white uppercase transition-colors mt-1">
                            Solo
                          </span>
                        </motion.button>

                        {/* Cage Fighting Mode */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            playSound("click");
                            setView("cage-fighting");
                          }}
                          onMouseEnter={() => playSound("notification")}
                          className="group flex flex-col items-center justify-center gap-2 p-2 transition-all duration-300 active:scale-95 cursor-pointer text-center"
                          title="Cage Fighting"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all shadow-lg group-hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]">
                            <Swords size={28} className="transition-transform group-hover:scale-110 text-white" />
                          </div>
                          <span className="text-[10px] sm:text-xs font-black tracking-[0.2em] text-neutral-400 group-hover:text-white uppercase transition-colors mt-1">
                            Cage Fight
                          </span>
                        </motion.button>

                        {/* Stockfish Challenge Match Mode */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            playSound("click");
                            enterMultiplayerLobby();
                          }}
                          onMouseEnter={() => playSound("notification")}
                          className="group flex flex-col items-center justify-center gap-2 p-2 transition-all duration-300 active:scale-95 cursor-pointer text-center"
                          title="Stockfish Challenge Match"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all shadow-lg group-hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]">
                            <Sparkles size={28} className="transition-transform group-hover:scale-110 text-white" />
                          </div>
                          <span className="text-[10px] sm:text-xs font-black tracking-[0.2em] text-neutral-400 group-hover:text-white uppercase transition-colors mt-1">
                            Challenges
                          </span>
                        </motion.button>
                      </motion.div>
                    </>
                  )}

                  {multiplayerView === "setup" && (
                    <motion.div
                      key="multiplayer-setup-card"
                      initial={{ opacity: 0, scale: 0.96, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: 15 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="max-w-4xl w-full bg-black/60 backdrop-blur-3xl border border-white/15 rounded-3xl shadow-[0_32px_90px_rgba(0,0,0,0.85)] p-6 sm:p-8 flex flex-col items-stretch text-left space-y-6 select-none relative overflow-hidden"
                    >
                      {/* Ambient background glow */}
                      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
                        <button 
                          onClick={() => {
                            playSound("click");
                            setMultiplayerView("none");
                          }}
                          onMouseEnter={() => playSound("notification")}
                          className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-all cursor-pointer group"
                        >
                          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Menu
                        </button>
                        <span className="text-xs font-black tracking-[0.4em] text-white uppercase flex items-center gap-2 drop-shadow-md">
                          <Sparkles size={14} className="text-white" />
                          STOCKFISH CHALLENGE MATCH
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
                        {/* Left 7 Cols: Challenges Selection */}
                        <div className="lg:col-span-7 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                              <Sparkles size={14} className="text-white/80" /> Select Challenge Modifiers
                            </h3>
                            <span className="text-[10px] font-mono font-bold text-white/40 tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                              {multiplayerChallenges.length} SELECTED
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                            {CHALLENGES.map((challenge) => {
                              const isSelected = multiplayerChallenges.includes(challenge.id);
                              return (
                                <button
                                  key={challenge.id}
                                  onClick={() => {
                                    playSound("click");
                                    setActiveChallengeModal(challenge);
                                  }}
                                  onMouseEnter={() => playSound("notification")}
                                  className={cn(
                                    "flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-300 active:scale-[0.98] hover:scale-[1.01] group cursor-pointer relative overflow-hidden backdrop-blur-md",
                                    isSelected 
                                      ? "bg-white/15 border-white shadow-[0_0_25px_rgba(255,255,255,0.12)] text-white" 
                                      : "bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 w-full">
                                    <span className="text-base group-hover:scale-110 transition-transform">{challenge.icon}</span>
                                    <span className={cn("text-xs font-black uppercase tracking-wider truncate", isSelected ? "text-white" : "text-white/80")}>
                                      {challenge.name}
                                    </span>
                                    {isSelected ? (
                                      <span className="ml-auto text-[9px] font-black tracking-widest bg-white text-black px-2 py-0.5 rounded-full uppercase">
                                        EKLENDİ
                                      </span>
                                    ) : (
                                      <span className="ml-auto text-[9px] font-bold text-white/40 group-hover:text-white/80 uppercase">
                                        Detay
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-white/40 group-hover:text-white/60 font-medium mt-1.5 line-clamp-2 leading-snug transition-colors">
                                    {challenge.description}
                                  </p>
                                </button>
                              );
                            })}
                          </div>

                          {/* Challenge Detail & Add Modal */}
                          <AnimatePresence>
                            {activeChallengeModal && (
                              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                  className="w-full max-w-md bg-[#121212] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden select-none"
                                >
                                  <button
                                    onClick={() => {
                                      playSound("click");
                                      setActiveChallengeModal(null);
                                    }}
                                    onMouseEnter={() => playSound("notification")}
                                    className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                                  >
                                    <X size={18} />
                                  </button>

                                  <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner">
                                      {activeChallengeModal.icon}
                                    </div>

                                    <div className="space-y-1">
                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                                        CHALLENGE DETAYLARI
                                      </span>
                                      <h3 className="text-xl font-black text-white uppercase tracking-wider pt-2">
                                        {activeChallengeModal.name}
                                      </h3>
                                    </div>

                                    <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left">
                                      <p className="text-sm font-medium text-neutral-200 leading-relaxed">
                                        {activeChallengeModal.description}
                                      </p>
                                    </div>

                                    <div className="w-full pt-2 flex flex-col gap-2">
                                      {multiplayerChallenges.includes(activeChallengeModal.id) ? (
                                        <button
                                          onClick={() => {
                                            playSound("click");
                                            setMultiplayerChallenges(prev => prev.filter(id => id !== activeChallengeModal.id));
                                          }}
                                          onMouseEnter={() => playSound("notification")}
                                          className="w-full py-3.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-2"
                                        >
                                          <X size={16} /> CHALLENGE'I KALDIR (EKLENDİ)
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            playSound("click");
                                            setMultiplayerChallenges(prev => [...prev, activeChallengeModal.id]);
                                          }}
                                          onMouseEnter={() => playSound("notification")}
                                          className="w-full py-3.5 bg-white hover:bg-neutral-100 text-black rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all cursor-pointer shadow-[0_10px_25px_-5px_rgba(255,255,255,0.3)] active:scale-98 flex items-center justify-center gap-2"
                                        >
                                          <Plus size={16} /> CHALLENGE'I EKLE
                                        </button>
                                      )}

                                      <button
                                        onClick={() => {
                                          playSound("click");
                                          setActiveChallengeModal(null);
                                        }}
                                        onMouseEnter={() => playSound("notification")}
                                        className="w-full py-2.5 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors cursor-pointer"
                                      >
                                        KAPAT
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Right 5 Cols: Match Configuration & Start */}
                        <div className="lg:col-span-5 space-y-6 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-5 rounded-2xl shadow-inner">
                          <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-2 border-b border-white/10 pb-3">
                            <Bot size={16} className="text-white/80" /> Match Configuration
                          </h3>

                          {/* Time Control */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Time Protocol</span>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { label: "1 MIN", seconds: 60 },
                                { label: "3 MIN", seconds: 180 },
                                { label: "5 MIN", seconds: 300 },
                                { label: "10 MIN", seconds: 600 },
                              ].map((tc) => (
                                <button
                                  key={tc.seconds}
                                  onClick={() => {
                                    playSound("click");
                                    setMultiplayerTime(tc.seconds);
                                  }}
                                  onMouseEnter={() => playSound("notification")}
                                  className={cn(
                                    "py-2.5 border rounded-xl text-[10px] font-black tracking-widest text-center transition-all cursor-pointer active:scale-95 backdrop-blur-md",
                                    multiplayerTime === tc.seconds
                                      ? "bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                                      : "bg-white/[0.03] border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20 hover:text-white"
                                  )}
                                >
                                  {tc.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Deployment Side */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Deployment Color</span>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: "WHITE", id: "w", icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png" },
                                { label: "AUTO", id: "random", icon: "❓" },
                                { label: "BLACK", id: "b", icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png" },
                              ].map((side) => (
                                <button
                                  key={side.id}
                                  onClick={() => {
                                    playSound("click");
                                    setPreferColor(side.id as any);
                                  }}
                                  onMouseEnter={() => playSound("notification")}
                                  className={cn(
                                    "py-2.5 px-2 border rounded-xl text-[10px] font-black tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 backdrop-blur-md",
                                    preferColor === side.id
                                      ? "bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                                      : "bg-white/[0.03] border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20 hover:text-white"
                                  )}
                                >
                                  {side.icon.startsWith("http") ? (
                                    <img src={side.icon} alt="" className="w-4 h-4 object-contain" />
                                  ) : (
                                    <span className="text-[11px]">{side.icon}</span>
                                  )}
                                  <span>{side.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Stockfish Engine Level selection */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Stockfish Engine Level</span>
                            <div className="grid grid-cols-1 gap-2">
                              {[
                                { id: "Stockfish 1600", name: "Stockfish 1600 (Standard)", elo: 1600, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png" },
                                { id: "Stockfish 16.1", name: "Stockfish 3500 (Master)", elo: 3500, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png" },
                                { id: "Magnus Carlsen", name: "Magnus Carlsen 2850", elo: 2850, icon: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png" }
                              ].map((bot) => (
                                <button
                                  key={bot.id}
                                  onClick={() => {
                                    playSound("click");
                                    setSelectedBotEngine(bot);
                                  }}
                                  onMouseEnter={() => playSound("notification")}
                                  className={cn(
                                    "p-2.5 border rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer active:scale-98 backdrop-blur-md",
                                    selectedBotEngine.id === bot.id
                                      ? "bg-white/15 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                                      : "bg-white/[0.03] border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                                  )}
                                >
                                  <img src={bot.icon} alt="" className="w-6 h-6 object-contain" />
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-wider">{bot.name}</span>
                                    <span className="text-[9px] text-white/40 font-mono font-bold">Rating ~ {bot.elo} ELO</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* START MATCH BUTTON */}
                          <button
                            onClick={() => {
                              playSound("click");
                              startStockfishChallengeMatch();
                            }}
                            onMouseEnter={() => playSound("notification")}
                            className="w-full py-4 bg-white hover:bg-neutral-100 text-black font-black uppercase text-xs tracking-[0.25em] rounded-xl transition-all shadow-[0_10px_30px_-5px_rgba(255,255,255,0.25)] active:scale-[0.98] hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-3 mt-4"
                          >
                            <Swords size={18} /> START MATCH WITH STOCKFISH
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game-screen"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full overflow-hidden"
            >
              {view === "cage-fighting" ? (
                <CageFighting onBack={() => setView("lobby")} />
              ) : (
                <ChessGame 
                  playerName={playerName} 
                  playerAvatar={playerAvatar} 
                  bgGif={bgGif} 
                  setBgGif={setBgGif} 
                  isOnlineMatch={!!multiplayerRoomId}
                  socket={multiplayerSocket}
                  roomId={multiplayerRoomId || undefined}
                  initialColor={multiplayerColor || "w"}
                  opponentName={opponentInfo?.name || "Opponent"}
                  opponentAvatar={opponentInfo?.avatar || "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png"}
                  isBotOpponent={opponentInfo?.isBot}
                  initialTime={multiplayerTime}
                  onLeaveGame={exitMultiplayer}
                  theme={theme}
                  challenges={multiplayerChallenges}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spotify Focus Player always mounted inside main wrapper to sustain audio stream across views, overlayed on Lobby view when active */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            left: (isSpotifyOpen && view !== "landing") ? "0" : "-9999px",
            opacity: (isSpotifyOpen && view !== "landing") ? 1 : 0.001,
            pointerEvents: (isSpotifyOpen && view !== "landing") ? "auto" : "none",
            zIndex: 35,
          }}
          className="transition-opacity duration-300 overflow-y-auto"
        >
          <SpotifyPlayer onClose={() => setIsSpotifyOpen(false)} />
        </div>
      </div>

      {/* Footer Bar */}
      {(view === "lobby" || view === "cage-fighting") ? (
        <footer className="relative z-20 w-full h-12 sm:h-16 bg-black/40 backdrop-blur-md border-t border-white/5 shrink-0 flex items-center overflow-hidden shadow-[0_-10px_50px_rgba(0,0,0,0.4)]">
          <div className="flex whitespace-nowrap w-full relative">
            <motion.div
              initial={{ x: 0 }}
              animate={{ x: "-50%" }}
              transition={{ 
                duration: 1200, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="flex gap-40 items-center shrink-0"
            >
              {[...CHESS_TIPS, ...CHESS_TIPS].map((tip, idx) => (
                <div key={idx} className="flex items-center gap-10">
                  <img 
                    src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png" 
                    className="w-8 h-8 sm:w-10 sm:h-10 opacity-80 grayscale brightness-200" 
                    alt="King icon"
                  />
                  <span className="text-[10px] sm:text-lg font-black tracking-[0.5em] text-white/90 uppercase select-none italic drop-shadow-2xl">
                    {tip}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </footer>
      ) : (view !== "landing") && (
        <footer className="relative z-20 w-full h-12 border-t border-white/5 bg-black/40 backdrop-blur-md shrink-0 flex items-center justify-start px-6">
          <span className="text-sm sm:text-base text-white/60 tracking-wide font-medium">
            {/* Project credits moved to LandingPage for cleaner UI */}
          </span>
        </footer>
      )}
    </div>
  );
}
