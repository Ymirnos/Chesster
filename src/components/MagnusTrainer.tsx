import React, { useState, useEffect, useRef } from "react";
import { Move } from "chess.js";
import { Evaluation } from "../lib/useStockfish";
import staticOpenings from "../db/openings.json";
import { 
  Sparkles, 
  MessageSquare, 
  Compass, 
  Trophy, 
  BrainCircuit, 
  Heart, 
  Flame,
  BookOpen,
  Zap,
  CheckCircle2,
  Check,
  ThumbsUp,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Brain
} from "lucide-react";

import { cn } from "../lib/utils";

interface MagnusTrainerProps {
  history: Move[];
  viewIndex: number;
  fens: string[];
  evaluation: Evaluation;
  opening?: { eco: string; name: string } | null;
  isOnlineMatch: boolean;
  theme?: "black" | "white";
}

const GREETING_SENTENCES = [
  "If you're ready, let's begin. Let's see if you can make moves worthy of me today!",
  "No matter who my opponent is, I always like to show my best game. Good luck!",
  "Chess is a game of patience. Make your first move and prove your talent to me.",
  "I wish you a great match. Don't forget to focus your mind on the board.",
  "Remember, every grandmaster was once a beginner. Come on, I'm waiting for your move.",
  "In the opening, focus on getting your pieces to active squares. Good luck!",
  "Use your time wisely. Every rushed decision breeds weakness.",
  "Who will rule the board? Let's see your move!",
  "With me, every new move is a new lesson. Keep your concentration high.",
  "Think tactically, act strategically, and most importantly, coordinate your pieces. May luck be with you!",
  "I'm always looking for a good chess challenge. Show me what you are capable of.",
  "The board is ready, the clocks are ticking. Let's play a high-quality game!",
  "Focus on the center and search for long-term plans. Let's see your chess logic.",
  "Welcome to the training ground. Let's keep our focus completely on the board.",
  "Every game is a clean slate. Play with confidence and follow your intuition.",
  "First move sets the stage. Let's see which opening you prefer today!",
  "The best way to learn is by playing against tough opponents. Ready when you are.",
  "A calm mind sees the entire board cleanly. Let's start this battle.",
  "Let's put your preparation to the test. Make your first move directly.",
  "Keep it clean, stay sharp, and let's have a highly instructive match."
];

const BOOK_SENTENCES = [
  "You know the theory well, this move came straight out of the opening book. Keep going!",
  "A classic start. Mastering theory is the foundation of the game, well done.",
  "I've seen this move thousands of times. You're following perfect book alignment, not bad.",
  "Good job staying on opening theory. You're holding a solid position.",
  "I play this line often too. Sticking to the book is very wise.",
  "A classical and safe move. Theory is always a great force behind you.",
  "Every piece on the board is exactly where it needs to be. Clean book move!",
  "I like this level of preparation. You're already making things tough for your opponent.",
  "Deep theoretical knowledge! With this move, you keep the position solid and balanced.",
  "Congratulations on staying in the opening line. Now the real fight begins.",
  "This is a standard theoretical continuation. Safe, direct, and fully prepared.",
  "A highly played book line. You are definitely familiar with top-level patterns.",
  "Perfect knowledge of the opening. This will save us lots of time on the clock.",
  "An excellent choice from the master books. Let us see how the transition to midgame unfolds.",
  "A disciplined theoretical approach. It's crucial to lay a stable foundation.",
  "We are in well-trodden territory. You have studied the classics, I see.",
  "A standard structural setup. Very solid, very clean.",
  "Keeping up with modern chess theory! That's a highly respectable opening move.",
  "Continuing the book line seamlessly. A mature decision to avoid unneeded risk early on.",
  "Excellent. The pieces are positioned exactly as chess theory prescribes."
];

const BEST_SENTENCES = [
  "That's it! A world-champion quality move, wonderful vision!",
  "Even I couldn't have played that better. Truly a brilliant concept!",
  "Excellent coordination! Your pieces are practically singing. Brilliant move.",
  "An incredibly sharp decision that completely breaks down your opponent's defense!",
  "Tactical genius! This idea will keep your opponent thinking for a long time.",
  "Posituationally flawless in every sense. You are in complete control of the board.",
  "I can't believe my eyes, this move is absolutely brilliant!",
  "A high-level move with great strategic depth. Warm congratulations.",
  "You've locked up the position completely in your favor with this move. Stunning!",
  "That's the spirit I'm looking for! This move is powerful enough to decide the game.",
  "What a beautiful move! You've completely dominated the key squares on the board.",
  "Splendid look ahead! You are thinking multiple steps in advance like a true master.",
  "Pure positional mastery. This is how champions secure their wins.",
  "Absolutely top-class! You found the hidden resource in this complex setup.",
  "Outstanding tactical strike! This will exert immense pressure on your opponent.",
  "Fascinating chess logic! This move is both visually elegant and highly lethal.",
  "A highly precise and elegant solution. You have a keen eye for positional dynamics.",
  "Masterful execution! Your control over the key files and diagonals is pristine.",
  "Exceptional! This move creates structural nightmares for the opposition.",
  "Incredible depth. You are calculating at an extremely high level today!"
];

const EXCELLENT_SENTENCES = [
  "A very solid move. You continue to maintain your positional advantage.",
  "The right choice. You are not losing control of the game.",
  "A clean move prioritizing development and king safety.",
  "Good idea. You leave no room for your opponent to breathe.",
  "Balanced and logical. If you maintain this pace, the advantage will be yours.",
  "A highly sensible choice that does full justice to the position.",
  "A clean development move designed to disrupt your opponent's plans.",
  "I like it. You are gradually ramping up the pressure on the board.",
  "The coordination of your pieces is quite nice, you're on the right track.",
  "Nice move, keep holding the rhythm of the game.",
  "Logical and active. You are maintaining a highly stable and playable game.",
  "A well-calculated development step. You are calmly improving your position.",
  "Keeping the defense tight while maintaining active threats. Respectable chess.",
  "This is exactly how you restrict your opponent's counter-play. Good job.",
  "A steady and comfortable positional choice. No unnecessary risks.",
  "Perfect symmetry and nice coordination. Your position looks very healthy.",
  "Improving the activity of your pieces bit by bit. Excellent progress.",
  "A very mature and patient decision. You're keeping the squeeze on.",
  "Solidifying our outpost squares. Keep putting pressure on the weak spots.",
  "Perfect control. You are dictating the tempo of the match beautifully."
];

const INACCURACY_SENTENCES = [
  "You should be a bit more careful. The coordination of your pieces is slightly off.",
  "You could have found a better square, but this is not a total disaster.",
  "Looks like you're pushing the position too hard. You could have stayed calmer.",
  "This move gives your opponent a slight counter-chance, watch out.",
  "A somewhat passive choice. You should have gone for more active development.",
  "Not bad, but a world-class game requires something better.",
  "The timing feels a bit off. The coordination of your pieces has weakened.",
  "You've left that corner a bit vacant. Hopefully, your opponent won't notice.",
  "A somewhat rushed strategic decision. You should have reasoned more deeply.",
  "This might cause a tiny coordination issue. You need to pull yourself together soon.",
  "You allowed a minor space compromise. Keep your guard up.",
  "This pawn structure adjustment could turn out to be slightly premature.",
  "Not the most active square for your piece. We should seek higher activity.",
  "A bit of a slow tempo. You are giving them some time to consolidate.",
  "You must pay attention to small positional details. This was slightly loose.",
  "This move doesn't quite fit the long-term plan of our setup.",
  "A minor delay in putting our king to safety. Try not to postpone it.",
  "It is an okay move, but there were definitely more energetic squares available.",
  "You missed a chance to optimize the files. Try to notice these small details.",
  "Slightly imprecise, but we are still fully in the game. Stay focused."
];

const MISTAKE_SENTENCES = [
  "Ah, that's not it. There was a much stronger continuation, you missed it.",
  "A serious strategic mistake. Your opponent can come after you now.",
  "This move disturbed the balance of your pieces. We must take measures immediately.",
  "You shouldn't make mistakes like this at this level. Focus, please!",
  "I understand the idea behind the move, but it's tactically flawed.",
  "You've put your most active piece to serve the wrong purpose.",
  "You're about to let the advantage slip away with this step. Careful.",
  "I must admit, this move disappointed me a little.",
  "You gave your opponent an obvious target. Tighten up your defense.",
  "You rushed in a position where you needed to calculate more deeply.",
  "This created an annoying weakness in our camp. You must react quickly now.",
  "A serious conceptual error. That passive piece has blocked your own defense.",
  "No, this is wrong. You had a far higher-quality square, you must find these.",
  "You ran into their defensive block. That is a strategic concession.",
  "You are losing your grip on the center. We have to change the tide.",
  "A very hasty move. You didn't double-check their reply.",
  "A severe positional mismatch. The coordination of our pieces has completely dropped.",
  "This was a clear tactical misjudgment. Prepare for a difficult defense.",
  "No! This move gives away a significant portion of our hard-earned advantage.",
  "You fell for code orange there. We must defend extremely carefully next."
];

const BLUNDER_SENTENCES = [
  "Unbelievable! This is a total blunder, you left a piece hanging or took a massive blow!",
  "A terrible move! We need a miracle now to save this game.",
  "How did you miss this? Your opponent can punish this mistake immediately.",
  "Your concentration is completely shattered. Please take a deep breath.",
  "Don't you see the catastrophe on the board? This move can throw the match directly.",
  "There was a highly critical tactical trap, and you walked right into it.",
  "I can't believe my eyes... Surely you couldn't have played that!",
  "A massive blunder! You basically gifted the game to your opponent.",
  "An unacceptably huge mistake for a player of this level.",
  "Ah! If only we could take this move back. It is code red.",
  "Oh no! That is a huge oversight. The game is sliding right out of hand.",
  "This is completely uncharacteristic! You gave them a winning tactical sequence.",
  "Total breakdown! You didn't see the threat on your back rank or key unit.",
  "An extreme error! You must calculate candidate moves more carefully.",
  "You have completely compromised your defense. It is critical now.",
  "This is a massive gift to your opponent. You have to stay sober-minded.",
  "A devastating move. It exposes your king to a quick defeat.",
  "No, no, no! That was a complete miscalculation of the board state.",
  "Wow, that is a direct game-losing blunder. Focus on your basics!",
  "A catastrophic mistake. Hopefully, your opponent misses the reply, but don't count on it."
];

const CHECKMATE_SENTENCES = [
  "Checkmate! A beautiful finish. You ended the game like an absolute champion!",
  "And that is checkmate! Elegant, precise, and completely inescapable. Brilliant!",
  "Checkmate! The king has no squares left. What a fantastic victory!",
  "Perfect coordination to deliver the checkmate. Even I am deeply impressed!",
  "Checkmate! A highly tactical masterpiece of a finish. Masterfully done!"
];

const CHECK_SENTENCES = [
  "A sharp check on their king! You are keeping them on their toes.",
  "Check! You are aggressively forcing their king to make a difficult decision.",
  "Excellent check. Keep the initiative and don't let their king find a safe haven.",
  "A nice intermediate check. Let's see how they attempt to block or run away.",
  "Check! An energetic move to gain an active tempo on the board."
];

const CASTLE_SENTENCES = [
  "Ah, castling! King safety is of utmost importance in a grandmaster game.",
  "A wise decision to castle and safeguard your king. Excellent strategy!",
  "Castled and coordinated. Now your rooks are ready to enter the combat.",
  "A very timely castle. A safe king is the foundation of any powerful attack.",
  "Perfect. King tucked away safely in the corner, and the rook is now active."
];

const EN_PASSANT_SENTENCES = [
  "Ah! En passant! A rare and elegant chess rule. That shows style!",
  "En passant! Most amateur players forget this rule, but your tactical eye is sharp.",
  "A brilliant en passant capture! You kept the files completely active.",
  "Beautiful en passant. You completely neutralized their double pawn push.",
  "Taking en passant! Always a highly satisfying pawn capture, well executed."
];

const PROMOTION_SENTENCES = [
  "A pawn promotion! You've successfully marched your soldier to victory!",
  "Promoting to a new piece! This will completely shift the balance of power.",
  "Magnificent work pushing that pawn all the way to promotion. Well played!",
  "A brand new queen or helper joins the battlefield. This is a decisive moment!",
  "A beautiful pawn breakthrough resulting in a powerful promotion. Outstanding!"
];

const QUEEN_CAPTURE_SENTENCES = [
  "Wow! You captured their Queen! This is a massive victory on the board.",
  "A decisive strike, you took their Queen down! The game is highly leaning in your favor.",
  "Outstanding work winning the most powerful piece in their arsenal!",
  "The Queen has fallen! This completely shatters their coordination and offensive power.",
  "You've successfully hunted down their Queen. A beautiful tactical capture!"
];

const getAnalysisIconConfig = (classification: string) => {
  switch (classification) {
    case "Start":
      return {
        icon: BrainCircuit,
        colorClass: "text-blue-400",
        containerClass: "from-blue-500/20 via-indigo-500/35 to-blue-500/10 border-blue-500/35 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.25)]",
        badgeText: "PREPARING",
        subText: "AI COACH"
      };
    case "Book Move":
      return {
        icon: BookOpen,
        colorClass: "text-amber-400",
        containerClass: "from-amber-500/20 via-orange-500/25 to-yellow-500/10 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
        badgeText: "BOOK MOVE",
        subText: "THEORY"
      };
    case "Brilliant (!!)":
      return {
        icon: Sparkles,
        colorClass: "text-cyan-400",
        containerClass: "from-cyan-400/25 via-sky-500/35 to-blue-500/20 border-cyan-400/45 bg-cyan-400/15 shadow-[0_0_20px_rgba(34,211,238,0.45)]",
        badgeText: "BRILLIANT",
        subText: "GENIUS MATCH"
      };
    case "Great Move (!)":
      return {
        icon: Zap,
        colorClass: "text-teal-400 animate-pulse",
        containerClass: "from-teal-500/20 via-emerald-500/30 to-teal-500/10 border-teal-500/35 bg-teal-500/10 shadow-[0_0_15px_rgba(20,184,166,0.25)]",
        badgeText: "GREAT MOVE",
        subText: "SHARP PLAY"
      };
    case "Best Move":
      return {
        icon: CheckCircle2,
        colorClass: "text-green-400",
        containerClass: "from-green-500/20 via-emerald-500/35 to-green-500/10 border-green-500/35 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.25)]",
        badgeText: "BEST MOVE",
        subText: "TOP CHOICE"
      };
    case "Excellent":
      return {
        icon: Check,
        colorClass: "text-emerald-400",
        containerClass: "from-emerald-500/20 via-teal-500/30 to-emerald-500/10 border-emerald-500/35 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
        badgeText: "EXCELLENT",
        subText: "STRONG PLAY"
      };
    case "Good":
      return {
        icon: ThumbsUp,
        colorClass: "text-slate-300",
        containerClass: "from-slate-500/10 via-zinc-500/25 to-slate-500/10 border-slate-500/35 bg-slate-500/5 shadow-[0_0_10px_rgba(148,163,184,0.15)]",
        badgeText: "GOOD MOVE",
        subText: "DECENT"
      };
    case "Inaccuracy (?!)":
      return {
        icon: AlertTriangle,
        colorClass: "text-yellow-500",
        containerClass: "from-yellow-400/25 via-amber-500/30 to-yellow-400/10 border-yellow-500/35 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.25)]",
        badgeText: "INACCURACY",
        subText: "SLIGHT SLIP"
      };
    case "Mistake (?)":
      return {
        icon: AlertCircle,
        colorClass: "text-orange-500",
        containerClass: "from-orange-500/25 via-amber-500/30 to-orange-500/10 border-orange-500/35 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.25)]",
        badgeText: "MISTAKE",
        subText: "CARELESS"
      };
    case "Blunder (??)":
      return {
        icon: XCircle,
        colorClass: "text-red-500 animate-bounce",
        containerClass: "from-red-500/25 via-rose-500/35 to-red-500/10 border-red-500/40 bg-red-500/15 shadow-[0_0_20px_rgba(239,68,68,0.35)]",
        badgeText: "BLUNDER",
        subText: "CRITICAL LOSS"
      };
    case "Thinking":
      return {
        icon: Brain,
        colorClass: "text-gray-400 animate-pulse",
        containerClass: "from-gray-500/15 via-zinc-500/25 to-gray-500/10 border-gray-500/30 bg-gray-500/5",
        badgeText: "THINKING",
        subText: "STOCKFISH"
      };
    default:
      return {
        icon: BrainCircuit,
        colorClass: "text-green-400",
        containerClass: "from-green-500/20 via-emerald-500/35 to-teal-500/10 border-green-500/35 bg-green-500/15 shadow-[0_0_15px_rgba(34,197,94,0.25)]",
        badgeText: "ANALYSIS",
        subText: "ACTIVE COACH"
      };
  }
};

const getIndicatorColor = (classification: string) => {
  switch (classification) {
    case "Brilliant (!!)":
      return "bg-cyan-400 ring-2 ring-[#121210]";
    case "Great Move (!)":
      return "bg-teal-400 ring-2 ring-[#121210]";
    case "Best Move":
      return "bg-green-400 ring-2 ring-[#121210]";
    case "Excellent":
      return "bg-emerald-400 ring-2 ring-[#121210]";
    case "Book Move":
      return "bg-amber-500 ring-2 ring-[#121210]";
    case "Good":
      return "bg-slate-400 ring-2 ring-[#121210]";
    case "Inaccuracy (?!)":
      return "bg-yellow-400 ring-2 ring-[#121210]";
    case "Mistake (?)":
      return "bg-orange-500 ring-2 ring-[#121210]";
    case "Blunder (??)":
      return "bg-red-500 ring-2 ring-[#121210] animate-pulse";
    case "Thinking":
      return "bg-gray-400 ring-2 ring-[#121210] animate-pulse";
    default:
      return "bg-green-500 ring-2 ring-[#121210] animate-pulse";
  }
};

export function MagnusTrainer({ 
  history, 
  viewIndex, 
  fens, 
  evaluation, 
  opening, 
  isOnlineMatch,
  theme = "black" 
}: MagnusTrainerProps) {
  const [positionEvals, setPositionEvals] = useState<Record<string, Evaluation>>({});
  const [currentSpeech, setCurrentSpeech] = useState<string>(GREETING_SENTENCES[0]);

  const currentFen = fens[viewIndex];

  // Save evaluations when they arrive
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

  // Helper to determine if a move was a Book Move
  const checkIsBookMove = (): boolean => {
    if (viewIndex === 0) return false;

    // Check against static openings database
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

    if (opening && viewIndex <= 24) {
      return true;
    }

    return false;
  };

  const getClassification = (): string => {
    if (viewIndex === 0) return "Start";
    
    // Check book move
    const isBook = checkIsBookMove();
    if (isBook) return "Book Move";

    const prevFen = fens[viewIndex - 1];
    const afterFen = fens[viewIndex];
    const playedMoveObj = history[viewIndex - 1];

    if (!playedMoveObj) return "Good";

    const prevEval = positionEvals[prevFen] || (viewIndex === 1 ? { type: "cp", value: 35 } : null);
    const afterEval = positionEvals[afterFen] || (evaluation.fen === afterFen ? evaluation : null);

    if (!prevEval || !afterEval) {
      return "Thinking";
    }

    const prevIsWhite = playedMoveObj.color === "w";
    const afterIsWhite = playedMoveObj.color !== "w";

    let prevAbsolute = prevEval.value;
    if (!prevIsWhite) prevAbsolute = -prevAbsolute;

    let afterAbsolute = afterEval.value;
    if (!afterIsWhite) afterAbsolute = -afterAbsolute;

    const isWhiteMove = playedMoveObj.color === "w";
    const drop = isWhiteMove ? (prevAbsolute - afterAbsolute) : (afterAbsolute - prevAbsolute);

    if (prevEval.type === "mate" && afterEval.type !== "mate") {
      return "Blunder (??)";
    } else if (drop >= 200) {
      return "Blunder (??)";
    } else if (drop >= 100) {
      return "Mistake (?)";
    } else if (drop >= 50) {
      return "Inaccuracy (?!)";
    } else if (drop <= 0) {
      const isCapture = playedMoveObj.captured;
      if (isCapture && drop < -50) {
        return "Brilliant (!!)";
      } else if (drop < -15) {
        return "Great Move (!)";
      } else {
        return "Best Move";
      }
    } else if (drop < 15) {
      return "Excellent";
    } else {
      return "Good";
    }
  };

  const classification = getClassification();

  // Unified sentence selection
  useEffect(() => {
    if (classification === "Thinking") {
      return;
    }

    let pool: string[] = [];
    const playedMoveObj = history[viewIndex - 1];

    if (playedMoveObj) {
      const isCheckmate = playedMoveObj.san && playedMoveObj.san.endsWith("#");
      const isCheck = playedMoveObj.san && playedMoveObj.san.endsWith("+");
      const isCastle = playedMoveObj.san === "O-O" || playedMoveObj.san === "O-O-O" || (playedMoveObj.flags && (playedMoveObj.flags.includes("k") || playedMoveObj.flags.includes("q")));
      const isEnPassant = playedMoveObj.flags && playedMoveObj.flags.includes("e");
      const isPromotion = playedMoveObj.flags && playedMoveObj.flags.includes("p");
      const isQueenCapture = playedMoveObj.captured === "q";

      if (isCheckmate) {
        pool = CHECKMATE_SENTENCES;
      } else if (isCheck) {
        pool = CHECK_SENTENCES;
      } else if (isQueenCapture) {
        pool = QUEEN_CAPTURE_SENTENCES;
      } else if (isPromotion) {
        pool = PROMOTION_SENTENCES;
      } else if (isEnPassant) {
        pool = EN_PASSANT_SENTENCES;
      } else if (isCastle) {
        pool = CASTLE_SENTENCES;
      }
    }

    if (pool.length === 0) {
      switch (classification) {
        case "Start":
          pool = GREETING_SENTENCES;
          break;
        case "Book Move":
          pool = BOOK_SENTENCES;
          break;
        case "Brilliant (!!)":
        case "Great Move (!)":
        case "Best Move":
          pool = BEST_SENTENCES;
          break;
        case "Excellent":
        case "Good":
          pool = EXCELLENT_SENTENCES;
          break;
        case "Inaccuracy (?!)":
          pool = INACCURACY_SENTENCES;
          break;
        case "Mistake (?)":
          pool = MISTAKE_SENTENCES;
          break;
        case "Blunder (??)":
          pool = BLUNDER_SENTENCES;
          break;
        default:
          pool = EXCELLENT_SENTENCES;
      }
    }

    if (pool.length > 0) {
      const index = viewIndex % pool.length;
      const selectedSpeech = pool[index];
      
      // Update UI text
      setCurrentSpeech(selectedSpeech);
    }
  }, [classification, viewIndex, history]);

  // Determine styling color depending on move classification
  const getBadgeColor = () => {
    switch (classification) {
      case "Start":
        return { bg: "bg-blue-500/20 border-blue-500/30 text-blue-400 font-bold", label: "Coach" };
      case "Book Move":
        return { bg: "bg-orange-500/20 border-orange-500/30 text-orange-400 font-bold", label: "Book Move" };
      case "Brilliant (!!)":
        return { bg: "bg-cyan-500/20 border-cyan-500/30 text-cyan-400 font-bold animate-pulse", label: "Brilliant !!" };
      case "Great Move (!)":
        return { bg: "bg-teal-500/20 border-teal-500/30 text-teal-400 font-bold", label: "Great Move !" };
      case "Best Move":
        return { bg: "bg-green-500/20 border-green-500/30 text-green-400 font-bold", label: "Best Move" };
      case "Excellent":
        return { bg: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 font-bold", label: "Excellent" };
      case "Good":
        return { bg: "bg-zinc-500/20 border-zinc-500/30 text-zinc-300 font-bold", label: "Good Move" };
      case "Inaccuracy (?!)":
        return { bg: "bg-yellow-500/20 border-yellow-500/30 text-yellow-500 font-bold", label: "Inaccuracy ?!" };
      case "Mistake (?)":
        return { bg: "bg-amber-500/25 border-amber-500/30 text-amber-500 font-bold", label: "Mistake ?" };
      case "Blunder (??)":
        return { bg: "bg-red-500/25 border-red-500/30 text-red-500 font-bold animate-bounce", label: "Blunder ??" };
      case "Thinking":
        return { bg: "bg-gray-500/10 border-gray-500/20 text-gray-400", label: "Thinking..." };
      default:
        return { bg: "bg-blue-500/20 border-blue-500/30 text-blue-400", label: "Coach" };
    }
  };

  const badge = getBadgeColor();
  const analysisConfig = getAnalysisIconConfig(classification);
  const AnalysisIcon = analysisConfig.icon;
  const indicatorColor = getIndicatorColor(classification);

  if (isOnlineMatch) return null;

  return (
    <div 
      id="magnus-trainer-bubble"
      className={cn(
        "w-full backdrop-blur-md border rounded-2xl p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-3 shrink-0 shadow-lg select-none transition-all duration-300",
        theme === "black" ? "bg-black/40 border-white/10" : "bg-white border-black/10 shadow-[0_10px_40px_rgba(0,0,0,0.05)]"
      )}
    >
      {/* Dynamic Circular Analysis Icon reflecting the move quality */}
      <div className="relative flex flex-col items-center shrink-0">
        <div className={cn(
          "relative w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-tr border transition-all duration-300",
          analysisConfig.containerClass,
          theme === "white" && "ring-1 ring-black/5"
        )}>
          <AnalysisIcon className={cn("w-8 h-8 transition-all duration-300", analysisConfig.colorClass)} />
          <span className={cn(
            "absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2",
            theme === "black" ? "ring-[#121210]" : "ring-white",
            indicatorColor
          )} />
        </div>
        <div className="mt-2 text-center">
          <span className={cn("block text-[10px] font-black tracking-wider uppercase transition-colors duration-300", analysisConfig.colorClass)}>
            {analysisConfig.badgeText}
          </span>
          <span className="block text-[8px] font-semibold text-gray-400">
            {analysisConfig.subText}
          </span>
        </div>
      </div>

      {/* Speech bubble */}
      <div className={cn(
        "flex-1 w-full border rounded-2xl p-3.5 relative transition-all duration-300",
        theme === "black" ? "bg-[#1e1c18]/80 border-white/5" : "bg-neutral-50 border-black/5 shadow-sm"
      )}>
        {/* Triangle pointer for speech bubble */}
        <div className={cn(
          "hidden sm:block absolute top-5 -left-1.5 w-3 h-3 border-l border-b rotate-45",
          theme === "black" ? "bg-[#1e1c18] border-white/5" : "bg-neutral-50 border-black/5"
        )} />

        <div className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b pb-2 mb-2",
          theme === "black" ? "border-white/5" : "border-black/5"
        )}>
          <div className="flex items-center gap-1.5 text-xs text-green-400 font-bold">
            <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
            <span className={theme === "white" ? "text-emerald-600" : ""}>Real-time Move Analysis</span>
          </div>
          <span className={cn("text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider", badge.bg)}>
            {badge.label}
          </span>
        </div>

        <p className={cn(
          "text-xs sm:text-sm font-medium leading-relaxed italic pr-2 transition-all duration-300",
          theme === "black" ? "text-gray-100" : "text-gray-900"
        )}>
          "{currentSpeech}"
        </p>

        {/* Small motivational touch */}
        {classification !== "Start" && classification !== "Thinking" && (
          <div className="mt-2 flex items-center justify-end gap-1 text-[9px] text-gray-500">
            <span className="font-mono">Move {Math.ceil(viewIndex / 2)}</span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5 text-amber-500" />
              Active Analysis
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
