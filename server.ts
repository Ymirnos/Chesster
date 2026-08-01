import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Helper to check for placeholder keys
  const isPlaceholder = (key: string) => !key || key === "MY_GEMINI_API_KEY" || key === "MY_OPENROUTER_API_KEY" || key.includes("MY_APP_URL");
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.use(express.json());

  // Chess Chatbot Route (General knowledge proxy)
  app.post("/api/ai/chatbot", async (req, res) => {
    const { messages } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || isPlaceholder(apiKey)) {
      return res.status(401).json({ error: "Gemini API Key is missing. Please set it in Settings > Secrets." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const geminiContents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: geminiContents,
        config: {
          systemInstruction: "You are a helpful and expert chess assistant. You answer questions about chess history, theory, openings, grandmasters, and strategy. Keep your responses concise and instructive."
        }
      });

      res.json({
        choices: [{
          message: {
            role: "assistant",
            content: response.text
          }
        }]
      });
    } catch (error: any) {
      console.error("Chatbot API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper to clean and parse JSON from AI responses
  const cleanAndParseJSON = (text: string) => {
    if (!text) return null;
    let cleaned = text.trim();
    
    // 1. Try direct parse
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Not direct JSON
    }

    // 2. Remove markdown code blocks if present
    const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      try {
        return JSON.parse(markdownMatch[1].trim());
      } catch (e) {
        // Fall through
      }
    }

    // 3. Attempt to find something that looks like a JSON object in the text
    const braceMatch = cleaned.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        // Try to clean common AI hallucinations like trailing commas or single quotes
        let candidate = braceMatch[0].trim();
        // Simple fix for common trailing comma issues
        candidate = candidate.replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(candidate);
      } catch (innerE) {
        // If it still fails, it's not valid JSON
      }
    }
    
    return null;
  };

  // AI Assistant Route (Coach Chat - Chesster AI using OpenCode Zen Provider)
  app.post("/api/ai/chat", async (req, res) => {
    const { messages, userApiKey, fen, history } = req.body;

    const opencodeZenDefaultKey = "sk-adA9pX6VPpPctqVPAehIPhhxvnJtuo6iiZu5xxVFXdbquqr5dLy1Pel4eBFEzg6V";
    const apiKey = userApiKey || process.env.OPENCODE_ZEN_API_KEY || process.env.OPENROUTER_API_KEY || opencodeZenDefaultKey || process.env.GEMINI_API_KEY;

    if (!apiKey || isPlaceholder(apiKey)) {
      return res.status(401).json({ error: "API Key is missing. Please set OPENCODE_ZEN_API_KEY." });
    }

    const currentFen = fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const historyList = history || [];
    const sideToMove = currentFen.split(" ")[1] === "b" ? "Black" : "White";

    const systemInstruction = `You are Chesster, an elite grandmaster chess coach powered by OpenCode Zen AI. You coach the user during their match against any opponent.
    You have "full board authority". When the user asks you to show an opening, gambit, or strategic plan, you must execute it yourself on the board.

    CURRENT BOARD STATE (CRITICAL CONTEXT):
    - Current FEN: ${currentFen}
    - Played moves (UCI history): ${JSON.stringify(historyList)}
    - Side to move: ${sideToMove}

    COMMAND USAGE (CRITICAL REQUIREMENT - NEVER OMIT):
    Always append a :::JSON::: formatted command block at the end of your response.
    If you reference moves or the user says "play this", "advance e4", "show Queen's Gambit", add these moves to the "moves" list.
    NEVER JUST TALK. Always reflect the action on the board.

    RULES:
    1. If analyzing or preparing a new opening, set "reset": true first.
    2. Specify moves strictly in UCI format (e.g., e2e4, g1f3, b8c6). Any other format will not work.
    3. Moves will be played on the board at 2-second intervals.
    4. Use "arrows" to show strategic ideas (colored visual indicators): g (Green), r (Red), b (Blue), y (Yellow).

    EXAMPLE: When asked "show Queen's Gambit":
    Certainly! The Queen's Gambit begins with d4 and d5, followed by c4:
    :::{"reset": true, "moves": ["d2d4", "d7d5", "c2c4"], "arrows": [["c2c4", "g"]]}:::

    EVERY SINGLE RESPONSE MUST CONTAIN A JSON COMMAND BLOCK AFTER YOUR BRIEF EXPLANATION.`;

    // Try OpenCode Zen / OpenAI Compatible API first if key starts with sk-
    if (apiKey.startsWith("sk-")) {
      try {
        const payload = {
          model: req.body.userModel || "opencode-zen",
          messages: [
            { role: "system", content: systemInstruction },
            ...messages.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
          ]
        };

        let response = await fetch("https://opencode.zen.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify(payload)
        }).catch(() => null);

        if (!response || !response.ok) {
          response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey.trim()}`,
              "HTTP-Referer": "https://chess.app",
              "X-Title": "Chesster AI"
            },
            body: JSON.stringify({
              model: req.body.userModel && req.body.userModel !== "opencode-zen" ? req.body.userModel : "openrouter/free",
              messages: [
                { role: "system", content: systemInstruction },
                ...messages.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
              ]
            })
          }).catch(() => null);
        }

        if (response && response.ok) {
          const data = await response.json();
          return res.json(data);
        }
      } catch (err) {
        console.error("OpenCode Zen provider request failed, falling back to Gemini:", err);
      }
    }

    // Fallback to Gemini API if available
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && !isPlaceholder(geminiKey)) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey.trim(),
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const geminiContents = messages.map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: geminiContents,
          config: { systemInstruction }
        });

        return res.json({
          choices: [{
            message: {
              role: "assistant",
              content: response.text
            }
          }]
        });
      } catch (error: any) {
        console.error("Coach Chat Gemini error:", error);
      }
    }

    res.status(500).json({ error: "Failed to generate AI response." });
  });

  // Helper to generate precise Stockfish-based coach commentary fallback
  const generateProgrammaticFeedback = (move: string, evaluation: string, bestMove: string, moveClassification: string) => {
    const classification = moveClassification || "Best Move";
    let commentary = "";
    let engine_suggestion = "";
    let threat_detection = "";

    const cleanBest = bestMove && bestMove !== "None" ? bestMove : "the highest-rated engine line";

    if (classification.includes("Brilliant")) {
      commentary = `Incredible sacrifice or tactical blow! Playing ${move || "this move"} shows extraordinary vision. This move dynamically disrupts the opponent's defensive coordination and seizes total control.`;
      engine_suggestion = `There is absolutely no better alternative. The move ${move || "this"} is a masterclass in aggressive chess tactics.`;
      threat_detection = `Your opponent must react perfectly here, otherwise they face severe tactical threats or a mating net.`;
    } else if (classification.includes("Great Move")) {
      commentary = `Excellent tactical or positional choice. By playing ${move || "this move"}, you have found a key solution that maintains high pressure or solves a critical defensive requirement in this position.`;
      engine_suggestion = `An outstanding choice. Alternative lines are significantly more passive or less direct.`;
      threat_detection = `Be prepared for counter-measures, but your piece alignment is well-equipped to defend and coordinate.`;
    } else if (classification.includes("Best Move")) {
      commentary = `This is the top recommended engine move! Playing ${move || "this move"} perfectly aligns with structural principles, securing the optimal placement for your pieces and keeping structural control.`;
      engine_suggestion = `Stockfish confirms this is the absolute strongest continuation. No improvements can be made.`;
      threat_detection = `You have eliminated immediate counterplay. Continue executing your strategic plans.`;
    } else if (classification.includes("Book")) {
      commentary = `A standard theoretical opening move. Playing ${move || "this move"} is deeply rooted in chess theory, preparing development, securing center control, or king safety.`;
      engine_suggestion = `This is an established theoretical line. Continue your development and stick to your opening principles.`;
      threat_detection = `Standard theory continues. Keep an eye on typical pawn breaks and tactical patterns for this opening system.`;
    } else if (classification.includes("Inaccuracy")) {
      commentary = `The move ${move || "this move"} is slightly sub-optimal, allowing your opponent some breathing room or minor activity. While not a disaster, it relinquishes some positional advantage.`;
      engine_suggestion = `Instead of ${move || "this"}, playing ${cleanBest} would have been positionally superior, exerting stronger central pressure.`;
      threat_detection = `The opponent might try to capitalize on this minor inaccuracy by improving their piece activity.`;
    } else if (classification.includes("Mistake")) {
      commentary = `Playing ${move || "this move"} is a noticeable mistake. It weakens your current position, compromises piece coordination, or misses a strong strategic sequence.`;
      engine_suggestion = `The engine strongly recommends playing ${cleanBest} instead. This would have kept the position active and defensively solid.`;
      threat_detection = `Your opponent now has a chance to create active threats or seize a structural initiative. Pay close attention to their next responses.`;
    } else if (classification.includes("Blunder")) {
      commentary = `This is a severe blunder. Playing ${move || "this move"} has significantly compromised your position, potentially dropping material, missing a tactical defense, or allowing immediate mate.`;
      engine_suggestion = `Playing ${cleanBest} was absolutely critical here to maintain the balance of the position.`;
      threat_detection = `CRITICAL WARNING: Your opponent has immediate threats that must be handled. Be extremely cautious of potential tactics, forks, or checkmate patterns.`;
    } else {
      commentary = `You played ${move || "this move"}. This is a solid, playable move that contributes to your overall plan and keeps your position steady.`;
      engine_suggestion = `A solid choice. Alternatively, ${cleanBest} could have offered a slightly different strategic structure.`;
      threat_detection = `Keep monitoring the safety of your pieces and look out for standard tactical opportunities.`;
    }

    return {
      classification,
      commentary,
      engine_suggestion,
      threat_detection
    };
  };

  // ========== CHESS.COM LIVE FEEDBACK API ==========
  app.post("/api/ai/live-feedback", async (req, res) => {
    const { fen, move, evaluation, bestMove, moveClassification, userApiKey } = req.body;
    
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || isPlaceholder(apiKey)) {
      console.log("Valid API Key is missing for real-time coaching. Falling back to direct programmatic Stockfish analysis...");
      const programmaticResult = generateProgrammaticFeedback(move, evaluation, bestMove, moveClassification);
      return res.json(programmaticResult);
    }

    const systemInstruction = `You are the world's premier chess coach and analyst.
Using the latest played move, current FEN position, Stockfish engine evaluation structure, and suggested best response, 
you will deliver a high-quality move analysis report.

Your tone should be highly constructive, objective, scientific, and instructive. Focus cleanly and strictly on genuine chess theory, structural improvements, and tactical systems. Your reporting should be written entirely in beautiful, polished English.

Classification Thresholds (for reference):
1. Brilliant (!!) : A brilliant piece sacrifice or highly tactical winning move.
2. Great Move (!) : A key defensive or offensive move that solves a critical positional puzzle.
3. Best Move : The #1 top choice suggested by Stockfish.
4. Book : A standard book opening move matching opening databases.
5. Inaccuracy (?!) : A slightly weak move dropping 0.5 to 1.0 in centipawn value.
6. Mistake (?) : A significant error dropping 1.0 to 2.0 in centipawn value, compromising safety.
7. Blunder (??) : A severe error dropping 2.0+ in value or leading to lost pieces or mate.

Required JSON Structure:
- classification: Exactly one of: Brilliant (!!), Great Move (!), Best Move, Excellent, Good, Book, Inaccuracy (?!), Mistake (?), Blunder (??)
- commentary: Deep, instructive review explaining the strategic or tactical reasons why this move was played and its impact on the board. Avoid trivial remarks; explain the chess logic concisely in English.
- engine_suggestion: Constructive engine advice detailing what should have been played instead and why (e.g. "Instead of rushing the knight to g5, playing d4 would have safely secured control over the center.").
- threat_detection: Warnings about tactical threats, missed ideas, or opponent's newly generated counterplay under this setup.`;

    const prompt = `FEN Position: ${fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}
Played Move: ${move || ""}
Stockfish Evaluation (Eval): ${evaluation || "Equal or balanced."}
Best Move Suggested: ${bestMove || "None"}
Move Classification (Calculated): ${moveClassification || "Best Move"}

Please analyze this position in your capacity as an elite chess grandmaster and generate a comprehensive JSON report entirely in English. Only return valid JSON adhering to the schema.`;

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              classification: { type: Type.STRING },
              commentary: { type: Type.STRING },
              engine_suggestion: { type: Type.STRING },
              threat_detection: { type: Type.STRING }
            },
            required: ["classification", "commentary", "engine_suggestion", "threat_detection"]
          }
        }
      });

      const feedbackResult = cleanAndParseJSON(response.text);
      if (feedbackResult) {
        res.json(feedbackResult);
      } else {
        throw new Error("Failed to parse Gemini response");
      }
    } catch (error: any) {
      console.error("Live Feedback API error:", error);
      const programmaticResult = generateProgrammaticFeedback(move, evaluation, bestMove, moveClassification);
      res.json(programmaticResult);
    }
  });

  // ========== CHESS.COM API ARCHIVES & DATABASE ENDPOINTS ==========
  const fs = await import("fs/promises");
  const OPENINGS_DB_PATH = path.join(process.cwd(), "src", "db", "openings.json");

  // Helper to read database
  async function readOpeningsDb() {
    try {
      const data = await fs.readFile(OPENINGS_DB_PATH, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      console.error("Database read error, trying to recreate default:", err);
      return [];
    }
  }

  // Helper to write database
  async function writeOpeningsDb(data: any) {
    try {
      await fs.mkdir(path.dirname(OPENINGS_DB_PATH), { recursive: true });
      await fs.writeFile(OPENINGS_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.error("Database write error:", err);
      return false;
    }
  }

  // Get openings database
  app.get("/api/database/openings", async (req, res) => {
    try {
      const openings = await readOpeningsDb();
      res.json(openings);
    } catch (error: any) {
      res.status(500).json({ error: "Could not read openings database." });
    }
  });

  // Add a new opening/defenses to the database
  app.post("/api/database/openings", async (req, res) => {
    try {
      const OpeningSchema = z.object({
        eco: z.string().optional(),
        name: z.string().min(1),
        type: z.string().min(1),
        moves: z.string().min(1),
        moves_uci: z.string().min(1),
        description: z.string().optional(),
        arrows: z.array(z.any()).optional(),
      });

      const validated = OpeningSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ error: "Invalid input.", details: validated.error.issues });
      }

      const { eco, name, type, moves, moves_uci, description, arrows } = validated.data;

      const openings = await readOpeningsDb();
      const newId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const newOpening = {
        id: newId,
        eco: eco || "C00",
        name,
        type, // opening, defense, gambit, variation
        moves,
        moves_uci,
        description: description || "",
        arrows: arrows || []
      };

      openings.push(newOpening);
      await writeOpeningsDb(openings);
      res.status(201).json(newOpening);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to add opening to the database." });
    }
  });

  // Delete an opening/variation
  app.delete("/api/database/openings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const openings = await readOpeningsDb();
      const filtered = openings.filter((item: any) => item.id !== id);
      
      if (openings.length === filtered.length) {
        return res.status(404).json({ error: "Opening not found." });
      }

      await writeOpeningsDb(filtered);
      res.json({ success: true, message: "Opening successfully deleted." });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete opening." });
    }
  });

  // Chess.com Proxy: Fetch monthly archives for a username
  app.get("/api/chesscom/archives/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`, {
        headers: { "User-Agent": "ChessStudioApp/1.0 (emirdestanbakar620@gmail.com)" }
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `Chess.com error: ${response.statusText}. Please verify the username.` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Chess.com Proxy Error:", error);
      res.status(500).json({ error: "A network error occurred while connecting to Chess.com archives." });
    }
  });

  // Chess.com Proxy: Fetch games inside a specific archive url
  app.get("/api/chesscom/games/:username/:year/:month", async (req, res) => {
    try {
      const { username, year, month } = req.params;
      const response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/${year}/${month}`, {
        headers: { "User-Agent": "ChessStudioApp/1.0 (emirdestanbakar620@gmail.com)" }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Chess.com games error: ${response.statusText}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Chess.com Proxy Games Error:", error);
      res.status(500).json({ error: "Monthly game data could not be retrieved." });
    }
  });

  app.post("/api/ai/models", async (req, res) => {
    const { userApiKey } = req.body;
    const opencodeZenDefaultKey = "sk-adA9pX6VPpPctqVPAehIPhhxvnJtuo6iiZu5xxVFXdbquqr5dLy1Pel4eBFEzg6V";
    const apiKey = userApiKey || process.env.OPENCODE_ZEN_API_KEY || process.env.OPENROUTER_API_KEY || opencodeZenDefaultKey;

    if (!apiKey || apiKey.trim() === "") {
      return res.status(401).json({ error: "API Key is missing." });
    }

    try {
      let response = await fetch("https://opencode.zen.ai/v1/models", {
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
        }
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch("https://openrouter.ai/api/v1/models", {
          headers: {
            "Authorization": `Bearer ${apiKey.trim()}`,
          }
        }).catch(() => null);
      }

      if (response && response.ok) {
        const data = await response.json();
        return res.json(data);
      }

      res.json({
        data: [
          { id: "opencode-zen", name: "OpenCode Zen Core (Default)" },
          { id: "opencode-zen-fast", name: "OpenCode Zen Fast" },
          { id: "opencode-zen-pro", name: "OpenCode Zen Pro" }
        ]
      });
    } catch (error) {
      res.json({
        data: [
          { id: "opencode-zen", name: "OpenCode Zen Core (Default)" }
        ]
      });
    }
  });

  // ========== SPOTIFY INTEGRATION ENDPOINTS ==========
  app.get("/api/auth/spotify/url", (req, res) => {
    try {
      const clientId = process.env.SPOTIFY_CLIENT_ID || req.query.client_id;
      const customRedirect = req.query.redirect_uri;
      
      const redirectUri = customRedirect || (process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL"
        ? `${process.env.APP_URL.replace(/\/$/, "")}/auth/spotify/callback`
        : `${req.protocol}://${req.get("host")}/auth/spotify/callback`);

      if (!clientId) {
        return res.status(400).json({ error: "Spotify Client ID is missing. Set SPOTIFY_CLIENT_ID on the server, or supply it as a query parameter." });
      }

      const scope = "user-read-private user-read-email user-modify-playback-state user-read-playback-state";
      const state = Math.random().toString(36).substring(2, 15);
      
      const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
        response_type: "code",
        client_id: clientId as string,
        scope: scope,
        redirect_uri: redirectUri as string,
        state: state
      }).toString()}`;

      res.json({ url: authUrl, redirectUri });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to generate authorization URL" });
    }
  });

  app.get(["/auth/spotify/callback", "/auth/spotify/callback/"], async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.send(`
        <html>
          <body style="background: #121212; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center; background: #181818; border: 1px solid #332222; padding: 40px; border-radius: 16px; max-w: 400px;">
              <span style="font-size: 48px;">❌</span>
              <h2 style="color: #ef4444; margin: 15px 0 10px 0;">Spotify Auth Cancelled</h2>
              <p style="color: #a7a7a7; font-size: 14px;">${error}</p>
              <button onclick="window.close()" style="margin-top: 20px; background: #333; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    const redirectUri = process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL"
      ? `${process.env.APP_URL.replace(/\/$/, "")}/auth/spotify/callback`
      : `${req.protocol}://${req.get("host")}/auth/spotify/callback`;

    // If server keys exist, we can try to exchange instantly from the server
    if (clientId && clientSecret) {
      try {
        console.log("Exchanging Spotify code for access token via backend environment keys...");
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: code as string,
            redirect_uri: redirectUri,
          }).toString()
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error_description || data.error || "Failed token exchange");
        }

        return res.send(`
          <html>
            <head><title>Spotify Connected</title></head>
            <body style="background: #121212; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
              <div style="text-align: center; background: #1a1a1a; border: 1px solid #282828; padding: 40px; border-radius: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.6); max-w: 360px; width: 90%;">
                <div style="font-size: 52px; margin-bottom: 15px; animation: pulse 2s infinite;">🎵</div>
                <h2 style="margin: 0 0 10px 0; color: #1DB954; font-weight: 800; tracking: -0.5px;">Authorized successfully!</h2>
                <p style="color: #b3b3b3; font-size: 13px; line-height: 1.5; margin: 0 0 25px 0;">Your Spotify account is now linked. This window will dismiss shortly.</p>
                <div style="width: 20px; height: 20px; border: 2px solid #1DB954; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
              </div>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'SPOTIFY_AUTH_SUCCESS', data: ${JSON.stringify(data)} }, '*');
                  setTimeout(() => window.close(), 1000);
                } else {
                  localStorage.setItem('spotify_token_data', JSON.stringify(${JSON.stringify(data)}));
                  window.location.href = '/';
                }
              </script>
              <style>
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
              </style>
            </body>
          </html>
        `);
      } catch (err: any) {
        console.warn("Server-side Spotify exchange failed; falling back to code delivery:", err.message || err);
      }
    }

    // Fallback: Send the code back to the React app, allowing client-side/interactive exchange with user-supplied keys
    res.send(`
      <html>
        <head><title>Spotify Code Received</title></head>
        <body style="background: #121212; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; background: #1a1a1a; border: 1px solid #282828; padding: 40px; border-radius: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.6); max-w: 360px; width: 90%;">
            <div style="font-size: 52px; margin-bottom: 15px;">⚡</div>
            <h2 style="margin: 0 0 10px 0; color: #1DB954; font-weight: 800;">Code Received!</h2>
            <p style="color: #b3b3b3; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">Authorization code received. Sending token back to Chesster client...</p>
            <div style="width: 20px; height: 20px; border: 2px solid #1DB954; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'SPOTIFY_AUTH_CODE', code: '${code}' }, '*');
              setTimeout(() => window.close(), 1000);
            } else {
              window.location.href = '/?spotify_code=${code}';
            }
          </script>
          <style>
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </body>
      </html>
    `);
  });

  app.post("/api/auth/spotify/exchange", async (req, res) => {
    const { code, clientId, clientSecret, redirectUri } = req.body;
    const targetId = clientId || process.env.SPOTIFY_CLIENT_ID;
    const targetSecret = clientSecret || process.env.SPOTIFY_CLIENT_SECRET;

    if (!targetId || !targetSecret) {
      return res.status(400).json({ error: "Spotify Client ID and Client Secret are required. Please configure them." });
    }

    try {
      console.log("Exchanging client-specified credentials for Spotify access token...");
      const bodyParams = new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      });

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(`${targetId}:${targetSecret}`).toString("base64")
        },
        body: bodyParams.toString()
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to exchange code" });
    }
  });

  app.get("/api/spotify/search", async (req, res) => {
    const { q, token } = req.query;
    if (!token) {
      return res.status(401).json({ error: "Access token is required" });
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q as string)}&type=track&limit=20`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to search Spotify" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Socket.IO Server State and Connection Handlers
  const rooms = new Map<string, any>();
  const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

  const broadcastLobbyRooms = () => {
    const lobbyRoomsList = Array.from(rooms.values())
      .filter(r => !r.isPrivate && (r.status === "waiting" || r.status === "playing"))
      .map(r => ({
        id: r.id,
        name: r.name,
        creatorName: r.creatorName,
        creatorAvatar: r.creatorAvatar,
        timeControl: r.timeControl,
        playersCount: (r.players.w ? 1 : 0) + (r.players.b ? 1 : 0),
        status: r.status,
        challenges: r.challenges
      }));
    io.emit("lobby-rooms", lobbyRoomsList);
  };

  io.on("connection", (socket) => {
    console.log(`[Socket] New connection: ${socket.id}`);

    socket.on("get-lobby-rooms", () => {
      const lobbyRoomsList = Array.from(rooms.values())
        .filter(r => !r.isPrivate && (r.status === "waiting" || r.status === "playing"))
        .map(r => ({
          id: r.id,
          name: r.name,
          creatorName: r.creatorName,
          creatorAvatar: r.creatorAvatar,
          timeControl: r.timeControl,
          playersCount: (r.players.w ? 1 : 0) + (r.players.b ? 1 : 0),
          status: r.status,
          challenges: r.challenges
        }));
      socket.emit("lobby-rooms", lobbyRoomsList);
    });

    socket.on("create-room", ({ playerName, playerAvatar, preferColor, isPrivate, timeControl, challenges }) => {
      const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
      console.log(`[Lobby] Creating room ${roomId} for ${playerName}`);
      
      const actualTimeControl = timeControl || 600;
      const roomChallenges = challenges || [];
      
      const pColor = preferColor === "random" 
        ? (Math.random() < 0.5 ? "w" : "b") 
        : (preferColor || "w");

      const room = {
        id: roomId,
        name: `Room #${roomId} - ${playerName}`,
        creatorName: playerName,
        creatorAvatar: playerAvatar,
        isPrivate: !!isPrivate,
        timeControl: actualTimeControl,
        challenges: roomChallenges,
        players: {
          [pColor]: { id: socket.id, name: playerName, avatar: playerAvatar }
        },
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        history: [],
        status: "waiting",
        createdAt: Date.now()
      };

      rooms.set(roomId, room);
      socket.join(roomId);
      
      socket.emit("room-created", {
        roomId,
        myColor: pColor,
        room
      });

      if (!isPrivate) {
        broadcastLobbyRooms();
      }
    });

    socket.on("join-room", ({ roomId, playerName, playerAvatar }) => {
      const rid = roomId?.toUpperCase();
      const room = rooms.get(rid);
      console.log(`[Lobby] Player ${playerName} attempting to join room ${rid}`);

      if (!room) {
        console.log(`[Lobby] Join failed: Room ${rid} not found. Available rooms: ${Array.from(rooms.keys()).join(", ")}`);
        socket.emit("error-message", "Lobby not found! Please check the code.");
        return;
      }

      // If a player is reconnecting to their own room
      if (disconnectTimeouts.has(rid)) {
        console.log(`[Lobby] Player reconnecting to room ${rid}, clearing deletion timeout.`);
        clearTimeout(disconnectTimeouts.get(rid));
        disconnectTimeouts.delete(rid);
      }

      if (room.status !== "waiting" && room.players.w?.id !== socket.id && room.players.b?.id !== socket.id) {
        // Only allow if room is waiting OR if it's a reconnection (handled by socket id check)
        // But for simplicity, let's just check status for now
        socket.emit("error-message", "This lobby is already in session or full.");
        return;
      }

      const myColor = !room.players.w ? "w" : (!room.players.b ? "b" : null);
      if (!myColor) {
        socket.emit("error-message", "Room is already full!");
        return;
      }

      room.players[myColor] = { id: socket.id, name: playerName, avatar: playerAvatar };
      room.status = "playing";
      
      socket.join(rid);
      console.log(`[Lobby] Player ${playerName} joined room ${rid} as ${myColor}`);

      socket.emit("room-joined", {
        roomId: rid,
        myColor,
        room
      });

      const opponentColor = myColor === "w" ? "b" : "w";
      const opponent = room.players[opponentColor];
      if (opponent) {
        io.to(opponent.id).emit("opponent-joined", {
          opponent: room.players[myColor],
          color: myColor,
          room
        });
      }

      broadcastLobbyRooms();
    });

    socket.on("call-stockfish", ({ roomId }) => {
      const room = rooms.get(roomId?.toUpperCase());
      if (!room || room.status !== "waiting") return;

      const botColor = !room.players.w ? "w" : (!room.players.b ? "b" : null);
      if (!botColor) return;

      room.players[botColor] = { 
        id: "stockfish-bot-id", 
        name: "Stockfish Bot", 
        avatar: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png",
        isBot: true 
      };
      room.status = "playing";

      io.to(roomId).emit("opponent-joined", {
        opponent: room.players[botColor],
        color: botColor,
        room
      });

      broadcastLobbyRooms();
    });

    socket.on("update-challenges", ({ roomId, challenges }) => {
      const room = rooms.get(roomId?.toUpperCase());
      if (!room) return;
      
      // Only host (creator) can update challenges
      if (room.players.w?.id !== socket.id && room.players.b?.id !== socket.id) return;
      
      // Simple check: host is whoever is in the room and matches the creatorName
      const myPlayer = room.players.w?.id === socket.id ? room.players.w : (room.players.b?.id === socket.id ? room.players.b : null);
      if (!myPlayer || myPlayer.name !== room.creatorName) return;

      room.challenges = challenges;
      io.to(roomId).emit("challenges-updated", { challenges });
    });

    socket.on("make-move", ({ roomId, move }) => {
      const rid = roomId?.toUpperCase();
      const room = rooms.get(rid);
      if (!room) return;

      room.fen = move.fen;
      room.history.push(move);
      
      socket.to(rid).emit("move-made", move);
    });

    socket.on("send-chat", ({ roomId, text, senderName }) => {
      const message = {
        text,
        senderName,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      io.to(roomId).emit("receive-chat", message);
    });

    socket.on("resign-match", ({ roomId, playerColor }) => {
      const rid = roomId?.toUpperCase();
      const room = rooms.get(rid);
      if (!room) return;

      room.status = "gameover";
      const winningColor = playerColor === "w" ? "b" : "w";
      io.to(rid).emit("match-resigned", { winningColor });
    });

    socket.on("offer-draw", ({ roomId, senderColor }) => {
      const rid = roomId?.toUpperCase();
      const room = rooms.get(rid);
      if (!room) return;

      const oppColor = senderColor === "w" ? "b" : "w";
      const opponent = room.players[oppColor];

      if (opponent && opponent.isAI) {
        // AI always accepts draw for now
        setTimeout(() => {
          room.status = "gameover";
          io.to(rid).emit("draw-responded", { accepted: true });
        }, 800);
      } else {
        socket.to(rid).emit("draw-offered", { senderColor });
      }
    });

    socket.on("draw-response", ({ roomId, accepted }) => {
      const rid = roomId?.toUpperCase();
      const room = rooms.get(rid);
      if (accepted && room) {
        room.status = "gameover";
      }
      io.to(rid).emit("draw-responded", { accepted });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
      
      for (const [roomId, room] of rooms.entries()) {
        const isWhite = room.players.w?.id === socket.id;
        const isBlack = room.players.b?.id === socket.id;

        if (isWhite || isBlack) {
          const myColor = isWhite ? "w" : "b";
          const opponentColor = isWhite ? "b" : "w";
          const opponent = room.players[opponentColor];

          if (room.status === "playing" && opponent) {
            io.to(opponent.id).emit("opponent-disconnected", { myColor });
          }

          // Don't delete immediately. Give a 60s grace period for reconnections
          console.log(`[Lobby] Player in room ${roomId} disconnected. Setting 60s grace period before deletion.`);
          
          const timeout = setTimeout(() => {
            console.log(`[Lobby] Grace period expired for room ${roomId}. Deleting room.`);
            rooms.delete(roomId);
            disconnectTimeouts.delete(roomId);
            broadcastLobbyRooms();
          }, 60000);

          disconnectTimeouts.set(roomId, timeout);
          break;
        }
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
