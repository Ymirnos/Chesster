import { useState, useCallback, useEffect, useRef } from "react";
import { Chess, Move } from "chess.js";
import { playSound } from "./audio";

export type TimeControl = {
  white: number;
  black: number;
};

export function isValidChallengeMove(
  game: Chess,
  move: { from: string; to: string; promotion?: string },
  challenges: string[]
): boolean {
  if (!move || !move.from || !move.to) return false;
  const gClone = new Chess(game.fen());

  if (challenges.length > 0) {
    const piece = gClone.get(move.from as any);
    if (!piece) return false;

    // No Castling
    if (challenges.includes("no_castling")) {
      if (piece.type === 'k' && Math.abs(move.from.charCodeAt(0) - move.to.charCodeAt(0)) > 1) {
        return false;
      }
    }

    // No Center Pawns
    if (challenges.includes("no_center_pawns")) {
      if (piece.type === 'p' && (move.from.startsWith('d') || move.from.startsWith('e'))) {
        return false;
      }
    }

    // No Knight Moves
    if (challenges.includes("no_knight_moves")) {
      if (piece.type === 'n') {
        return false;
      }
    }

    // No Retreat (Pieces cannot move backwards, except Knights and Kings)
    if (challenges.includes("no_retreat")) {
      if (piece.type !== 'n' && piece.type !== 'k') {
        const fromRank = parseInt(move.from[1]);
        const toRank = parseInt(move.to[1]);
        if (piece.color === 'w' && toRank < fromRank) return false;
        if (piece.color === 'b' && toRank > fromRank) return false;
      }
    }

    // Ghost Rooks (Rooks cannot capture)
    if (challenges.includes("ghost_rooks")) {
      if (piece.type === 'r') {
        const destPiece = gClone.get(move.to as any);
        if (destPiece) return false;
      }
    }

    // Protector (Cannot capture a protected piece)
    if (challenges.includes("protector")) {
      const destPiece = gClone.get(move.to as any);
      if (destPiece) {
        const defenderColor = destPiece.color;
        const protectorCheck = new Chess(gClone.fen());
        const fenParts = protectorCheck.fen().split(' ');
        fenParts[1] = defenderColor;
        protectorCheck.load(fenParts.join(' '));
        if (protectorCheck.attackers(move.to as any, defenderColor).length > 0) {
          return false;
        }
      }
    }

    // Pacifist Queen
    if (challenges.includes("queen_pacifist")) {
      if (piece.type === 'q' && gClone.get(move.to as any)) {
        return false;
      }
    }

    // Untouchable Queen
    if (challenges.includes("no_queen_captures")) {
      const destPiece = gClone.get(move.to as any);
      if (destPiece && destPiece.type === 'q') return false;
    }

    // Knight Assassin
    if (challenges.includes("knight_only_captures")) {
      const destPiece = gClone.get(move.to as any);
      if (destPiece && piece.type !== 'n') return false;
    }

    // Rook Rampage
    if (challenges.includes("rook_rampage")) {
      const destPiece = gClone.get(move.to as any);
      if (destPiece && piece.type !== 'r') return false;
    }

    // Frozen Pawns
    if (challenges.includes("no_pawn_moves")) {
      if (piece.type === 'p') return false;
    }

    // Diversity Tactics
    if (challenges.includes("no_duplicate_piece")) {
      const historyVerbose = game.history({ verbose: true });
      const myMoves = historyVerbose.filter(m => m.color === piece.color);
      if (myMoves.length > 0) {
        const lastMyMove = myMoves[myMoves.length - 1];
        if (lastMyMove.piece === piece.type) return false;
      }
    }

    // No Retreating Back
    if (challenges.includes("no_back_rank")) {
      const backRank = piece.color === 'w' ? '1' : '8';
      if (move.from[1] !== backRank && move.to[1] === backRank && piece.type !== 'k' && piece.type !== 'p') {
        return false;
      }
    }

    // Forbidden Center (d4, d5, e4, e5)
    if (challenges.includes("sacred_center")) {
      if (['d4','d5','e4','e5'].includes(move.to)) return false;
    }

    // Straight Strikes (No diagonal captures)
    if (challenges.includes("no_diagonal_captures")) {
      const destPiece = gClone.get(move.to as any);
      if (destPiece) {
        const fromFile = move.from.charCodeAt(0);
        const toFile = move.to.charCodeAt(0);
        const fromRank = parseInt(move.from[1]);
        const toRank = parseInt(move.to[1]);
        if (Math.abs(fromFile - toFile) === Math.abs(fromRank - toRank)) return false;
      }
    }

    // Pawn Prelude
    if (challenges.includes("first_moves_pawns")) {
      const historyVerbose = game.history({ verbose: true });
      const myMovesCount = historyVerbose.filter(m => m.color === piece.color).length;
      if (myMovesCount < 3 && piece.type !== 'p') return false;
    }

    // Central Channel
    if (challenges.includes("no_flank_moves")) {
      if (piece.type !== 'p' && ['a','b','g','h'].includes(move.to[0])) return false;
    }

    // Heavy Artillery
    if (challenges.includes("heavy_artillery")) {
      const historyVerbose = game.history({ verbose: true });
      const myMovesCount = historyVerbose.filter(m => m.color === piece.color).length;
      if (myMovesCount < 5 && !['r','q','p'].includes(piece.type)) return false;
    }

    // Dark Realm / Light Realm
    if (challenges.includes("dark_realm") || challenges.includes("light_realm")) {
      if (piece.type !== 'p') {
        const fileIdx = move.to.charCodeAt(0) - 97;
        const rankIdx = parseInt(move.to[1]) - 1;
        const isLightSquare = (fileIdx + rankIdx) % 2 !== 0;
        if (challenges.includes("dark_realm") && isLightSquare) return false;
        if (challenges.includes("light_realm") && !isLightSquare) return false;
      }
    }

    // Pacifist Pawns
    if (challenges.includes("noble_sacrifice")) {
      const destPiece = gClone.get(move.to as any);
      if (destPiece && destPiece.type === 'p') return false;
    }

    // Holy Immunity
    if (challenges.includes("no_bishop_captures")) {
      const destPiece = gClone.get(move.to as any);
      if (destPiece && destPiece.type === 'b') return false;
    }

    // Nimble Knights
    if (challenges.includes("no_knight_captures")) {
      const destPiece = gClone.get(move.to as any);
      if (destPiece && destPiece.type === 'n') return false;
    }

    // Sleeping Queen
    if (challenges.includes("no_queen_moves_early")) {
      const historyVerbose = game.history({ verbose: true });
      const myMovesCount = historyVerbose.filter(m => m.color === piece.color).length;
      if (myMovesCount < 8 && piece.type === 'q') return false;
    }

    // Mirror Master
    if (challenges.includes("mirror_master")) {
      const historyVerbose = game.history({ verbose: true });
      // Only enforcing mirror on odd history lengths (2nd move of each 2-move pair cycle)
      if (historyVerbose.length % 2 === 1) {
        const lastOppMove = historyVerbose[historyVerbose.length - 1];
        if (lastOppMove.color !== piece.color) {
          const allMoves = gClone.moves({ verbose: true });
          const hasMatchingMove = allMoves.some(m => {
            const p = gClone.get(m.from as any);
            return p && p.type === lastOppMove.piece;
          });
          if (hasMatchingMove && piece.type !== lastOppMove.piece) return false;
        }
      }
    }
  }

  let result;
  try {
    result = gClone.move(move);
  } catch {
    return false;
  }

  if (!result) return false;

  // Post-move challenge validation
  if (challenges.length > 0) {
    // Checkless Chess (Giving check is illegal unless it's mate)
    if (challenges.includes("checkless")) {
      if (gClone.inCheck() && !gClone.isCheckmate()) {
        return false;
      }
    }
    // Pawn Only Captures
    if (challenges.includes("pawn_only_captures")) {
      if (result.captured && result.piece !== 'p') {
        return false;
      }
    }

    // Peaceful Start / Fortress Siege
    if (challenges.includes("peaceful_start") || challenges.includes("fortress_chess")) {
      const minMoves = challenges.includes("fortress_chess") ? 16 : 10;
      if (result.captured && game.history().length < minMoves) {
        return false;
      }
    }

    // Compulsory Strike
    if (challenges.includes("must_capture")) {
      if (!result.captured) {
        const allPrevMoves = game.moves({ verbose: true });
        const hadCapture = allPrevMoves.some(m => m.captured);
        if (hadCapture) return false;
      }
    }

    // Relentless Check
    if (challenges.includes("king_must_check")) {
      if (!gClone.inCheck()) {
        const allPrevMoves = game.moves({ verbose: true });
        const hadCheck = allPrevMoves.some(m => m.san.includes('+') || m.san.includes('#'));
        if (hadCheck) return false;
      }
    }
  }

  return true;
}

export function useChessGame(initialTimeSeconds: number = 600, initialFen?: string, challenges: string[] = []) {
  const [game, setGame] = useState(new Chess(initialFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"));
  const [history, setHistory] = useState<Move[]>([]);
  const [fens, setFens] = useState<string[]>([initialFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]);
  const [viewIndex, setViewIndex] = useState<number>(0); // Direct index inside fens array (0 to fens.length - 1)
  
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState("");

  const [timers, setTimers] = useState<TimeControl>({
    white: initialTimeSeconds,
    black: initialTimeSeconds,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Highlighting states
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);

  // Derived visible game state
  const isViewingHistory = viewIndex < fens.length - 1;
  const currentViewIndex = viewIndex - 1;

  const stopAnimation = useCallback(() => {
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    };
  }, []);
  
  // Use absolute latest fen when isViewingHistory is false to avoid snapping issues
  const displayFen = fens[viewIndex] || game.fen();

  const lastMoveSquares = currentViewIndex >= 0 && history[currentViewIndex] 
    ? [history[currentViewIndex].from, history[currentViewIndex].to] 
    : [];

  // We need a visible game instance to generate legal moves if viewing history
  const displayGame = isViewingHistory ? new Chess(displayFen) : game;

  // Check game over
  useEffect(() => {
    if (game.isCheckmate()) {
      setIsGameOver(true);
      setGameOverReason(game.turn() === "w" ? "Black won by checkmate" : "White won by checkmate");
    } else if (game.isStalemate()) {
      setIsGameOver(true);
      setGameOverReason("Stalemate");
    } else if (game.isThreefoldRepetition()) {
      setIsGameOver(true);
      setGameOverReason("Draw by repetition");
    } else if (game.isInsufficientMaterial()) {
      setIsGameOver(true);
      setGameOverReason("Draw by insufficient material");
    } else if (game.isDraw()) {
      setIsGameOver(true);
      setGameOverReason("Draw");
    }
  }, [game.fen()]);

  // Handle timers (only counts down if clock running and not over)
  useEffect(() => {
    if (isGameOver || history.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const turn = game.turn();
    timerRef.current = setInterval(() => {
      setTimers((prev) => {
        const nextTime = prev[turn === "w" ? "white" : "black"] - 1;
        
        if (nextTime <= 0) {
          setIsGameOver(true);
          setGameOverReason(turn === "w" ? "Black won on time" : "White won on time");
          clearInterval(timerRef.current!);
          return prev;
        }

        return {
          ...prev,
          [turn === "w" ? "white" : "black"]: nextTime,
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game.fen(), isGameOver, history.length]);

  const makeMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    try {
      stopAnimation();
      
      let activeHistory = history;
      let activeFens = fens;
      if (isViewingHistory) {
        // If viewing history, truncate history up to current FEN index
        activeHistory = history.slice(0, viewIndex);
        activeFens = fens.slice(0, viewIndex + 1);
      }

      const currentBoardFen = isViewingHistory ? fens[viewIndex] : game.fen();
      const gClone = new Chess(currentBoardFen);

      // Check Challenges
      if (challenges.length > 0) {
        const piece = gClone.get(move.from as any);
        if (!piece) return false;

        // No Castling
        if (challenges.includes("no_castling")) {
          if (piece.type === 'k' && Math.abs(move.from.charCodeAt(0) - move.to.charCodeAt(0)) > 1) {
            return false;
          }
        }

        // No Center Pawns
        if (challenges.includes("no_center_pawns")) {
          if (piece.type === 'p' && (move.from.startsWith('d') || move.from.startsWith('e'))) {
            return false;
          }
        }

        // No Knight Moves
        if (challenges.includes("no_knight_moves")) {
          if (piece.type === 'n') {
            return false;
          }
        }

        // No Retreat (Pieces cannot move backwards, except Knights and Kings)
        if (challenges.includes("no_retreat")) {
          if (piece.type !== 'n' && piece.type !== 'k') {
            const fromRank = parseInt(move.from[1]);
            const toRank = parseInt(move.to[1]);
            if (piece.color === 'w' && toRank < fromRank) return false;
            if (piece.color === 'b' && toRank > fromRank) return false;
          }
        }

        // Ghost Rooks (Rooks cannot capture)
        if (challenges.includes("ghost_rooks")) {
          if (piece.type === 'r') {
            const destPiece = gClone.get(move.to as any);
            if (destPiece) return false;
          }
        }

        // Protector (Cannot capture a protected piece)
        if (challenges.includes("protector")) {
          const destPiece = gClone.get(move.to as any);
          if (destPiece) {
            const defenderColor = destPiece.color;
            const protectorCheck = new Chess(gClone.fen());
            const fenParts = protectorCheck.fen().split(' ');
            fenParts[1] = defenderColor;
            protectorCheck.load(fenParts.join(' '));
            if (protectorCheck.attackers(move.to as any, defenderColor).length > 0) {
              return false;
            }
          }
        }

        // Pacifist Queen
        if (challenges.includes("queen_pacifist")) {
          if (piece.type === 'q' && gClone.get(move.to as any)) {
            return false;
          }
        }

        // Untouchable Queen
        if (challenges.includes("no_queen_captures")) {
          const destPiece = gClone.get(move.to as any);
          if (destPiece && destPiece.type === 'q') return false;
        }

        // Knight Assassin
        if (challenges.includes("knight_only_captures")) {
          const destPiece = gClone.get(move.to as any);
          if (destPiece && piece.type !== 'n') return false;
        }

        // Rook Rampage
        if (challenges.includes("rook_rampage")) {
          const destPiece = gClone.get(move.to as any);
          if (destPiece && piece.type !== 'r') return false;
        }

        // Frozen Pawns
        if (challenges.includes("no_pawn_moves")) {
          if (piece.type === 'p') return false;
        }

        // Diversity Tactics
        if (challenges.includes("no_duplicate_piece")) {
          const historyVerbose = game.history({ verbose: true });
          const myMoves = historyVerbose.filter(m => m.color === piece.color);
          if (myMoves.length > 0) {
            const lastMyMove = myMoves[myMoves.length - 1];
            if (lastMyMove.piece === piece.type) return false;
          }
        }

        // No Retreating Back
        if (challenges.includes("no_back_rank")) {
          const backRank = piece.color === 'w' ? '1' : '8';
          if (move.from[1] !== backRank && move.to[1] === backRank && piece.type !== 'k' && piece.type !== 'p') {
            return false;
          }
        }

        // Forbidden Center (d4, d5, e4, e5)
        if (challenges.includes("sacred_center")) {
          if (['d4','d5','e4','e5'].includes(move.to)) return false;
        }

        // Straight Strikes (No diagonal captures)
        if (challenges.includes("no_diagonal_captures")) {
          const destPiece = gClone.get(move.to as any);
          if (destPiece) {
            const fromFile = move.from.charCodeAt(0);
            const toFile = move.to.charCodeAt(0);
            const fromRank = parseInt(move.from[1]);
            const toRank = parseInt(move.to[1]);
            if (Math.abs(fromFile - toFile) === Math.abs(fromRank - toRank)) return false;
          }
        }

        // Pawn Prelude
        if (challenges.includes("first_moves_pawns")) {
          const historyVerbose = game.history({ verbose: true });
          const myMovesCount = historyVerbose.filter(m => m.color === piece.color).length;
          if (myMovesCount < 3 && piece.type !== 'p') return false;
        }

        // Central Channel
        if (challenges.includes("no_flank_moves")) {
          if (piece.type !== 'p' && ['a','b','g','h'].includes(move.to[0])) return false;
        }

        // Heavy Artillery
        if (challenges.includes("heavy_artillery")) {
          const historyVerbose = game.history({ verbose: true });
          const myMovesCount = historyVerbose.filter(m => m.color === piece.color).length;
          if (myMovesCount < 5 && !['r','q','p'].includes(piece.type)) return false;
        }

        // Dark Realm / Light Realm
        if (challenges.includes("dark_realm") || challenges.includes("light_realm")) {
          if (piece.type !== 'p') {
            const fileIdx = move.to.charCodeAt(0) - 97;
            const rankIdx = parseInt(move.to[1]) - 1;
            const isLightSquare = (fileIdx + rankIdx) % 2 !== 0;
            if (challenges.includes("dark_realm") && isLightSquare) return false;
            if (challenges.includes("light_realm") && !isLightSquare) return false;
          }
        }

        // Pacifist Pawns
        if (challenges.includes("noble_sacrifice")) {
          const destPiece = gClone.get(move.to as any);
          if (destPiece && destPiece.type === 'p') return false;
        }

        // Holy Immunity
        if (challenges.includes("no_bishop_captures")) {
          const destPiece = gClone.get(move.to as any);
          if (destPiece && destPiece.type === 'b') return false;
        }

        // Nimble Knights
        if (challenges.includes("no_knight_captures")) {
          const destPiece = gClone.get(move.to as any);
          if (destPiece && destPiece.type === 'n') return false;
        }

        // Sleeping Queen
        if (challenges.includes("no_queen_moves_early")) {
          const historyVerbose = game.history({ verbose: true });
          const myMovesCount = historyVerbose.filter(m => m.color === piece.color).length;
          if (myMovesCount < 8 && piece.type === 'q') return false;
        }

        // Mirror Master
        if (challenges.includes("mirror_master")) {
          const historyVerbose = game.history({ verbose: true });
          // Only enforcing mirror on odd history lengths (2nd move of each 2-move pair cycle)
          if (historyVerbose.length % 2 === 1) {
            const lastOppMove = historyVerbose[historyVerbose.length - 1];
            if (lastOppMove.color !== piece.color) {
              const allMoves = gClone.moves({ verbose: true });
              const hasMatchingMove = allMoves.some(m => {
                const p = gClone.get(m.from as any);
                return p && p.type === lastOppMove.piece;
              });
              if (hasMatchingMove && piece.type !== lastOppMove.piece) return false;
            }
          }
        }
      }

      const result = gClone.move(move);
      
      if (result) {
        // Post-move challenge validation
        if (challenges.length > 0) {
          // Checkless Chess (Giving check is illegal unless it's mate)
          if (challenges.includes("checkless")) {
            if (gClone.inCheck() && !gClone.isCheckmate()) {
              return false;
            }
          }
          // Pawn Only Captures
          if (challenges.includes("pawn_only_captures")) {
            if (result.captured && result.piece !== 'p') {
              return false;
            }
          }

          // Peaceful Start / Fortress Siege
          if (challenges.includes("peaceful_start") || challenges.includes("fortress_chess")) {
            const minMoves = challenges.includes("fortress_chess") ? 16 : 10;
            if (result.captured && game.history().length < minMoves) {
              return false;
            }
          }

          // Compulsory Strike
          if (challenges.includes("must_capture")) {
            if (!result.captured) {
              const allPrevMoves = game.moves({ verbose: true });
              const hadCapture = allPrevMoves.some(m => m.captured);
              if (hadCapture) return false;
            }
          }

          // Relentless Check
          if (challenges.includes("king_must_check")) {
            if (!gClone.inCheck()) {
              const allPrevMoves = game.moves({ verbose: true });
              const hadCheck = allPrevMoves.some(m => m.san.includes('+') || m.san.includes('#'));
              if (hadCheck) return false;
            }
          }
        }

        const nextHistory = [...activeHistory, result];
        const nextFens = [...activeFens, gClone.fen()];
        
        setGame(gClone);
        setHistory(nextHistory);
        setFens(nextFens);
        setViewIndex(nextFens.length - 1);

        setSelectedSquare(null);
        setPossibleMoves([]);
        
        if (gClone.isGameOver()) {
          setIsGameOver(true);
          if (gClone.isCheckmate()) {
            setGameOverReason(gClone.turn() === "w" ? "Black won by checkmate" : "White won by checkmate");
          } else if (gClone.isStalemate()) {
            setGameOverReason("Stalemate");
          } else if (gClone.isThreefoldRepetition()) {
            setGameOverReason("Draw by repetition");
          } else if (gClone.isInsufficientMaterial()) {
            setGameOverReason("Draw by insufficient material");
          } else if (gClone.isDraw()) {
            setGameOverReason("Draw");
          }
          playSound('gameEnd');
        } else if (gClone.inCheck()) {
          playSound('check');
        } else if (result.flags.includes("k") || result.flags.includes("q")) {
          playSound('castle');
        } else if (result.promotion || result.flags.includes('p')) {
          playSound('promote');
        } else if (result.captured) {
          playSound('capture');
        } else {
          playSound('move');
        }
        
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [game, isViewingHistory, displayFen, history, fens, currentViewIndex, stopAnimation]);

  const undoMove = useCallback(() => {
    stopAnimation();
    setViewIndex((prev) => Math.max(0, prev - 1));
  }, [stopAnimation]);

  const redoMove = useCallback(() => {
    stopAnimation();
    setViewIndex((prev) => Math.min(fens.length - 1, prev + 1));
  }, [fens.length, stopAnimation]);

  const resetGame = useCallback(() => {
    stopAnimation();
    const g = new Chess();
    setGame(g);
    setFens([g.fen()]);
    setHistory([]);
    setViewIndex(0);
    setIsGameOver(false);
    setGameOverReason("");
    setTimers({ white: initialTimeSeconds, black: initialTimeSeconds });
    setSelectedSquare(null);
    setPossibleMoves([]);
    playSound("move");
  }, [initialTimeSeconds]);

  const resign = useCallback((player: "w" | "b") => {
    setIsGameOver(true);
    setGameOverReason(player === "w" ? "Black won by resignation" : "White won by resignation");
    playSound("gameEnd");
  }, []);

  const claimDraw = useCallback(() => {
    setIsGameOver(true);
    setGameOverReason("Draw by agreement");
    playSound("gameEnd");
  }, []);

  const loadPGN = useCallback((pgn: string) => {
    try {
      stopAnimation();
      const tempGame = new Chess();
      tempGame.loadPgn(pgn);
      const historyMoves = tempGame.history({ verbose: true }) as Move[];
      
      const replayGame = new Chess();
      const tempFens = [replayGame.fen()];
      for (const m of historyMoves) {
        replayGame.move(m);
        tempFens.push(replayGame.fen());
      }
      
      setGame(replayGame);
      setHistory(historyMoves);
      setFens(tempFens);
      
      // Extract result and termination from PGN headers
      const resultMatch = pgn.match(/\[Result\s+"([^"]+)"\]/);
      const terminationMatch = pgn.match(/\[Termination\s+"([^"]+)"\]/);
      const pgnResult = resultMatch ? resultMatch[1] : null;
      const pgnTermination = terminationMatch ? terminationMatch[1] : null;

      const isPgnGameOver = tempGame.isGameOver() || (pgnResult && pgnResult !== "*");
      
      let reason = "Game loaded";
      if (tempGame.isCheckmate()) {
        reason = tempGame.turn() === "w" ? "Black won by checkmate" : "White won by checkmate";
      } else if (tempGame.isDraw() || tempGame.isStalemate() || tempGame.isThreefoldRepetition() || tempGame.isInsufficientMaterial()) {
        reason = "Draw";
      } else {
        const termLower = pgnTermination ? pgnTermination.toLowerCase() : "";
        let type = "resignation";
        if (termLower.includes("resign")) {
          type = "resignation";
        } else if (termLower.includes("abandon") || termLower.includes("leave") || termLower.includes("disconnect")) {
          type = "abandonment";
        } else if (termLower.includes("time") || termLower.includes("clock") || termLower.includes("timeout")) {
          type = "time";
        } else if (termLower.includes("agreement")) {
          type = "agreement";
        }

        if (pgnResult === "1-0") {
          reason = `White won by ${type}`;
        } else if (pgnResult === "0-1") {
          reason = `Black won by ${type}`;
        } else if (pgnResult === "1/2-1/2") {
          reason = `Draw by ${type}`;
        } else if (pgnTermination) {
          reason = pgnTermination;
        }
      }

      // Start of replay: position board at the key start index
      setViewIndex(0);
      setIsGameOver(isPgnGameOver);
      setGameOverReason(reason);
      setTimers({ white: initialTimeSeconds, black: initialTimeSeconds });
      setSelectedSquare(null);
      setPossibleMoves([]);
      playSound("move");

      // Setup sequential replaying interval with comfortably slow steps
      let currentIdx = 0;
      const finalIdx = tempFens.length - 1;
      animationTimerRef.current = setInterval(() => {
        currentIdx++;
        if (currentIdx > finalIdx) {
          if (animationTimerRef.current) {
            clearInterval(animationTimerRef.current);
            animationTimerRef.current = null;
          }
          return;
        }

        setViewIndex(currentIdx);

        // Play matching coordinate audio
        const currentMove = historyMoves[currentIdx - 1];
        if (currentMove) {
          if (currentMove.captured) {
            playSound("capture");
          } else if (currentMove.flags.includes("p") || currentMove.promotion) {
            playSound("promote");
          } else {
            playSound("move");
          }
        }
      }, 1000);

      return true;
    } catch (err) {
      console.error("loadPGN error:", err);
      return false;
    }
  }, [initialTimeSeconds, stopAnimation]);

  const loadMoveListUci = useCallback((movesUci: string[], startingFromCurrent: boolean = false) => {
    try {
      stopAnimation();
      
      const baseGame = startingFromCurrent ? new Chess(game.fen()) : new Chess();
      const baseHistory = startingFromCurrent ? [...history] : [];
      const baseFens = startingFromCurrent ? [...fens] : [baseGame.fen()];
      
      const replayGame = new Chess(baseGame.fen());
      const historyMoves = [...baseHistory];
      const tempFens = [...baseFens];
      const startIndex = baseHistory.length;
      
      for (const moveStr of movesUci) {
        if (!moveStr) continue;
        const from = moveStr.substring(0, 2);
        const to = moveStr.substring(2, 4);
        const prom = moveStr.length === 5 ? moveStr[4] : undefined;
        let result: Move | null = null;
        try {
          if (prom) {
            result = replayGame.move({ from, to, promotion: prom }) as Move;
          } else {
            try {
              result = replayGame.move({ from, to }) as Move;
            } catch (err) {
              result = replayGame.move({ from, to, promotion: "q" }) as Move;
            }
          }
        } catch (innerErr) {
          console.warn("Invalid move attempted in UCI loader:", moveStr, innerErr);
        }
        if (result) {
          historyMoves.push(result as Move);
          tempFens.push(replayGame.fen());
        }
      }
      
      setGame(replayGame);
      setHistory(historyMoves);
      setFens(tempFens);
      
      // Start of replay: position board at the key start index
      setViewIndex(startingFromCurrent ? startIndex : 0);
      setIsGameOver(replayGame.isGameOver());
      if (replayGame.isGameOver()) {
        if (replayGame.isCheckmate()) {
          setGameOverReason(replayGame.turn() === "w" ? "Black won by checkmate" : "White won by checkmate");
        } else if (replayGame.isStalemate()) {
          setGameOverReason("Stalemate");
        } else if (replayGame.isThreefoldRepetition()) {
          setGameOverReason("Draw by repetition");
        } else if (replayGame.isInsufficientMaterial()) {
          setGameOverReason("Draw by insufficient material");
        } else if (replayGame.isDraw()) {
          setGameOverReason("Draw");
        }
      } else {
        setGameOverReason("");
      }
      setTimers({ white: initialTimeSeconds, black: initialTimeSeconds });
      setSelectedSquare(null);
      setPossibleMoves([]);
      playSound("move");

      // Setup sequential replaying interval with comfortably slow steps
      let currentIdx = startingFromCurrent ? startIndex : 0;
      const finalIdx = tempFens.length - 1;
      
      animationTimerRef.current = setInterval(() => {
        currentIdx++;
        if (currentIdx > finalIdx) {
          if (animationTimerRef.current) {
            clearInterval(animationTimerRef.current);
            animationTimerRef.current = null;
          }
          return;
        }

        setViewIndex(currentIdx);

        // Play matching coordinate audio
        const currentMove = historyMoves[currentIdx - 1];
        if (currentMove) {
          if (currentMove.captured) {
            playSound("capture");
          } else if (currentMove.flags.includes("p") || currentMove.promotion) {
            playSound("promote");
          } else {
            playSound("move");
          }
        }
      }, 1000);

      return true;
    } catch (err) {
      console.error("loadMoveListUci error:", err);
      return false;
    }
  }, [game, history, fens, initialTimeSeconds, stopAnimation]);

  const checkSquare = (() => {
    if (!displayGame.inCheck()) return null;
    const board = displayGame.board();
    const turn = displayGame.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          const rank = 8 - r;
          return `${files[c]}${rank}`;
        }
      }
    }
    return null;
  })();

  const getValidChallengeMoves = useCallback(() => {
    const currentBoardFen = isViewingHistory ? fens[viewIndex] : game.fen();
    const currentBoard = new Chess(currentBoardFen);
    const moves = currentBoard.moves({ verbose: true });
    return moves.filter(m => isValidChallengeMove(currentBoard, { from: m.from, to: m.to, promotion: m.promotion || 'q' }, challenges));
  }, [game, fens, isViewingHistory, viewIndex, challenges]);

  return {
    game: displayGame,
    fen: displayFen,
    fens,
    history,
    makeMove,
    getValidChallengeMoves,
    isGameOver,
    setIsGameOver,
    gameOverReason,
    setGameOverReason,
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
    loadMoveListUci
  };
}
