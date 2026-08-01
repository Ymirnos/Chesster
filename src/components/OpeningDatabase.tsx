import React, { useState, useEffect } from "react";
import { 
  Search, Database, BookOpen, Plus, Trash, Play, Flame, 
  ShieldAlert, Swords, Globe, RefreshCw, AlertCircle, Wand2 
} from "lucide-react";
import { Chess } from "chess.js";

export interface OpeningItem {
  id: string;
  eco: string;
  name: string;
  type: "opening" | "defense" | "gambit" | "variation";
  moves: string;
  moves_uci: string[];
  description: string;
  arrows?: [string, string, string][];
}

import { cn } from "../lib/utils";

interface OpeningDatabaseProps {
  onLoadMoveList: (movesUci: string[]) => void;
  onLoadPGN: (pgn: string, whiteName?: string, blackName?: string, whiteRating?: number, blackRating?: number) => void;
  onSetAiArrows: (arrows: [string, string, string][]) => void;
  theme?: "black" | "white";
}

export function OpeningDatabase({ onLoadMoveList, onLoadPGN, onSetAiArrows, theme = "black" }: OpeningDatabaseProps) {
  // DB States
  const [openings, setOpenings] = useState<OpeningItem[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingOpening, setViewingOpening] = useState<OpeningItem | null>(null);

  // Add Custom Opening Modal/Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEco, setNewEco] = useState("C00");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"opening" | "defense" | "gambit" | "variation">("opening");
  const [newMoves, setNewMoves] = useState("");
  const [newMovesUci, setNewMovesUci] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Chess.com States
  const [username, setUsername] = useState("");
  const [archives, setArchives] = useState<string[]>([]);
  const [archivesLoading, setArchivesLoading] = useState(false);
  const [archivesError, setArchivesError] = useState("");
  const [selectedArchive, setSelectedArchive] = useState<string>("");
  const [games, setGames] = useState<any[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState<"db" | "chesscom">("chesscom");

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  const handleImportOpeningsFromGames = async () => {
    if (games.length === 0) return;
    setIsImporting(true);
    setImportStatus("Analyzing archive games, extracting openings & gambits...");
    
    let successCount = 0;
    let skipCount = 0;

    try {
      for (let i = 0; i < games.length; i++) {
        const gameItem = games[i];
        if (!gameItem.pgn) {
          skipCount++;
          continue;
        }

        // Parse PGN headers
        const pgnText = gameItem.pgn;
        const ecoMatch = pgnText.match(/\[ECO\s+"([^"]+)"\]/);
        const openingMatch = pgnText.match(/\[Opening\s+"([^"]+)"\]/);

        const eco = ecoMatch ? ecoMatch[1] : "C00";
        const openingName = openingMatch ? openingMatch[1] : "";

        if (!openingName) {
          skipCount++;
          continue;
        }

        // Create clean unique ID
        const cleanId = openingName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        // Skip if already in database (avoid redundant work)
        const alreadyExists = openings.some(op => op.id === cleanId);
        if (alreadyExists) {
          skipCount++;
          continue;
        }

        setImportStatus(`Writing to Opening Database (${i + 1}/${games.length}): ${openingName}`);

        try {
          const tempChess = new Chess();
          tempChess.loadPgn(pgnText);
          const historyVerbose = tempChess.history({ verbose: true });
          
          if (historyVerbose.length === 0) {
            skipCount++;
            continue;
          }

          // Limit opening prefix definition to first 12 plies
          const limit = Math.min(historyVerbose.length, 12);
          const slicedHistory = historyVerbose.slice(0, limit);
          const movesUci = slicedHistory.map((m: any) => m.from + m.to);
          
          let movesSan = "";
          const historySan = tempChess.history().slice(0, limit);
          for (let k = 0; k < historySan.length; k += 2) {
            const moveNum = Math.floor(k / 2) + 1;
            movesSan += `${moveNum}. ${historySan[k]}` + (historySan[k+1] ? ` ${historySan[k+1]} ` : "") + " ";
          }
          movesSan = movesSan.trim();

          // Categorize
          let category: "opening" | "defense" | "gambit" | "variation" = "opening";
          const lowerName = openingName.toLowerCase();
          if (lowerName.includes("gambit")) {
            category = "gambit";
          } else if (lowerName.includes("defense") || lowerName.includes("defence")) {
            category = "defense";
          } else if (lowerName.includes("variation")) {
            category = "variation";
          }

          const res = await fetch("/api/database/openings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eco,
              name: openingName,
              type: category,
              moves: movesSan,
              moves_uci: movesUci,
              description: `Theoretical opening line extracted from ${username}'s games on Chess.com and automatically added to the database.`
            })
          });

          if (res.ok) {
            successCount++;
          } else {
            skipCount++;
          }
        } catch (e) {
          skipCount++;
        }
      }

      setImportStatus(`Import completed! ${successCount} new openings/gambits saved, ${skipCount} existing/invalid skipped.`);
      await fetchOpenings(); // Refresh database
    } catch (err: any) {
      setImportStatus(`Error during import: ${err.message}`);
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportStatus(""), 6000);
    }
  };

  // Fetch Openings Database
  const fetchOpenings = async () => {
    setDbLoading(true);
    setDbError("");
    try {
      const res = await fetch("/api/database/openings");
      if (!res.ok) throw new Error("Failed to load opening database.");
      const data = await res.json();
      setOpenings(data);
    } catch (err: any) {
      setDbError(err.message || "An error occurred while loading openings.");
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenings();
  }, []);

  // Handle Add Opening Form Submit
  const handleAddOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newName.trim() || !newMoves.trim() || !newMovesUci.trim()) {
      setFormError("Please fill in the Name, Moves, and UCI Moves fields.");
      return;
    }

    // Process UCI moves from string e.g. "e2e4, c7c5" or "e2e4 c7c5"
    const uciArray = newMovesUci
      .replace(/,/g, " ")
      .split(/\s+/)
      .map(m => m.trim())
      .filter(m => m.length >= 4);

    if (uciArray.length === 0) {
      setFormError("Please enter at least one valid UCI move (e.g., e2e4).");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/database/openings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eco: newEco.trim(),
          name: newName.trim(),
          type: newType,
          moves: newMoves.trim(),
          moves_uci: uciArray,
          description: newDesc.trim()
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error adding opening.");
      }

      // Success
      await fetchOpenings();
      setShowAddForm(false);
      // Reset form fields
      setNewEco("C00");
      setNewName("");
      setNewType("opening");
      setNewMoves("");
      setNewMovesUci("");
      setNewDesc("");
    } catch (err: any) {
      setFormError(err.message || "Failed to save opening.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete Opening
  const handleDeleteOpening = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this opening from the database?")) {
      return;
    }

    try {
      const res = await fetch(`/api/database/openings/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to delete opening.");

      if (viewingOpening?.id === id) {
        setViewingOpening(null);
      }
      fetchOpenings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Chess.com Username Fetch Archives
  const fetchChesscomArchives = async () => {
    if (!username.trim()) {
      setArchivesError("Please enter a Chess.com username.");
      return;
    }
    setArchivesLoading(true);
    setArchivesError("");
    setArchives([]);
    setGames([]);
    setSelectedArchive("");
    try {
      const res = await fetch(`/api/chesscom/archives/${encodeURIComponent(username.trim())}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to retrieve archives.");
      }
      const data = await res.json();
      
      // Chess.com responds with { archives: ["https://...", ...] }
      // Reverse so newest archives appear first
      if (data.archives && Array.isArray(data.archives)) {
        setArchives([...data.archives].reverse());
        if (data.archives.length > 0) {
          // Set selection to the newest month by default
          setSelectedArchive(data.archives[data.archives.length - 1]);
        }
      } else {
        throw new Error("No game archives found.");
      }
    } catch (err: any) {
      setArchivesError(err.message || "A network error occurred.");
    } finally {
      setArchivesLoading(false);
    }
  };

  // Fetch games of specific Archive URL
  const fetchArchiveGames = async (archiveUrl: string) => {
    if (!archiveUrl) return;
    setGamesLoading(true);
    setGamesError("");
    setGames([]);
    try {
      // Find year and month from URL
      // Expected structure: https://api.chess.com/pub/player/erik/games/2007/07
      const urlParts = archiveUrl.split("/");
      const month = urlParts[urlParts.length - 1];
      const year = urlParts[urlParts.length - 2];

      const res = await fetch(`/api/chesscom/games/${encodeURIComponent(username.trim())}/${year}/${month}`);
      if (!res.ok) throw new Error("Failed to retrieve monthly game data.");
      const data = await res.json();

      if (data.games && Array.isArray(data.games)) {
        // Reverse so recent games appear first
        setGames([...data.games].reverse());
      } else {
        setGames([]);
      }
    } catch (err: any) {
      setGamesError(err.message || "An error occurred while listing games.");
    } finally {
      setGamesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedArchive) {
      fetchArchiveGames(selectedArchive);
    }
  }, [selectedArchive]);

  // Filters for openings
  const filteredOpenings = openings.filter(item => {
    const matchesType = selectedType === "all" || item.type === selectedType;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.eco.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Display labels formatting helpers
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "opening": 
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-[#1e1c1a] border border-white/20 text-white rounded-full flex items-center gap-1"><BookOpen size={10}/> Opening</span>;
      case "defense":
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-[#1e1c1a] border border-white/20 text-white rounded-full flex items-center gap-1"><ShieldAlert size={10}/> Defense</span>;
      case "gambit":
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-[#1e1c1a] border border-white/20 text-white rounded-full flex items-center gap-1"><Flame size={10}/> Gambit</span>;
      case "variation":
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-[#1e1c1a] border border-white/25 text-white rounded-full flex items-center gap-1"><Wand2 size={10}/> Variation</span>;
      default:
        return null;
    }
  };

  const getArchiveLabel = (url: string) => {
    if (!url) return "";
    const parts = url.split("/");
    const year = parts[parts.length - 2];
    const month = parts[parts.length - 1];
    const enMonths: Record<string, string> = {
      "01": "January", "02": "February", "03": "March", "04": "April", "05": "May", "06": "June",
      "07": "July", "08": "August", "09": "September", "10": "October", "11": "November", "12": "December"
    };
    return `${enMonths[month] || month} ${year}`;
  };
  return (
    <div id="OpeningDatabaseCenter" className={cn(
      "w-full backdrop-blur-xl rounded-lg border shadow-2xl flex flex-col overflow-hidden min-h-[410px] max-h-[415px]",
      theme === "black" ? "bg-black/40 border-white/10" : "bg-white border-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
    )}>
      {/* Tab Selectors */}
      <div className={cn(
        "flex border-b shrink-0",
        theme === "black" ? "bg-black/20 border-white/5" : "bg-neutral-100 border-black/5"
      )}>
        <button
          onClick={() => { setActiveTab("db"); setViewingOpening(null); }}
          className={cn(
            "flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all",
            activeTab === "db" 
              ? (theme === "black" ? "border-white text-white bg-white/5" : "border-black text-black bg-black/5")
              : (theme === "black" ? "border-transparent text-gray-400 hover:text-gray-300 hover:bg-white/5" : "border-transparent text-gray-500 hover:text-black hover:bg-black/5")
          )}
        >
          <Database size={14} className={theme === "black" ? "text-white" : "text-black"} />
          Opening Database
        </button>
        <button
          onClick={() => setActiveTab("chesscom")}
          className={cn(
            "flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all",
            activeTab === "chesscom" 
              ? (theme === "black" ? "border-white text-white bg-white/5" : "border-black text-black bg-black/5")
              : (theme === "black" ? "border-transparent text-gray-400 hover:text-gray-300 hover:bg-white/5" : "border-transparent text-gray-500 hover:text-black hover:bg-black/5")
          )}
        >
          <Globe size={14} className="text-[#3b82f6]" />
          Chess.com Archives
        </button>
      </div>

      {/* Database View Tab */}
      {activeTab === "db" && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-transparent">
          {viewingOpening ? (
            /* Inside Opening details */
            <div className="flex-1 flex flex-col p-4 overflow-y-auto overflow-x-hidden space-y-4 min-h-0">
              {/* Back Button */}
              <button 
                onClick={() => setViewingOpening(null)}
                className={cn(
                  "text-xs flex items-center gap-1 pb-1 border-b font-semibold self-start",
                  theme === "black" ? "text-gray-400 hover:text-white border-white/5" : "text-gray-500 hover:text-black border-black/5"
                )}
              >
                ← Back to List
              </button>

              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded font-mono text-[11px] font-bold",
                    theme === "black" ? "bg-white/10 text-gray-300" : "bg-black/5 text-gray-600"
                  )}>
                    ECO {viewingOpening.eco}
                  </span>
                  {getTypeBadge(viewingOpening.type)}
                </div>
                <h3 className={cn(
                  "text-base font-bold tracking-tight leading-snug",
                  theme === "black" ? "text-gray-100" : "text-gray-900"
                )}>
                  {viewingOpening.name}
                </h3>
              </div>

              <div className={cn(
                "p-3 rounded border space-y-1",
                theme === "black" ? "bg-black/20 border-white/5" : "bg-neutral-50 border-black/5"
              )}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Theoretical Moves</div>
                <div className={cn(
                  "text-xs font-mono break-words font-semibold",
                  theme === "black" ? "text-white" : "text-black"
                )}>
                  {viewingOpening.moves}
                </div>
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Strategic Plan & Ideas</div>
                <p className={cn(
                  "text-xs leading-relaxed",
                  theme === "black" ? "text-gray-300" : "text-gray-700"
                )}>
                  {viewingOpening.description || "No custom description has been entered for this opening. This position prompts challenges over development, center control, and king safety."}
                </p>
              </div>

              {/* Interaction Buttons */}
              <div className={cn(
                "grid grid-cols-2 gap-3 shrink-0 pt-2 border-t",
                theme === "black" ? "border-white/5" : "border-black/5"
              )}>
                <button
                  onClick={() => {
                    onLoadMoveList(viewingOpening.moves_uci);
                    // Draw visual strategic arrows if configured
                    if (viewingOpening.arrows && viewingOpening.arrows.length > 0) {
                       onSetAiArrows(viewingOpening.arrows);
                    }
                  }}
                  className={cn(
                    "py-2.5 text-xs font-bold rounded flex items-center justify-center gap-2 shadow transition-colors",
                    theme === "black" ? "bg-white hover:bg-neutral-200 text-black" : "bg-black hover:bg-neutral-800 text-white"
                  )}
                >
                  <Play size={12} fill="currentColor" />
                  Play on Board
                </button>
                <button
                  onClick={() => {
                    // Send a dummy custom message to open router asking to demonstrate this opening
                    onLoadMoveList(viewingOpening.moves_uci);
                    if (viewingOpening.arrows && viewingOpening.arrows.length > 0) {
                      onSetAiArrows(viewingOpening.arrows);
                    }
                  }}
                  className={cn(
                    "py-2.5 text-xs font-bold rounded flex items-center justify-center gap-2 border transition-colors",
                    theme === "black" ? "bg-white/5 hover:bg-white/10 text-gray-200 border-white/5" : "bg-black/5 hover:bg-black/10 text-gray-700 border-black/10"
                  )}
                >
                  <Wand2 size={12} />
                  Show Ideas
                </button>
              </div>
            </div>
          ) : showAddForm ? (
            /* Add Custom Opening Form Tab */
            <form onSubmit={handleAddOpening} className="flex-1 flex flex-col p-4 overflow-y-auto overflow-x-hidden space-y-3 min-h-0">
              <div className={cn(
                "flex items-center justify-between border-b pb-2",
                theme === "black" ? "border-white/5" : "border-black/5"
              )}>
                <h3 className={cn(
                  "text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                  theme === "black" ? "text-gray-200" : "text-gray-800"
                )}>
                  <Plus size={14} className={theme === "black" ? "text-white" : "text-black"} />
                  Add New Opening
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-gray-400 hover:text-black"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className={cn(
                  "p-2 border text-xs rounded flex items-center gap-1.5",
                  theme === "black" ? "bg-black/20 border-white/5 text-zinc-300" : "bg-red-50 border-red-100 text-red-800"
                )}>
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {/* ECO */}
                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase pl-0.5">ECO</label>
                  <input 
                    type="text" 
                    value={newEco} 
                    onChange={e => setNewEco(e.target.value)}
                    placeholder="B90"
                    className={cn(
                      "w-full text-xs p-1.5 border rounded focus:outline-none transition-all",
                      theme === "black" ? "bg-black/20 border-white/5 text-gray-200 focus:border-white/50" : "bg-neutral-50 border-black/5 text-black focus:border-black/20"
                    )}
                  />
                </div>
                {/* Type */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase pl-0.5">Category</label>
                  <select 
                    value={newType} 
                    onChange={e => setNewType(e.target.value as any)}
                    className={cn(
                      "w-full text-xs p-1.5 border rounded focus:outline-none transition-all",
                      theme === "black" ? "bg-black/20 border-white/5 text-gray-200 focus:border-white/50" : "bg-neutral-50 border-black/5 text-black focus:border-black/20"
                    )}
                  >
                    <option value="opening">Opening (White Attack)</option>
                    <option value="defense">Defense (Black Defense)</option>
                    <option value="gambit">Gambit (Sacrifice Line)</option>
                    <option value="variation">Variation (Sub-Line)</option>
                  </select>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase pl-0.5">Opening Name</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Queen's Gambit: Chigorin Defense"
                  className={cn(
                    "w-full text-xs p-1.5 border rounded focus:outline-none transition-all",
                    theme === "black" ? "bg-black/20 border-white/5 text-gray-200 focus:border-white/50" : "bg-neutral-50 border-black/5 text-black focus:border-black/20"
                  )}
                  required 
                />
              </div>

              {/* Moves SAN */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase pl-0.5">Moves (SAN Standard)</label>
                <input 
                  type="text" 
                  value={newMoves} 
                  onChange={e => setNewMoves(e.target.value)}
                  placeholder="1. d4 d5 2. c4 Nc6"
                  className={cn(
                    "w-full text-xs p-1.5 border rounded focus:outline-none transition-all",
                    theme === "black" ? "bg-black/20 border-white/5 text-gray-200 focus:border-white/50" : "bg-neutral-50 border-black/5 text-black focus:border-black/20"
                  )}
                  required 
                />
              </div>

              {/* Moves UCI */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase pl-0.5">UCI Moves (e.g., e2e4)</label>
                <input 
                  type="text" 
                  value={newMovesUci} 
                  onChange={e => setNewMovesUci(e.target.value)}
                  placeholder="d2d4, d7d5, c2c4, b8c6"
                  className={cn(
                    "w-full text-xs p-1.5 border rounded font-mono focus:outline-none transition-all",
                    theme === "black" ? "bg-black/20 border-white/5 text-gray-200 focus:border-white/50" : "bg-neutral-50 border-black/5 text-black focus:border-black/20"
                  )}
                  required 
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase pl-0.5">Strategic Description</label>
                <textarea 
                  rows={2}
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="This variation quickly brings the knight on b8 to the center..."
                  className={cn(
                    "w-full text-xs p-1.5 border rounded focus:outline-none transition-all resize-none",
                    theme === "black" ? "bg-black/20 border-white/5 text-gray-200 focus:border-white/50" : "bg-neutral-50 border-black/5 text-black focus:border-black/20"
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className={cn(
                  "w-full py-2 font-bold text-xs rounded flex items-center justify-center gap-1 shadow disabled:opacity-50 transition-colors shrink-0 cursor-pointer",
                  theme === "black" ? "bg-white hover:bg-neutral-200 text-black" : "bg-black hover:bg-neutral-800 text-white shadow-none"
                )}
              >
                {formSubmitting ? <RefreshCw className="animate-spin" size={12} /> : <Plus size={12} />}
                Save to Database
              </button>
            </form>
          ) : (
            /* Openings Database Catalog/Search List */
            <div className={cn(
              "flex-1 flex flex-col overflow-hidden min-h-0",
              theme === "black" ? "bg-black/20" : "bg-neutral-50"
            )}>
              {/* Category selector row & Add button */}
              <div className={cn(
                "p-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0",
                theme === "black" ? "bg-black/20 border-white/5" : "bg-neutral-100 border-black/5"
              )}>
                <div className="flex flex-wrap gap-1">
                  {["all", "opening", "defense", "gambit", "variation"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors",
                        selectedType === type
                          ? (theme === "black" ? "bg-white text-black" : "bg-black text-white")
                          : (theme === "black" ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-black/5 text-gray-600 hover:bg-black/10")
                      )}
                    >
                      {type === "all" ? "All" : 
                       type === "opening" ? "Opening" :
                       type === "defense" ? "Defense" :
                       type === "gambit" ? "Gambit" : "Variation"}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setShowAddForm(true)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1 select-none border transition-colors",
                    theme === "black" ? "bg-white/10 hover:bg-white/20 text-white border-white/10" : "bg-black/5 hover:bg-black/10 text-black border-black/10"
                  )}
                >
                  <Plus size={12} />
                  Add New
                </button>
              </div>

              {/* Search input */}
              <div className={cn(
                "p-3 border-b shrink-0 relative",
                theme === "black" ? "border-white/5" : "border-black/5"
              )}>
                <input
                  type="text"
                  placeholder="Search by ECO, opening name or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full py-1.5 pl-8 pr-4 border rounded text-xs focus:outline-none transition-all",
                    theme === "black" ? "bg-black/20 border-white/5 text-gray-200 placeholder-gray-500 focus:border-white/50" : "bg-white border-black/10 text-black placeholder-gray-400 focus:border-black/20"
                  )}
                />
                <Search size={14} className="text-gray-500 absolute left-5.5 top-5" />
              </div>

              {/* Database Openings scrollable list */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5 min-h-0 select-none">
                {dbLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <RefreshCw className={cn("animate-spin", theme === "black" ? "text-white" : "text-black")} size={24} />
                    <span className="text-[11px] font-semibold text-gray-400">Loading Database Openings...</span>
                  </div>
                ) : dbError ? (
                  <div className="text-center py-8 text-xs text-gray-400 px-4">
                    {dbError} <br />
                    <button onClick={fetchOpenings} className={cn("hover:underline mt-2 font-bold text-[10px]", theme === "black" ? "text-white" : "text-black")}>RELOAD DATA</button>
                  </div>
                ) : filteredOpenings.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-500 px-4">
                    No matching records found in the database.
                  </div>
                ) : (
                  filteredOpenings.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setViewingOpening(item)}
                      className={cn(
                        "p-2.5 rounded border transition-all cursor-pointer flex flex-col space-y-1.5 group",
                        theme === "black" ? "bg-transparent hover:bg-white/[0.03] border-white/5" : "bg-white hover:bg-neutral-100 border-black/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-1 py-0.2 rounded text-[9.5px] font-mono font-bold",
                            theme === "black" ? "bg-white/5 text-gray-400" : "bg-black/5 text-gray-500"
                          )}>
                             {item.eco}
                          </span>
                          {getTypeBadge(item.type)}
                        </div>
                        {/* Render Delete button for dynamically added openings, but let it be deleteable */}
                        <button
                          onClick={(e) => handleDeleteOpening(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-500 transition-all rounded hover:bg-white/10"
                          title="Delete"
                        >
                          <Trash size={12} />
                        </button>
                      </div>

                      <div>
                        <h4 className={cn(
                          "text-xs font-semibold transition-colors",
                          theme === "black" ? "text-gray-200 group-hover:text-white" : "text-gray-800 group-hover:text-black"
                        )}>
                          {item.name}
                        </h4>
                        <p className={cn(
                          "text-[11px] font-mono font-semibold truncate mt-0.5",
                          theme === "black" ? "text-white" : "text-black"
                        )}>
                          {item.moves}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chess.com View Tab */}
      {activeTab === "chesscom" && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-transparent">
          {/* Username fetch control */}
          <div className={cn(
            "py-2 px-3 border-b flex gap-2 shrink-0",
            theme === "black" ? "bg-black/20 border-white/5" : "bg-neutral-100 border-black/5"
          )}>
            <input
              type="text"
              placeholder="Queen_King_99"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchChesscomArchives()}
              className={cn(
                "flex-1 py-1.5 px-3 border rounded text-xs focus:outline-none transition-all",
                theme === "black" ? "bg-black/20 border-white/5 text-gray-200 focus:border-white/50" : "bg-white border-black/10 text-black focus:border-black/20"
              )}
            />
            <button
              onClick={fetchChesscomArchives}
              disabled={archivesLoading}
              className={cn(
                "px-4 py-1.5 font-bold text-xs rounded shadow disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer",
                theme === "black" ? "bg-white hover:bg-neutral-200 text-black" : "bg-black hover:bg-neutral-800 text-white shadow-none"
              )}
            >
              {archivesLoading ? <RefreshCw className="animate-spin" size={12} /> : "Connect"}
            </button>
          </div>

          {archivesError && (
            <div className={cn(
              "m-3 p-2 border text-xs rounded select-none",
              theme === "black" ? "bg-[#1a1c1d] border-white/5 text-zinc-300" : "bg-red-50 border-red-100 text-red-800"
            )}>
              {archivesError}
            </div>
          )}

          {archives.length > 0 && (
            /* Archive chooser dropdown */
            <div className={cn(
              "px-3 py-1 border-b flex items-center justify-between gap-1 shrink-0",
              theme === "black" ? "bg-black/20 border-white/5" : "bg-neutral-50 border-black/5"
            )}>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Archive Month:</span>
              <select
                value={selectedArchive}
                onChange={(e) => setSelectedArchive(e.target.value)}
                className={cn(
                  "py-1 px-2 text-xs bg-transparent border rounded font-semibold focus:outline-none transition-all",
                  theme === "black" ? "border-white/5 text-gray-200 focus:border-white/50" : "border-black/10 text-black focus:border-black/20"
                )}
              >
                {archives.map((url) => (
                  <option key={url} value={url}>
                    {getArchiveLabel(url)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {games.length > 0 && !gamesLoading && (
            <div className={cn(
              "px-3 py-1 border-b flex flex-col gap-1.5 shrink-0 transition-all",
              theme === "black" ? "bg-black/20 border-white/5" : "bg-neutral-50 border-black/5"
            )}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-gray-400">
                  Total Games: <span className={cn("font-mono font-bold", theme === "black" ? "text-gray-200" : "text-black")}>{games.length}</span>
                </span>
                <button
                  onClick={handleImportOpeningsFromGames}
                  disabled={isImporting}
                  className={cn(
                    "px-2.5 py-1 disabled:opacity-50 text-[10px] uppercase font-bold rounded flex items-center gap-1 cursor-pointer transition-colors border",
                    theme === "black" ? "bg-white/10 hover:bg-white/20 text-white border-white/10" : "bg-black/5 hover:bg-black/10 text-black border-black/10"
                  )}
                >
                  {isImporting ? <RefreshCw className="animate-spin text-white" size={10} /> : <Database size={10} />}
                  Add Openings/Gambits to DB
                </button>
              </div>
              {importStatus && (
                <div className={cn(
                  "text-[9.5px] font-semibold truncate animate-pulse",
                  theme === "black" ? "text-white" : "text-black"
                )}>
                  {importStatus}
                </div>
              )}
            </div>
          )}

          {/* Games list or loaders */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5 min-h-0 select-none">
            {gamesLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <RefreshCw className={cn("animate-spin", theme === "black" ? "text-white" : "text-black")} size={24} />
                <span className="text-[11px] font-semibold text-gray-400">Fetching {getArchiveLabel(selectedArchive)} Games...</span>
              </div>
            ) : gamesError ? (
              <div className="text-center py-12 text-xs text-gray-400 px-4">
                {gamesError}
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-16 text-xs text-gray-500 px-6">
                {!username ? "Enter a Chess.com player profile and click Connect to load archive games." : "No games found for this month."}
              </div>
            ) : (
              games.map((g, index) => {
                const whitePlayer = g.white;
                const blackPlayer = g.black;
                const whiteName = whitePlayer.username;
                const blackName = blackPlayer.username;
                const rated = g.rated ? "Rated" : "Casual";
                const date = new Date(g.end_time * 1000).toLocaleDateString("en-US");
                
                // Identify game result
                let resultText = "";
                let bgResultClass = theme === "black" ? "border-white/5" : "border-black/5";
                
                // Identify outcome
                if (whitePlayer.result === "win") {
                  resultText = `White Won (${whiteName})`;
                  bgResultClass = theme === "black" ? "border-white/25 bg-transparent" : "border-black/20 bg-neutral-50";
                } else if (blackPlayer.result === "win") {
                  resultText = `Black Won (${blackName})`;
                  bgResultClass = theme === "black" ? "border-zinc-800/40 bg-transparent" : "border-black/10 bg-neutral-100";
                } else {
                  resultText = "Draw";
                  bgResultClass = theme === "black" ? "border-zinc-800 bg-transparent" : "border-black/10 bg-neutral-50";
                }

                return (
                  <div
                    key={index}
                    className={cn(
                      "p-2 rounded border space-y-1.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-2",
                      theme === "black" ? "bg-black/20" : "bg-white",
                      bgResultClass
                    )}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-500 font-semibold uppercase">
                        <span>{g.time_class}</span>
                        <span>•</span>
                        <span>{rated}</span>
                        <span>•</span>
                        <span>{date}</span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-white border border-gray-400 shrink-0" />
                          <span className={cn(
                            "text-xs font-semibold truncate pr-1",
                            theme === "black" ? "text-gray-200" : "text-black"
                          )}>
                            {whiteName} <small className="text-gray-500 font-mono">({whitePlayer.rating})</small>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-black shrink-0" />
                          <span className={cn(
                            "text-xs font-semibold truncate pr-1",
                            theme === "black" ? "text-gray-200" : "text-black"
                          )}>
                            {blackName} <small className="text-gray-500 font-mono">({blackPlayer.rating})</small>
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-400 font-mono italic truncate">
                        {resultText}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (g.pgn) {
                           onLoadPGN(g.pgn, whiteName, blackName, whitePlayer.rating, blackPlayer.rating);
                        } else {
                           alert("PGN log for this game is not available.");
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 font-bold text-xs rounded shadow flex items-center gap-1 self-stretch md:self-auto justify-center transition-colors shrink-0 cursor-pointer",
                        theme === "black" ? "bg-white hover:bg-neutral-200 text-black" : "bg-black hover:bg-neutral-800 text-white shadow-none"
                      )}
                    >
                      <Play size={11} fill="currentColor" />
                      Load to Board
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
