import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { motion, AnimatePresence } from "motion/react";
import { Play, Shield, Globe, Star, Sparkles, Loader2, Info, AlertTriangle, Crown, X, User, Lock, Mail, UserPlus, LogIn } from "lucide-react";
import { cn } from "../lib/utils";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { playSound } from "../lib/audio";

interface LandingPageProps {
  onLoginSuccess: (name: string, avatarUrl: string) => void;
  defaultPlayerName?: string;
  defaultPlayerAvatar?: string;
  theme?: "black" | "white";
}

interface FloatingBoardConfig {
  id: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  scale: number;
  rotate: number;
  opacity: number;
  floatY: number[];
  duration: number;
}

// Positions and animation variations for the 32 decorative background chessboards distributed everywhere around the center card
const FLOATING_BOARDS_CONFIG: FloatingBoardConfig[] = [
  // Top layer (4 boards)
  { id: 0, top: "4%", left: "4%", scale: 0.8, rotate: -12, opacity: 0.42, floatY: [0, -20, 0], duration: 8 },
  { id: 1, top: "3%", left: "32%", scale: 0.72, rotate: 6, opacity: 0.35, floatY: [0, 15, 0], duration: 11 },
  { id: 2, top: "3%", right: "32%", scale: 0.72, rotate: -6, opacity: 0.35, floatY: [0, -15, 0], duration: 9.5 },
  { id: 3, top: "4%", right: "4%", scale: 0.8, rotate: 10, opacity: 0.4, floatY: [0, 18, 0], duration: 9 },

  // Upper-Intermediate layer (2 boards)
  { id: 4, top: "14%", left: "18%", scale: 0.74, rotate: 6, opacity: 0.38, floatY: [0, -12, 0], duration: 10 },
  { id: 5, top: "14%", right: "18%", scale: 0.74, rotate: -6, opacity: 0.38, floatY: [0, 12, 0], duration: 10.5 },

  // Middle-Upper layer (2 boards)
  { id: 6, top: "25%", left: "6%", scale: 0.82, rotate: 14, opacity: 0.45, floatY: [0, -18, 0], duration: 10 },
  { id: 7, top: "25%", right: "6%", scale: 0.82, rotate: -15, opacity: 0.42, floatY: [0, 22, 0], duration: 8.5 },

  // Center sides (2 boards)
  { id: 8, top: "48%", left: "3%", scale: 0.78, rotate: -8, opacity: 0.35, floatY: [0, 12, 0], duration: 12 },
  { id: 9, top: "48%", right: "3%", scale: 0.78, rotate: 12, opacity: 0.35, floatY: [0, -14, 0], duration: 10.5 },

  // Middle-Lower layer (2 boards)
  { id: 10, bottom: "25%", left: "6%", scale: 0.82, rotate: -10, opacity: 0.4, floatY: [0, 16, 0], duration: 9 },
  { id: 11, bottom: "25%", right: "6%", scale: 0.82, rotate: 8, opacity: 0.42, floatY: [0, -18, 0], duration: 10 },

  // Bottom layer (4 boards)
  { id: 12, bottom: "4%", left: "4%", scale: 0.8, rotate: 15, opacity: 0.45, floatY: [0, 20, 0], duration: 8.5 },
  { id: 13, bottom: "3%", left: "32%", scale: 0.72, rotate: -6, opacity: 0.35, floatY: [0, -15, 0], duration: 11.5 },
  { id: 14, bottom: "3%", right: "32%", scale: 0.72, rotate: 6, opacity: 0.35, floatY: [0, 15, 0], duration: 9.5 },
  { id: 15, bottom: "4%", right: "4%", scale: 0.8, rotate: -12, opacity: 0.4, floatY: [0, -16, 0], duration: 10 },

  // Additional 16 boards to double density
  { id: 16, top: "8%", left: "15%", scale: 0.65, rotate: 20, opacity: 0.25, floatY: [0, -25, 0], duration: 12 },
  { id: 17, top: "8%", right: "15%", scale: 0.65, rotate: -20, opacity: 0.25, floatY: [0, 25, 0], duration: 13 },
  { id: 18, bottom: "8%", left: "15%", scale: 0.65, rotate: -15, opacity: 0.25, floatY: [0, 22, 0], duration: 11 },
  { id: 19, bottom: "8%", right: "15%", scale: 0.65, rotate: 15, opacity: 0.25, floatY: [0, -22, 0], duration: 10.5 },
  
  { id: 20, top: "15%", left: "45%", scale: 0.6, rotate: 5, opacity: 0.2, floatY: [0, -10, 0], duration: 14 },
  { id: 21, bottom: "15%", left: "45%", scale: 0.6, rotate: -5, opacity: 0.2, floatY: [0, 10, 0], duration: 15 },
  
  { id: 22, top: "40%", left: "12%", scale: 0.7, rotate: -25, opacity: 0.3, floatY: [0, 30, 0], duration: 9 },
  { id: 23, top: "40%", right: "12%", scale: 0.7, rotate: 25, opacity: 0.3, floatY: [0, -30, 0], duration: 9.5 },
  
  { id: 24, top: "60%", left: "12%", scale: 0.7, rotate: 18, opacity: 0.3, floatY: [0, -28, 0], duration: 10 },
  { id: 25, top: "60%", right: "12%", scale: 0.7, rotate: -18, opacity: 0.3, floatY: [0, 28, 0], duration: 11 },

  { id: 26, top: "1%", left: "50%", scale: 0.55, rotate: 0, opacity: 0.15, floatY: [0, 15, 0], duration: 18 },
  { id: 27, bottom: "1%", left: "50%", scale: 0.55, rotate: 0, opacity: 0.15, floatY: [0, -15, 0], duration: 19 },

  { id: 28, top: "35%", left: "25%", scale: 0.5, rotate: 45, opacity: 0.1, floatY: [0, 10, 0], duration: 20 },
  { id: 29, top: "35%", right: "25%", scale: 0.5, rotate: -45, opacity: 0.1, floatY: [0, -10, 0], duration: 22 },

  { id: 30, bottom: "35%", left: "25%", scale: 0.5, rotate: -45, opacity: 0.1, floatY: [0, -10, 0], duration: 21 },
  { id: 31, bottom: "35%", right: "25%", scale: 0.5, rotate: 45, opacity: 0.1, floatY: [0, 10, 0], duration: 23 }
];

const CHESS_AVATARS = [
  "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png",
  "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png",
  "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png",
  "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png",
  "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png"
];

// Memoized individual board component to prevent unnecessary re-renders
const BackgroundBoard = React.memo(({ cfg, fen, theme, isMobile }: { cfg: FloatingBoardConfig, fen: string, theme: string, isMobile: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: cfg.scale * 0.9, rotate: cfg.rotate }}
      animate={{ 
        opacity: cfg.opacity, 
        scale: cfg.scale,
        y: cfg.floatY
      }}
      transition={{
        opacity: { duration: 1.2 },
        scale: { duration: 1.2 },
        y: {
          duration: cfg.duration,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
      style={{
        position: "absolute",
        top: cfg.top !== undefined ? cfg.top : "auto",
        bottom: cfg.bottom !== undefined ? cfg.bottom : "auto",
        left: cfg.left !== undefined ? cfg.left : "auto",
        right: cfg.right !== undefined ? cfg.right : "auto",
        width: isMobile ? "110px" : "145px",
        height: isMobile ? "110px" : "145px"
      }}
      className={cn(
        "rounded-xl border shadow-2xl p-1.5 backdrop-blur-[3px]",
        theme === "black" ? "border-white/5 bg-black/60" : "border-black/5 bg-white/60"
      )}
    >
      <div className={cn(
        "absolute inset-0 rounded-xl pointer-events-none z-10 border",
        theme === "black" ? "bg-gradient-to-br from-white/5 to-transparent border-white/10" : "bg-gradient-to-br from-black/5 to-transparent border-black/5"
      )} />
      
      <div className="w-full h-full rounded-lg overflow-hidden opacity-65">
        <Chessboard
          options={{
            id: `FloatingBoard_${cfg.id}`,
            position: fen,
            darkSquareStyle: { backgroundColor: theme === "black" ? "#1e1e1e" : "#8ca2ad" },
            lightSquareStyle: { backgroundColor: theme === "black" ? "#c8c8c8" : "#dee3e6" }
          }}
        />
      </div>
    </motion.div>
  );
});

export function LandingPage({
  onLoginSuccess,
  defaultPlayerName = "",
  defaultPlayerAvatar = "",
  theme = "black"
}: LandingPageProps) {
  // Initialize 32 separate Chess games for the floating background boards
  const [games, setGames] = useState(() => 
    Array.from({ length: 32 }, () => new Chess())
  );

  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "guest">("signin");
  
  // Auth Form Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(CHESS_AVATARS[0]);

  const [loginError, setLoginError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Track window width dynamically to safely render only visible chessboards
  const [windowWidth, setWindowWidth] = useState(() => 
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  const visibleBoards = FLOATING_BOARDS_CONFIG.filter((cfg) => {
    if (isDesktop) return true;
    if (isTablet) return cfg.id <= 22;
    return cfg.id <= 14;
  });

  // Slowly progress the background games independently
  useEffect(() => {
    const interval = setInterval(() => {
      const targetIndex = Math.floor(Math.random() * FLOATING_BOARDS_CONFIG.length);
      
      setGames(prevGames => {
        const nextGames = [...prevGames];
        const currentGame = nextGames[targetIndex];

        if (!currentGame) return prevGames;

        if (currentGame.isGameOver()) {
          nextGames[targetIndex] = new Chess();
        } else {
          const moves = currentGame.moves({ verbose: true });
          if (moves.length > 0) {
            const captures = moves.filter(m => m.captured);
            const checks = moves.filter(m => m.san.includes("+"));
            const priority = [...checks, ...captures];
            
            let selectedMove = moves[Math.floor(Math.random() * moves.length)];
            if (priority.length > 0 && Math.random() > 0.4) {
              selectedMove = priority[Math.floor(Math.random() * priority.length)];
            }

            const nextInstance = new Chess(currentGame.fen());
            try {
              nextInstance.move({
                from: selectedMove.from,
                to: selectedMove.to,
                promotion: "q"
              });
              nextGames[targetIndex] = nextInstance;
            } catch (e) {
              nextGames[targetIndex] = new Chess();
            }
          } else {
            nextGames[targetIndex] = new Chess();
          }
        }
        return nextGames;
      });
    }, 450);

    return () => clearInterval(interval);
  }, []);

  // Format Firebase auth error codes nicely
  const getReadableAuthError = (code: string, message: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "Geçersiz e-posta adresi girdiniz. Lütfen kontrol edin.";
      case "auth/user-not-found":
        return "Bu e-posta adresiyle kayıtlı bir hesap bulunamadı. Kayıt Ol sekmesinden yeni hesap oluşturabilirsiniz.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "E-posta adresi veya şifre hatalı. Lütfen şifrenizi kontrol edip tekrar deneyin.";
      case "auth/email-already-in-use":
        return "Bu e-posta adresi zaten kullanımda! Eğer bu hesaba sahipseniz lütfen Giriş Yap sekmesini kullanın.";
      case "auth/weak-password":
        return "Şifreniz çok zayıf. Lütfen en az 6 karakter kullanın.";
      case "auth/operation-not-allowed":
        return "Firebase E-posta/Şifre sağlayıcısı bu projede aktif edilmemiş. Aşağıdaki butona tıklayarak yerel oyun profili ile hemen giriş yapabilirsiniz.";
      default:
        return message || "Bir kimlik doğrulama hatası oluştu.";
    }
  };

  // Sign In submit handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    setLoginError(null);
    setErrorCode(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      const name = user.displayName || user.email?.split("@")[0] || "Chess Player";
      const avatar = user.photoURL || selectedAvatar;

      setIsLoading(false);
      onLoginSuccess(name, avatar);
    } catch (err: any) {
      console.error("Sign in error:", err);
      setIsLoading(false);
      
      // If Firebase auth is disabled or operation-not-allowed, fallback smoothly to local player account
      if (err.code === "auth/operation-not-allowed") {
        const fallbackName = username.trim() || email.split("@")[0] || "Oyuncu";
        onLoginSuccess(fallbackName, selectedAvatar);
        return;
      }

      setErrorCode(err.code || "");
      setLoginError(getReadableAuthError(err.code, err.message));
    }
  };

  // Sign Up submit handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !username.trim()) return;

    if (password.length < 6) {
      setErrorCode("auth/weak-password");
      setLoginError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsLoading(true);
    setLoginError(null);
    setErrorCode(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: username.trim(),
        photoURL: selectedAvatar
      });

      try {
        await setDoc(doc(db, "users", user.uid), {
          displayName: username.trim(),
          avatar: selectedAvatar,
          email: email.trim(),
          createdAt: serverTimestamp()
        });
      } catch (dbErr) {
        console.warn("Could not save initial user doc:", dbErr);
      }

      setIsLoading(false);
      onLoginSuccess(username.trim(), selectedAvatar);
    } catch (err: any) {
      console.error("Sign up error:", err);

      // 1. If email already in use, try signing in with that password automatically
      if (err.code === "auth/email-already-in-use") {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
          const user = userCredential.user;
          const name = username.trim() || user.displayName || user.email?.split("@")[0] || "Chess Player";
          const avatar = selectedAvatar || user.photoURL || CHESS_AVATARS[0];
          
          setIsLoading(false);
          onLoginSuccess(name, avatar);
          return;
        } catch (signInErr: any) {
          console.warn("Auto sign-in fallback after email-already-in-use failed:", signInErr);
        }
      }

      // 2. If operation-not-allowed (Firebase Auth Email provider disabled in console), fallback to local account profile login
      if (err.code === "auth/operation-not-allowed") {
        setIsLoading(false);
        onLoginSuccess(username.trim(), selectedAvatar);
        return;
      }

      setIsLoading(false);
      setErrorCode(err.code || "");
      setLoginError(getReadableAuthError(err.code, err.message));
    }
  };

  // Guest login handler
  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim() || "Misafir_Oyuncu";
    onLoginSuccess(name, selectedAvatar);
  };

  return (
    <div className={cn(
      "min-h-screen w-full relative overflow-hidden font-sans flex items-center justify-center transition-colors duration-500 py-10",
      theme === "black" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-black"
    )}>
      
      {/* Ambient Background Noise/Blur layers */}
      <div className={cn(
        "absolute inset-0 z-10 pointer-events-none",
        theme === "black" 
          ? "bg-radial-[circle_at_center,transparent_30%,rgba(0,0,0,0.85)]" 
          : "bg-radial-[circle_at_center,transparent_30%,rgba(255,255,255,0.7)]"
      )} />
      <div className={cn(
        "absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none z-0",
        theme === "black" ? "bg-neutral-800/10" : "bg-white/50"
      )} />
      <div className={cn(
        "absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[140px] pointer-events-none z-0",
        theme === "black" ? "bg-neutral-900/20" : "bg-white/40"
      )} />

      {/* BACKGROUND ART: Floating, self-playing chessboards */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {visibleBoards.map((cfg) => (
          <BackgroundBoard
            key={cfg.id}
            cfg={cfg}
            fen={games[cfg.id] ? games[cfg.id].fen() : "start"}
            theme={theme}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* CENTERED GLASSMORPHIC ACCOUNT CARD */}
      <div className="w-full max-w-md px-4 relative z-20 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "w-full backdrop-blur-3xl border p-6 sm:p-8 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9)] relative overflow-hidden",
            theme === "black" ? "bg-black/80 border-white/10" : "bg-white/95 border-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
          )}
        >
          {/* Subtle top light bar */}
          <div className={cn(
            "absolute top-0 left-0 w-full h-0.5",
            theme === "black" ? "bg-gradient-to-r from-transparent via-white/20 to-transparent" : "bg-gradient-to-r from-transparent via-black/15 to-transparent"
          )} />
          
          {/* Branding Logo & Title */}
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <div className={cn(
              "w-14 h-14 rounded-2xl border flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] relative group overflow-hidden",
              theme === "black" ? "bg-gradient-to-br from-neutral-900 to-neutral-800 border-white/20" : "bg-gradient-to-br from-neutral-100 to-white border-black/10 shadow-none"
            )}>
              <img 
                src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png" 
                alt="Logo"
                className="w-10 h-10 relative z-10 transition-transform duration-300 group-hover:scale-110 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              />
            </div>
            <div>
              <h1 className={cn(
                "text-2xl font-black tracking-widest uppercase leading-none",
                theme === "black" ? "text-white" : "text-black"
              )}>CHESSTER</h1>
              <p className={cn("text-xs font-bold tracking-wider uppercase mt-1", theme === "black" ? "text-neutral-400" : "text-neutral-500")}>
                Hesap Yönetimi & Oyuncu Portali
              </p>
            </div>
          </div>

          {/* AUTH TABS */}
          <div className={cn(
            "grid grid-cols-3 p-1 rounded-2xl mb-6 border backdrop-blur-md",
            theme === "black" ? "bg-neutral-900/80 border-white/10" : "bg-neutral-100 border-black/10"
          )}>
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setAuthMode("signin");
                setLoginError(null);
              }}
              className={cn(
                "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                authMode === "signin"
                  ? (theme === "black" ? "bg-white text-black shadow-lg" : "bg-black text-white shadow-lg")
                  : (theme === "black" ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-black")
              )}
            >
              <LogIn size={13} /> Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setAuthMode("signup");
                setLoginError(null);
              }}
              className={cn(
                "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                authMode === "signup"
                  ? (theme === "black" ? "bg-white text-black shadow-lg" : "bg-black text-white shadow-lg")
                  : (theme === "black" ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-black")
              )}
            >
              <UserPlus size={13} /> Kayıt Ol
            </button>
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setAuthMode("guest");
                setLoginError(null);
              }}
              className={cn(
                "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                authMode === "guest"
                  ? (theme === "black" ? "bg-white text-black shadow-lg" : "bg-black text-white shadow-lg")
                  : (theme === "black" ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-black")
              )}
            >
              <User size={13} /> Misafir
            </button>
          </div>

          {/* FORMS */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading-spinner"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-8 space-y-4"
              >
                <Loader2 className={cn("w-10 h-10 animate-spin shrink-0", theme === "black" ? "text-white" : "text-black")} />
                <p className={cn("text-xs font-black tracking-widest uppercase animate-pulse", theme === "black" ? "text-white" : "text-black")}>
                  Giriş Yapılıyor...
                </p>
              </motion.div>
            ) : authMode === "signin" ? (
              <motion.form
                key="signin-form"
                onSubmit={handleSignIn}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className={cn("text-[11px] font-extrabold uppercase tracking-wider block", theme === "black" ? "text-neutral-400" : "text-neutral-600")}>
                    E-Posta Adresi
                  </label>
                  <div className="relative">
                    <Mail size={16} className={cn("absolute left-3.5 top-3.5 pointer-events-none", theme === "black" ? "text-neutral-500" : "text-neutral-400")} />
                    <input
                      type="email"
                      placeholder="ornek@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={cn(
                        "w-full h-11 border rounded-xl pl-10 pr-4 text-sm font-semibold focus:outline-none transition-all",
                        theme === "black" 
                          ? "bg-neutral-900 border-white/10 focus:border-white/30 text-white placeholder-neutral-600" 
                          : "bg-white border-black/10 focus:border-black/30 text-black placeholder-neutral-400"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={cn("text-[11px] font-extrabold uppercase tracking-wider block", theme === "black" ? "text-neutral-400" : "text-neutral-600")}>
                    Şifre
                  </label>
                  <div className="relative">
                    <Lock size={16} className={cn("absolute left-3.5 top-3.5 pointer-events-none", theme === "black" ? "text-neutral-500" : "text-neutral-400")} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={cn(
                        "w-full h-11 border rounded-xl pl-10 pr-4 text-sm font-semibold focus:outline-none transition-all",
                        theme === "black" 
                          ? "bg-neutral-900 border-white/10 focus:border-white/30 text-white placeholder-neutral-600" 
                          : "bg-white border-black/10 focus:border-black/30 text-black placeholder-neutral-400"
                      )}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  onClick={() => playSound("click")}
                  className={cn(
                    "w-full h-12 font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2",
                    theme === "black" ? "bg-white hover:bg-neutral-100 text-black" : "bg-black hover:bg-neutral-800 text-white"
                  )}
                >
                  <LogIn size={16} /> GİRİŞ YAP
                </button>
              </motion.form>
            ) : authMode === "signup" ? (
              <motion.form
                key="signup-form"
                onSubmit={handleSignUp}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className={cn("text-[11px] font-extrabold uppercase tracking-wider block", theme === "black" ? "text-neutral-400" : "text-neutral-600")}>
                    Kullanıcı Adı
                  </label>
                  <div className="relative">
                    <User size={16} className={cn("absolute left-3.5 top-3.5 pointer-events-none", theme === "black" ? "text-neutral-500" : "text-neutral-400")} />
                    <input
                      type="text"
                      maxLength={18}
                      placeholder="OrnekOyuncu"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className={cn(
                        "w-full h-11 border rounded-xl pl-10 pr-4 text-sm font-semibold focus:outline-none transition-all",
                        theme === "black" 
                          ? "bg-neutral-900 border-white/10 focus:border-white/30 text-white placeholder-neutral-600" 
                          : "bg-white border-black/10 focus:border-black/30 text-black placeholder-neutral-400"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={cn("text-[11px] font-extrabold uppercase tracking-wider block", theme === "black" ? "text-neutral-400" : "text-neutral-600")}>
                    E-Posta Adresi
                  </label>
                  <div className="relative">
                    <Mail size={16} className={cn("absolute left-3.5 top-3.5 pointer-events-none", theme === "black" ? "text-neutral-500" : "text-neutral-400")} />
                    <input
                      type="email"
                      placeholder="ornek@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={cn(
                        "w-full h-11 border rounded-xl pl-10 pr-4 text-sm font-semibold focus:outline-none transition-all",
                        theme === "black" 
                          ? "bg-neutral-900 border-white/10 focus:border-white/30 text-white placeholder-neutral-600" 
                          : "bg-white border-black/10 focus:border-black/30 text-black placeholder-neutral-400"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={cn("text-[11px] font-extrabold uppercase tracking-wider block", theme === "black" ? "text-neutral-400" : "text-neutral-600")}>
                    Şifre (En az 6 karakter)
                  </label>
                  <div className="relative">
                    <Lock size={16} className={cn("absolute left-3.5 top-3.5 pointer-events-none", theme === "black" ? "text-neutral-500" : "text-neutral-400")} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                      className={cn(
                        "w-full h-11 border rounded-xl pl-10 pr-4 text-sm font-semibold focus:outline-none transition-all",
                        theme === "black" 
                          ? "bg-neutral-900 border-white/10 focus:border-white/30 text-white placeholder-neutral-600" 
                          : "bg-white border-black/10 focus:border-black/30 text-black placeholder-neutral-400"
                      )}
                    />
                  </div>
                </div>

                {/* Avatar Selection */}
                <div className="space-y-1.5">
                  <label className={cn("text-[11px] font-extrabold uppercase tracking-wider block", theme === "black" ? "text-neutral-400" : "text-neutral-600")}>
                    Profil Avatari
                  </label>
                  <div className="flex gap-2 justify-between">
                    {CHESS_AVATARS.map((avUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          playSound("click");
                          setSelectedAvatar(avUrl);
                        }}
                        className={cn(
                          "w-11 h-11 rounded-xl p-1 border transition-all cursor-pointer flex items-center justify-center relative",
                          selectedAvatar === avUrl 
                            ? (theme === "black" ? "border-white bg-white/20 scale-105" : "border-black bg-black/10 scale-105")
                            : (theme === "black" ? "border-white/10 hover:border-white/30 bg-neutral-900" : "border-black/10 hover:border-black/30 bg-neutral-50")
                        )}
                      >
                        <img src={avUrl} alt="Avatar" className="w-8 h-8 object-contain" />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  onClick={() => playSound("click")}
                  className={cn(
                    "w-full h-12 font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2",
                    theme === "black" ? "bg-white hover:bg-neutral-100 text-black" : "bg-black hover:bg-neutral-800 text-white"
                  )}
                >
                  <UserPlus size={16} /> HESAP OLUŞTUR
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="guest-form"
                onSubmit={handleGuestSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className={cn("text-[11px] font-extrabold uppercase tracking-wider block", theme === "black" ? "text-neutral-400" : "text-neutral-600")}>
                    Misafir İsmi
                  </label>
                  <div className="relative">
                    <User size={16} className={cn("absolute left-3.5 top-3.5 pointer-events-none", theme === "black" ? "text-neutral-500" : "text-neutral-400")} />
                    <input
                      type="text"
                      maxLength={18}
                      placeholder="Misafir_Oyuncu"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={cn(
                        "w-full h-11 border rounded-xl pl-10 pr-4 text-sm font-semibold focus:outline-none transition-all",
                        theme === "black" 
                          ? "bg-neutral-900 border-white/10 focus:border-white/30 text-white placeholder-neutral-600" 
                          : "bg-white border-black/10 focus:border-black/30 text-black placeholder-neutral-400"
                      )}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  onClick={() => playSound("click")}
                  className={cn(
                    "w-full h-12 font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2",
                    theme === "black" ? "bg-white hover:bg-neutral-100 text-black" : "bg-black hover:bg-neutral-800 text-white"
                  )}
                >
                  <Play size={16} /> MİSAFİR OLARAK BAŞLA
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* ERROR DISPLAYER */}
          {loginError && (
            <div className={cn(
              "border rounded-xl p-3.5 text-xs flex flex-col gap-2 mt-4",
              theme === "black" ? "bg-red-500/10 border-red-500/20 text-red-200" : "bg-red-50/90 border-red-200 text-red-800"
            )}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className={cn("shrink-0 mt-0.5", theme === "black" ? "text-red-400" : "text-red-600")} />
                <span className="leading-snug">{loginError}</span>
              </div>

              {/* Quick Action for email-already-in-use */}
              {errorCode === "auth/email-already-in-use" && (
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setAuthMode("signin");
                    setLoginError(null);
                    setErrorCode(null);
                  }}
                  className={cn(
                    "mt-1 py-1.5 px-3 rounded-lg font-extrabold text-[11px] uppercase tracking-wider self-start cursor-pointer border transition-all",
                    theme === "black" ? "bg-white text-black hover:bg-neutral-200 border-white" : "bg-black text-white hover:bg-neutral-800 border-black"
                  )}
                >
                  Giriş Yap Sekmesine Geç &rarr;
                </button>
              )}

              {/* Quick Action for operation-not-allowed */}
              {errorCode === "auth/operation-not-allowed" && (
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    const displayName = username.trim() || email.split("@")[0] || "Oyuncu";
                    onLoginSuccess(displayName, selectedAvatar);
                  }}
                  className={cn(
                    "mt-1 py-1.5 px-3 rounded-lg font-extrabold text-[11px] uppercase tracking-wider self-start cursor-pointer border transition-all flex items-center gap-1",
                    theme === "black" ? "bg-emerald-500 text-black hover:bg-emerald-400 border-emerald-400" : "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
                  )}
                >
                  Yerel Profil İle Giriş Yap &rarr;
                </button>
              )}
            </div>
          )}

        </motion.div>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 z-20 pointer-events-none">
        <span className="text-[9px] sm:text-[11px] tracking-[0.2em] font-bold text-white/20 uppercase select-none">
          The project was carried out by Emir Destan Bakar
        </span>
      </div>

      <div className="absolute bottom-6 sm:bottom-10 w-full flex justify-center z-20">
        <button 
          type="button"
          onClick={() => {
            playSound("click");
            setShowPrivacyPolicy(true);
          }}
          className="flex items-center gap-2 text-[10px] sm:text-xs tracking-[0.4em] font-black text-white/40 hover:text-white transition-colors uppercase select-none cursor-pointer px-4"
        >
          <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
          Gizlilik Politikası
        </button>
      </div>

      {/* PRIVACY POLICY MODAL */}
      <AnimatePresence>
        {showPrivacyPolicy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPrivacyPolicy(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={cn(
                "w-full max-w-2xl max-h-[80vh] overflow-y-auto p-8 rounded-3xl border shadow-2xl relative",
                theme === "black" ? "bg-neutral-900 border-white/10 text-white" : "bg-white border-black/10 text-black"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => {
                  playSound("click");
                  setShowPrivacyPolicy(false);
                }}
                className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <X className={cn("w-6 h-6", theme === "black" ? "text-white" : "text-black")} />
              </button>
              <h2 className="text-2xl font-black tracking-widest uppercase mb-6">Gizlilik Politikası</h2>
              <div className="space-y-4 text-sm leading-relaxed opacity-80">
                <p>
                  Chesster platformuna hoş geldiniz. Gizliliğiniz bizim için önemlidir.
                </p>
                <h3 className="font-bold uppercase tracking-wider mt-4">1. Kullanıcı Hesapları</h3>
                <p>
                  E-posta ve şifrenizle oluşturduğunuz hesap verileri güvenli Firebase sistemimizde saklanır ve üçüncü taraflarla paylaşılmaz.
                </p>
                <h3 className="font-bold uppercase tracking-wider mt-4">2. Oyun Geçmişi ve Analizler</h3>
                <p>
                  Hamle geçmişiniz ve performans verileriniz analiz ve istatistik sunmak amacıyla kaydedilir.
                </p>
                <h3 className="font-bold uppercase tracking-wider mt-4">3. Çerezler ve Yerel Depolama</h3>
                <p>
                  Tema tercihleriniz ve oyun ayarlarınız taranızın yerel depolama alanında tutulur.
                </p>
                <p className="pt-4 italic">
                  Chesster'ı kullanarak bu şartları kabul etmiş olursunuz.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

