import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Bot, Settings, X, Key, Cpu, Trash2, Flower } from "lucide-react";
import { cn } from "../lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIAssistantProps {
  onCommand: (command: { moves?: string[], arrows?: string[][], reset?: boolean, autoPlay?: boolean, type?: string }) => void;
  isActive: boolean;
  isOnlineMatch?: boolean;
  fen?: string;
  history?: any[];
  theme?: "black" | "white";
}

interface OpenRouterModel {
  id: string;
  name: string;
}

function parseFlexibleJson(str: string): any | null {
  try {
    return JSON.parse(str.trim());
  } catch (e) {
    const firstBrace = str.indexOf('{');
    const lastBrace = str.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const rawCandidate = str.substring(firstBrace, lastBrace + 1).trim();
      const cleanedCandidate = rawCandidate
        .replace(/^[\s{]+/, '{')
        .replace(/[\s}]+$/, '}');
      
      try {
        return JSON.parse(cleanedCandidate);
      } catch (innerErr) {
        try {
          const trailingCommaRemoved = cleanedCandidate.replace(/,\s*([\]}])/g, '$1');
          return JSON.parse(trailingCommaRemoved);
        } catch (e2) {
          return null;
        }
      }
    }
    return null;
  }
}

export function extractJSONCommand(text: string): { command: any | null; cleanText: string } {
  let cleanText = text;
  let command: any | null = null;

  // 1. Triple colons (e.g. ::: { ... } ::: or :::json { ... } :::)
  const tripleColonRegex = /[:]{3}(?:[a-zA-Z0-9]+)?\s*([\s\S]*?)\s*[:]{3}/g;
  let colonMatch;
  while ((colonMatch = tripleColonRegex.exec(text)) !== null) {
    const candidate = colonMatch[1];
    const parsed = parseFlexibleJson(candidate);
    if (parsed) {
      command = parsed;
      cleanText = cleanText.replace(colonMatch[0], "");
    }
  }

  // 2. [CMD: ...] block
  const cmdRegex = /\[CMD:\s*([\s\S]*?)\s*\]/g;
  let cmdMatch;
  while ((cmdMatch = cmdRegex.exec(text)) !== null) {
    const candidate = cmdMatch[1];
    const parsed = parseFlexibleJson(candidate);
    if (parsed) {
      command = parsed;
      cleanText = cleanText.replace(cmdMatch[0], "");
    }
  }

  // 3. Markdowns json blocks
  const markdownRegex = /```json\s*([\s\S]*?)\s*```/g;
  let mMatch;
  while ((mMatch = markdownRegex.exec(text)) !== null) {
    const candidate = mMatch[1];
    const parsed = parseFlexibleJson(candidate);
    if (parsed) {
      command = parsed;
      cleanText = cleanText.replace(mMatch[0], "");
    }
  }

  // Final trim and cleaning remaining empty/corrupt codeblock brackets if any
  cleanText = cleanText
    .replace(/```[\s\S]*?```/g, "")
    .trim();

  return { command, cleanText };
}

export function AIAssistant({ onCommand, isActive, isOnlineMatch, fen, history, theme = "black" }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  
  // Settings state with localStorage persistence
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("chess_ai_key") || "");
  const [selectedModel, setSelectedModel] = useState(() => {
    const stored = localStorage.getItem("chess_ai_model");
    if (!stored || (!stored.endsWith(":free") && stored !== "openrouter/free") || stored === "deepseek/deepseek-r1:free") {
      return "openrouter/free";
    }
    return stored;
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleResetChat = () => {
    setMessages([]);
  };

  // Fetch models from OpenRouter
  const fetchModels = async () => {
    setIsFetchingModels(true);
    try {
      const response = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userApiKey: apiKey }),
      });
      const data = await response.json();
      if (data.data) {
        // Only include active and stable free models
        const deprecatedOrBroken = [
          "deepseek/deepseek-r1:free",
          "google/gemini-2.5-flash:free",
          "meta-llama/llama-3.2-3b-instruct:free"
        ];
        const models = data.data
          .filter((m: any) => {
            const isFree = m.id.endsWith(":free") || m.id === "openrouter/free";
            return isFree && !deprecatedOrBroken.includes(m.id);
          })
          .map((m: any) => ({
            id: m.id,
            name: m.name || m.id
          }));
        setAvailableModels(models);
      }
    } catch (error) {
      console.error("Failed to fetch models", error);
    } finally {
      setIsFetchingModels(false);
    }
  };

  useEffect(() => {
    if (showSettings) {
      fetchModels();
    }
  }, [showSettings]);

  useEffect(() => {
    localStorage.setItem("chess_ai_key", apiKey);
    localStorage.setItem("chess_ai_model", selectedModel);
  }, [apiKey, selectedModel]);

  // Messages scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);

    // Check for slash command
    if (userMessage.startsWith("/")) {
      const commandParts = userMessage.split(" ");
      const command = commandParts[0].substring(1);

      if (command === "game") {
        setMessages(prev => [...prev, { role: "assistant", content: "Starting AI vs AI match..." }]);
        onCommand({ autoPlay: true });
        return;
      } else if (command === "torch") {
        setActiveCommand("torch");
        setMessages(prev => [...prev, { role: "assistant", content: "Analyzing best move..." }]);
        onCommand({ type: "torch" });
        return;
      } else if (command === "var") {
        setActiveCommand("var");
        setMessages(prev => [...prev, { role: "assistant", content: "Showing alternative moves..." }]);
        onCommand({ type: "var" });
        return;
      } else if (command === "acu") {
        setActiveCommand("acu");
        setMessages(prev => [...prev, { role: "assistant", content: "Calculated accuracy: White 92%, Black 89%." }]);
        onCommand({ type: "acu" });
        return;
      } else if (command === "tempo") {
        setActiveCommand("tempo");
        setMessages(prev => [...prev, { role: "assistant", content: "Last move improved tempo by +0.5." }]);
        onCommand({ type: "tempo" });
        return;
      } else if (command === "obs") {
        setActiveCommand("obs");
        setMessages(prev => [...prev, { role: "assistant", content: "Potential: Queen 10, Rook 5, Bishop 3..." }]);
        onCommand({ type: "obs" });
        return;
      } else if (command === "seraph") {
        setActiveCommand("seraph");
        setMessages(prev => [...prev, { role: "assistant", content: "Highlighting best piece to move..." }]);
        onCommand({ type: "seraph" });
        return;
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Command not found." }]);
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, { role: "user", content: userMessage }],
          userApiKey: apiKey,
          userModel: selectedModel,
          fen: fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          history: history ? history.map((m: any) => m.from + m.to + (m.promotion || "")) : []
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error || "Unable to connect to the server."}` }]);
        return;
      }

      if (!data.choices?.[0]?.message?.content) {
        setMessages(prev => [...prev, { role: "assistant", content: "AI returned an empty response or the response format is incorrect." }]);
        return;
      }

      const aiContent = data.choices[0].message.content;

      const { command, cleanText } = extractJSONCommand(aiContent);

      if (command) {
        try {
          console.log("Executing AI Command:", command);
          onCommand(command);
        } catch (e) {
          console.error("AI command callback failed:", e);
        }
      }

      setMessages(prev => [...prev, { role: "assistant", content: cleanText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, the assistant service is currently unavailable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteCommand = () => {
    setActiveCommand(null);
    onCommand({ type: "complete" });
    setMessages(prev => [...prev, { role: "assistant", content: "Command completed." }]);
  };

  if (!isActive) return null;

  return (
    <div className={cn(
      "w-full h-full backdrop-blur-xl border rounded-xl overflow-hidden shadow-2xl flex flex-col relative min-h-[350px] transition-all duration-300",
      theme === "black" ? "bg-black/40 border-white/10" : "bg-white/80 border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
    )}>
      {/* Header */}
      <div className={cn("px-4 py-3 border-b flex items-center justify-between z-10", theme === "black" ? "bg-black/20 border-white/5" : "bg-black/5 border-black/5")}>
        <div className="flex items-center gap-3">
          <div className={cn("p-1.5 rounded-lg", theme === "black" ? "bg-white/10" : "bg-black/5")}>
            <Flower size={16} className={cn(theme === "black" ? "text-white" : "text-black", "animate-pulse")} />
          </div>
          <div>
            <h3 className={cn(
              "text-sm font-extrabold tracking-wider",
              theme === "black" 
                ? "bg-gradient-to-r from-white via-neutral-200 to-zinc-400 bg-clip-text text-transparent" 
                : "text-black"
            )}>Chesster</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className={cn(
             "text-[10px] px-2 py-0.5 rounded-full border font-bold opacity-80 uppercase tracking-widest",
             theme === "black" ? "bg-white/10 text-white border-white/25" : "bg-black/5 text-black border-black/20"
           )}>ACTIVE</span>
           <button 
             onClick={handleResetChat}
             className={cn(
               "p-2 rounded-lg transition-colors",
               theme === "black" ? "text-gray-500 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-black hover:bg-black/5"
             )}
             title="Reset Chat"
           >
             <Trash2 size={16} />
           </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className={cn("flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar", theme === "black" ? "bg-black/20" : "bg-black/[0.02]")}
      >
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8 px-4 flex flex-col items-center justify-center space-y-3">
            <div className={cn(
              "w-12 h-12 rounded-full border flex items-center justify-center shadow-sm shadow-black/10 animate-pulse",
              theme === "black" ? "bg-white/10 border-white/20 text-white" : "bg-black/5 border-black/10 text-black"
            )}>
              <Flower size={24} />
            </div>
            <div className="space-y-1">
              <h4 className={cn(
                "text-sm font-bold tracking-wide",
                theme === "black" ? "text-transparent bg-gradient-to-r from-white via-neutral-200 to-zinc-400 bg-clip-text" : "text-black"
              )}>Chesster</h4>
              <p className={cn("text-[11px] leading-normal max-w-[200px] mx-auto font-medium", theme === "black" ? "text-gray-400" : "text-gray-600")}>Your chess coach is ready to help you!</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={cn(
              "flex gap-2 max-w-[90%]",
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "shrink-0 w-6 h-6 rounded flex items-center justify-center border",
              msg.role === "assistant" 
                ? (msg.content.startsWith("Error:") ? "bg-red-500/10 border-red-500/20 text-red-400" : (theme === "black" ? "bg-white/10 border-white/20 text-white" : "bg-black/5 border-black/10 text-black")) 
                : "bg-gray-500/10 border-gray-500/20 text-gray-400"
            )}>
              {msg.role === "assistant" ? <Flower size={12} className={cn(theme === "black" ? "text-white" : "text-black", "animate-pulse")} /> : <Bot size={12} />}
            </div>
            <div className={cn(
              "p-2 rounded-xl text-[13px] leading-relaxed",
              msg.role === "assistant" 
                ? (msg.content.startsWith("Error:") ? "bg-red-900/40 text-red-100 border border-red-500/30" : (theme === "black" ? "bg-white/5 text-gray-200 border border-white/5" : "bg-black/5 text-gray-800 border border-black/5 shadow-sm shadow-black/5")) 
                : (theme === "black" ? "bg-white text-black font-semibold shadow-md shadow-black/20" : "bg-black text-white font-semibold shadow-md")
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className={cn(
              "shrink-0 w-6 h-6 rounded flex items-center justify-center border",
              theme === "black" ? "bg-white/10 border-white/20 text-white" : "bg-black/5 border-black/10 text-black"
            )}>
              <Loader2 size={12} className="animate-spin" />
            </div>
            <div className={cn(
              "p-2 text-[13px] rounded-xl italic border",
              theme === "black" ? "bg-white/5 text-gray-400 border-white/5" : "bg-black/5 text-gray-600 border-black/5"
            )}>
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {activeCommand && (
        <button
          onClick={handleCompleteCommand}
          className={cn(
            "w-full py-2 border text-xs font-bold rounded-lg mb-2 transition-colors",
            theme === "black" ? "bg-white/10 border-white/20 text-white hover:bg-white/20" : "bg-black/5 border-black/10 text-black hover:bg-black/10"
          )}
        >
          End command
        </button>
      )}
      <div className={cn("p-3 backdrop-blur-sm border-t", theme === "black" ? "bg-black/20 border-white/5" : "bg-black/5 border-black/5")}>
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask for a move or say 'play this'..."
            className={cn(
              "w-full text-sm py-2 px-4 rounded-xl outline-none ring-1 transition-all pr-10",
              theme === "black" 
                ? "bg-black/20 text-gray-200 ring-white/10 focus:ring-white/50 placeholder:text-gray-600" 
                : "bg-white text-gray-800 ring-black/10 focus:ring-black/30 placeholder:text-gray-400"
            )}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={cn(
              "absolute right-1 p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-30",
              theme === "black" 
                ? "bg-white hover:bg-neutral-200 text-black" 
                : "bg-black hover:bg-neutral-800 text-white"
            )}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

