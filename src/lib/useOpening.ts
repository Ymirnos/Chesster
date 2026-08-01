import { useState, useEffect, useRef } from "react";

export interface OpeningInfo {
  eco: string;
  name: string;
}

export interface BookMove {
  uci: string;
  san: string;
  averageRating: number;
  white: number;
  draws: number;
  black: number;
}

export function useOpening(fen: string) {
  const [opening, setOpening] = useState<OpeningInfo | null>(null);
  const [bookMoves, setBookMoves] = useState<BookMove[]>([]);
  const lastFoundOpening = useRef<OpeningInfo | null>(null);

  useEffect(() => {
    const fenSplit = fen.split(" ");
    const moveNumber = parseInt(fenSplit[5] || "1", 10);
    
    // We stop looking strictly after a certain point, but we keep the last one found
    if (moveNumber > 35) return;

    let isMounted = true;
    const fetchOpening = async () => {
      try {
        const res = await fetch(`https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(fen)}&topGames=0&recentGames=0`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (isMounted) {
          if (data.opening) {
            setOpening(data.opening);
            lastFoundOpening.current = data.opening;
          } else if (moveNumber > 1) {
            setOpening(lastFoundOpening.current);
          } else {
             setOpening(null);
             lastFoundOpening.current = null;
          }

          if (data.moves) {
            setBookMoves(data.moves.slice(0, 5));
          } else {
            setBookMoves([]);
          }
        }
      } catch (err) {
        // ignore
      }
    };

    const timeout = setTimeout(fetchOpening, 200); 
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [fen]);

  return { opening, bookMoves };
}
