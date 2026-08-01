import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Music, Play, X, ExternalLink, HelpCircle, Flame, Sparkles, Layers, ListMusic, Code, Compass } from "lucide-react";
import { cn } from "../lib/utils";

interface SpotifyPlayerProps {
  key?: string | number;
  onClose: () => void;
}

export default function SpotifyPlayer({ onClose }: SpotifyPlayerProps) {
  const [activeTab, setActiveTab] = useState<"paste" | "guide">("paste");
  const [pastedUrl, setPastedUrl] = useState("");
  const [pastedItem, setPastedItem] = useState<{ type: string; id: string } | null>(null);
  const [pasteError, setPasteError] = useState("");

  // Helper parser for Spotify Links
  const parseSpotifyUrl = (url: string) => {
    try {
      const cleanUrl = url.trim();
      const regex = /spotify\.com\/(track|playlist|album|artist)\/([a-zA-Z0-9]+)/i;
      const match = cleanUrl.match(regex);
      if (match) {
        return {
          type: match[1].toLowerCase(),
          id: match[2]
        };
      }
      
      const uriRegex = /spotify:(track|playlist|album|artist):([a-zA-Z0-9]+)/i;
      const uriMatch = cleanUrl.match(uriRegex);
      if (uriMatch) {
        return {
          type: uriMatch[1].toLowerCase(),
          id: uriMatch[2]
        };
      }
    } catch {
      // Ignore
    }
    return null;
  };

  const handlePasteChange = (val: string) => {
    setPastedUrl(val);
    setPasteError("");
    
    if (!val.trim()) {
      setPastedItem(null);
      return;
    }

    const parsed = parseSpotifyUrl(val);
    if (parsed) {
      setPastedItem(parsed);
    } else {
      setPastedItem(null);
      if (val.includes("spotify.com") || val.includes("spotify:")) {
        setPasteError("Invalid Spotify link format. Ensure it contains /track/, /playlist/, /album/ or /artist/.");
      }
    }
  };

  // If pastedUrl compiles, generate correct iframe URL
  const activePlaySource = (() => {
    if (pastedItem) {
      return {
        type: pastedItem.type,
        id: pastedItem.id
      };
    }
    return {
      type: "playlist",
      id: "37i9dQZF1DX4sWSpwq3LiO" // Lofi Focus Beats
    };
  })();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
      transition={{ type: "spring", damping: 25, stiffness: 220 }}
      className="w-full max-w-xl mx-auto rounded-3xl bg-[#0a0a0a]/80 border border-white/10 shadow-2xl p-6 relative overflow-hidden select-none backdrop-blur-3xl"
    >
      {/* Dynamic Background Glassy Glows */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-white/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-white/5 blur-3xl rounded-full pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
            <Music size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={onClose}>
              <span className="text-[9px] font-black tracking-widest text-white uppercase bg-white/10 px-1.5 py-0.5 rounded hover:bg-white/20 transition-all">CHESSTER DECK</span>
            </div>
            <h2 onClick={onClose} className="text-sm font-extrabold text-white leading-tight mt-0.5 cursor-pointer hover:text-white/80 transition-all select-none">
              Chesster Focus Ambient
            </h2>
          </div>
        </div>

        {/* Close Switch */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-red-500/20 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Glass navigation tabs */}
      <div className="flex gap-1.5 p-1 bg-white/[0.03] border border-white/5 rounded-2xl mb-5">
        <button
          onClick={() => setActiveTab("paste")}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeTab === "paste" 
              ? "bg-white/15 border border-white/25 text-white" 
              : "text-gray-400 hover:text-white"
          )}
        >
          <Code size={14} />
          Paste Spotify Link
        </button>

        <button
          onClick={() => setActiveTab("guide")}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeTab === "guide" 
              ? "bg-white/15 border border-white/25 text-white" 
              : "text-gray-400 hover:text-white"
          )}
        >
          <HelpCircle size={14} />
          How it Works
        </button>
      </div>

      {/* Main Grid: Visualizer Widget & Control Panel */}
      <div className="space-y-4">
        
        {/* Top: Actual Responsive Embed Widget */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-2 relative overflow-hidden shadow-inner flex flex-col">
          <div className="flex items-center justify-between px-2 py-1 border-b border-white/5 shrink-0 bg-white/[0.01] mb-2 rounded-lg">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              SPOTIFY ACCORD MEDIA INTERFACE
            </span>
            <a 
              href={`https://open.spotify.com/${activePlaySource.type}/${activePlaySource.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-[9px] font-bold text-gray-450 hover:text-white flex items-center gap-0.5 transition-colors"
            >
              Open Spotify <ExternalLink size={10} />
            </a>
          </div>

          <div className="w-full relative min-h-[352px] bg-[#121212]/30 rounded-xl overflow-hidden shadow-2xl">
            <iframe
              src={`https://open.spotify.com/embed/${activePlaySource.type}/${activePlaySource.id}?utm_source=generator&theme=0`}
              width="100%"
              height="352"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="border-none rounded-xl"
            ></iframe>
          </div>
        </div>

        {/* Tab-driven bottoms */}
        <AnimatePresence mode="wait">
          {activeTab === "paste" && (
            <motion.div
              key="paste-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3"
            >
              <div>
                <label className="text-[9px] font-black text-white block mb-1 uppercase tracking-widest">SPOTIFY SHARE LINK</label>
                <input
                  type="text"
                  placeholder="Paste track, playlist, album, or artist link..."
                  value={pastedUrl}
                  onChange={(e) => handlePasteChange(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-white/50 rounded-xl p-2.5 px-4 text-xs text-white outline-none transition-all placeholder-gray-500 font-medium"
                />
              </div>

              {pasteError ? (
                <div className="text-[10px] text-red-400 font-medium">
                  {pasteError}
                </div>
              ) : pastedItem ? (
                <div className="text-[10px] text-white font-medium flex items-center gap-1 bg-white/5 p-2 rounded-xl border border-white/10 animate-fade-in">
                  <Sparkles size={12} /> Successfully detected and loaded Spotify {pastedItem.type}! Play it on the deck above.
                </div>
              ) : (
                <div className="text-[10px] text-gray-400/90 leading-relaxed">
                  Open your Spotify app, click <strong className="text-white">Share → Copy Link</strong> on any track, playlist, or artist, then paste it here for custom streaming.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "guide" && (
            <motion.div
              key="guide-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3.5"
            >
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Flame size={14} className="text-amber-400 animate-pulse" /> Seamless Browser Linkage
              </h3>
              
              <div className="space-y-2.5 text-[11px] text-gray-300/95 leading-relaxed font-medium">
                <p>
                  ⚡ <strong className="text-white">No Developers Setup Needed:</strong> By leveraging Spotify’s official sandbox embedded structures, we bypassed complex APIs, client credentials, and access keys entirely!
                </p>
                <p>
                  🎵 <strong className="text-white">Full-Length Streams:</strong> To unlock full audio streaming, simply log in to your normal Spotify account in another tab on this browser. The embedded deck will recognize your browser session automatically!
                </p>
                <p>
                  🔒 <strong className="text-white">100% Encrypted & Safe:</strong> All authorization runs directly on Spotify’s official servers in the browser, meaning your credentials are never processed or sent to any developer accounts.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </motion.div>
  );
}
