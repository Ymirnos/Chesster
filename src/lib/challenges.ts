
import { Chess } from "chess.js";

export interface Challenge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const CHALLENGES: Challenge[] = [
  // Original Challenges
  {
    id: "no_queen_w",
    name: "No White Queen",
    description: "Start without the White Queen.",
    icon: "👑"
  },
  {
    id: "no_queen_b",
    name: "No Black Queen",
    description: "Start without the Black Queen.",
    icon: "👑"
  },
  {
    id: "no_rooks_w",
    name: "No White Rooks",
    description: "Start without White Rooks.",
    icon: "🏰"
  },
  {
    id: "no_rooks_b",
    name: "No Black Rooks",
    description: "Start without Black Rooks.",
    icon: "🏰"
  },
  {
    id: "no_bishops_w",
    name: "No White Bishops",
    description: "Start without White Bishops.",
    icon: "🐘"
  },
  {
    id: "no_bishops_b",
    name: "No Black Bishops",
    description: "Start without Black Bishops.",
    icon: "🐘"
  },
  {
    id: "no_knights_w",
    name: "No White Knights",
    description: "Start without White Knights.",
    icon: "🐴"
  },
  {
    id: "no_knights_b",
    name: "No Black Knights",
    description: "Start without Black Knights.",
    icon: "🐴"
  },
  {
    id: "no_pawns_w",
    name: "No White Pawns",
    description: "Start without White Pawns.",
    icon: "♟️"
  },
  {
    id: "no_pawns_b",
    name: "No Black Pawns",
    description: "Start without Black Pawns.",
    icon: "♟️"
  },
  {
    id: "no_castling",
    name: "No Castling",
    description: "Castling is forbidden for both sides.",
    icon: "🛡️"
  },
  {
    id: "no_center_pawns",
    name: "No Center Pawns",
    description: "Moving E and D pawns is forbidden.",
    icon: "♟️"
  },
  {
    id: "no_retreat",
    name: "No Retreat",
    description: "Pieces cannot move backwards (except Knights & Kings).",
    icon: "🏃"
  },
  {
    id: "checkless",
    name: "Checkless Chess",
    description: "Giving check is illegal unless it's checkmate.",
    icon: "🚫"
  },
  {
    id: "protector",
    name: "Protector",
    description: "You cannot capture a piece that is protected.",
    icon: "🛡️"
  },
  {
    id: "pawn_storm",
    name: "Pawn Storm",
    description: "Pawns start one rank further ahead.",
    icon: "⚡"
  },
  {
    id: "ghost_rooks",
    name: "Ghost Rooks",
    description: "Rooks cannot capture pieces.",
    icon: "👻"
  },
  {
    id: "no_knight_moves",
    name: "Lame Knights",
    description: "Knights cannot move.",
    icon: "🚫"
  },
  {
    id: "pawn_only_captures",
    name: "Pawn Hunter",
    description: "Only pawns can capture opponent pieces.",
    icon: "⚔️"
  },
  {
    id: "peaceful_start",
    name: "Peaceful Start",
    description: "No captures allowed for the first 5 moves.",
    icon: "🕊️"
  },

  // 36 NEW HIGHLY CREATIVE CHALLENGES
  {
    id: "queen_battalion",
    name: "Queen Battalion",
    description: "Knights are replaced with extra Queens! Double Queen mayhem.",
    icon: "👑"
  },
  {
    id: "knight_frenzy",
    name: "Knight Frenzy",
    description: "All Rooks and Bishops are replaced by Knights. 6 Knights per side!",
    icon: "🐴"
  },
  {
    id: "advanced_knights",
    name: "Advanced Outposts",
    description: "Knights start already deployed on the 4th and 5th rank outposts.",
    icon: "⚡"
  },
  {
    id: "corner_kings",
    name: "Corner Kings",
    description: "Kings start trapped in opposite corners of the board (a1 & h8).",
    icon: "🏰"
  },
  {
    id: "queen_pacifist",
    name: "Pacifist Queen",
    description: "Queens are purely strategic commanders and cannot capture any piece.",
    icon: "🕊️"
  },
  {
    id: "no_queen_captures",
    name: "Untouchable Queen",
    description: "Neither player is allowed to capture the opponent's Queen.",
    icon: "🛡️"
  },
  {
    id: "knight_only_captures",
    name: "Knight Assassin",
    description: "Only Knights are trained to strike; other pieces cannot capture.",
    icon: "🐴"
  },
  {
    id: "rook_rampage",
    name: "Rook Rampage",
    description: "Only Rooks are allowed to capture opponent pieces.",
    icon: "🏰"
  },
  {
    id: "no_pawn_moves",
    name: "Frozen Pawns",
    description: "Pawns are frozen in place and cannot move throughout the game.",
    icon: "🧊"
  },
  {
    id: "must_capture",
    name: "Compulsory Strike",
    description: "If any legal capture move is available on the board, you MUST capture!",
    icon: "⚔️"
  },
  {
    id: "no_duplicate_piece",
    name: "Diversity Tactics",
    description: "You cannot move the same piece type twice in consecutive turns.",
    icon: "🔄"
  },
  {
    id: "no_back_rank",
    name: "No Retreating Back",
    description: "Once a piece leaves rank 1 or 8, it cannot return to the back rank.",
    icon: "🚫"
  },
  {
    id: "sacred_center",
    name: "Forbidden Center",
    description: "No piece is allowed to step into the central squares (d4, d5, e4, e5).",
    icon: "🛑"
  },
  {
    id: "king_must_check",
    name: "Relentless Check",
    description: "If a legal check move exists on your turn, you MUST give check!",
    icon: "⚡"
  },
  {
    id: "no_diagonal_captures",
    name: "Straight Strikes",
    description: "Diagonal captures are strictly forbidden for all pieces.",
    icon: "📐"
  },
  {
    id: "first_moves_pawns",
    name: "Pawn Prelude",
    description: "Your first 3 moves of the match MUST be pawn moves.",
    icon: "♟️"
  },
  {
    id: "no_flank_moves",
    name: "Central Channel",
    description: "Non-pawn pieces cannot land on flank files (a, b, g, h).",
    icon: "🎯"
  },
  {
    id: "heavy_artillery",
    name: "Heavy Artillery",
    description: "For the first 5 moves, only Rooks, Queens, and Pawns can move.",
    icon: "💣"
  },
  {
    id: "dark_realm",
    name: "Dark Realm",
    description: "Non-pawn pieces are restricted to stepping strictly on dark squares.",
    icon: "🌙"
  },
  {
    id: "light_realm",
    name: "Light Realm",
    description: "Non-pawn pieces are restricted to stepping strictly on light squares.",
    icon: "☀️"
  },
  {
    id: "noble_sacrifice",
    name: "Pacifist Pawns",
    description: "Capturing enemy pawns is forbidden; you can only capture major pieces.",
    icon: "🛡️"
  },
  {
    id: "no_bishop_captures",
    name: "Holy Immunity",
    description: "Bishops are sacred and cannot be captured by any enemy piece.",
    icon: "🐘"
  },
  {
    id: "no_knight_captures",
    name: "Nimble Knights",
    description: "Knights cannot be captured by enemy pieces.",
    icon: "🐴"
  },
  {
    id: "no_queen_moves_early",
    name: "Sleeping Queen",
    description: "Queens are sleeping and cannot move during the first 8 moves.",
    icon: "💤"
  },
  {
    id: "fortress_chess",
    name: "Fortress Siege",
    description: "No captures allowed for the first 8 moves of the match.",
    icon: "🏰"
  },
  {
    id: "mirror_master",
    name: "Mirror Master",
    description: "White plays any piece, then Black must mirror that piece type. Once Black moves, the cycle resets!",
    icon: "🪞"
  },
  {
    id: "sniper_bishops",
    name: "Sniper Army",
    description: "Knights are replaced by Bishops for high-distance tactical sniping.",
    icon: "🎯"
  },
  {
    id: "reverse_pawns",
    name: "Pawn Outposts",
    description: "White pawns start on rank 3, Black pawns start on rank 6.",
    icon: "⏩"
  },
  {
    id: "royal_guard",
    name: "Royal Guard",
    description: "King starts surrounded by extra heavy Rooks on c1/e1 and c8/e8.",
    icon: "🛡️"
  },
  {
    id: "lone_queen",
    name: "Lone Queen Challenge",
    description: "White starts with ONLY a King and Queen against a full army!",
    icon: "👑"
  }
];

export function getStartingFen(challenges: string[]): string {
  const chess = new Chess();
  
  if (challenges.includes("pawn_storm")) {
    return "rnbqkbnr/8/pppppppp/8/8/PPPPPPPP/8/RNBQKBNR w KQkq - 0 1";
  }

  if (challenges.includes("reverse_pawns")) {
    return "rnbqkbnr/8/pppppppp/8/8/PPPPPPPP/8/RNBQKBNR w KQkq - 0 1";
  }

  if (challenges.includes("queen_battalion")) {
    return "rqbqkbqr/pppppppp/8/8/8/8/PPPPPPPP/RQBQKBQR w KQkq - 0 1";
  }

  if (challenges.includes("knight_frenzy")) {
    return "nnnqknnn/pppppppp/8/8/8/8/PPPPPPPP/NNNQKNNN w - - 0 1";
  }

  if (challenges.includes("advanced_knights")) {
    return "r1bqkb1r/pppppppp/8/1n4n1/1N4N1/8/PPPPPPPP/R1BQKB1R w KQkq - 0 1";
  }

  if (challenges.includes("corner_kings")) {
    return "k1bqn1r1/pppppppp/8/8/8/8/PPPPPPPP/R1BQNB1K w - - 0 1";
  }

  if (challenges.includes("royal_guard")) {
    return "rrkqqrrb/pppppppp/8/8/8/8/PPPPPPPP/RRKQQRRB w - - 0 1";
  }

  if (challenges.includes("sniper_bishops")) {
    return "rbbqkbbr/pppppppp/8/8/8/8/PPPPPPPP/RBBQKBBR w KQkq - 0 1";
  }

  if (challenges.includes("lone_queen")) {
    return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/3QK3 w - - 0 1";
  }

  if (challenges.length === 0) return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  if (challenges.includes("no_queen_w")) {
    chess.remove("d1");
  }
  if (challenges.includes("no_queen_b")) {
    chess.remove("d8");
  }
  if (challenges.includes("no_rooks_w")) {
    chess.remove("a1");
    chess.remove("h1");
  }
  if (challenges.includes("no_rooks_b")) {
    chess.remove("a8");
    chess.remove("h8");
  }
  if (challenges.includes("no_bishops_w")) {
    chess.remove("c1");
    chess.remove("f1");
  }
  if (challenges.includes("no_bishops_b")) {
    chess.remove("c8");
    chess.remove("f8");
  }
  if (challenges.includes("no_knights_w")) {
    chess.remove("b1");
    chess.remove("g1");
  }
  if (challenges.includes("no_knights_b")) {
    chess.remove("b8");
    chess.remove("g8");
  }
  if (challenges.includes("no_pawns_w")) {
    ['a2','b2','c2','d2','e2','f2','g2','h2'].forEach(s => chess.remove(s as any));
  }
  if (challenges.includes("no_pawns_b")) {
    ['a7','b7','c7','d7','e7','f7','g7','h7'].forEach(s => chess.remove(s as any));
  }

  // Handle castling rights if pieces are removed
  let fen = chess.fen();
  
  // Clean up FEN castling section if it became empty
  const parts = fen.split(" ");
  let castling = parts[2];

  if (challenges.includes("no_rooks_w")) {
    castling = castling.replace("K", "").replace("Q", "");
  }
  if (challenges.includes("no_rooks_b")) {
    castling = castling.replace("k", "").replace("q", "");
  }
  if (challenges.includes("no_castling")) {
    castling = "-";
  }

  parts[2] = castling === "" ? "-" : castling;
  
  return parts.join(" ");
}
