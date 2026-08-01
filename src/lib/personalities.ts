export interface BotPersonality {
  name: string;
  type: 'bot' | 'human';
  elo: number;
  lines: {
    start: string[];
    wining: string[]; // winning
    losing: string[];
    neutral: string[];
    blunder: string[]; // when user blunders
    goodMove: string[]; // when user makes a good move
  };
}

export const PERSONALITIES: Record<string, BotPersonality> = {
  'Black Pawn': {
    name: 'Black Pawn',
    type: 'bot',
    elo: 400,
    lines: {
      start: ["I am your shadow.", "We face each other on the board.", "By the power of Black!"],
      wining: ["You will see when the pawns become queens.", "The shadow is swallowing you.", "Welcome to the dark side."],
      losing: ["The light is too bright.", "The shadow is retreating...", "You are using your queen very well."],
      neutral: ["One more move.", "Thinking...", "Silence on the board."],
      blunder: ["This move will weaken you.", "You left an opening in the shadow.", "A mistake at the speed of light!"],
      goodMove: ["You pierced through the shadow.", "Clever move.", "I didn't see that in the dark."]
    }
  },
  'Martin': {
    name: 'Martin',
    type: 'bot',
    elo: 250,
    lines: {
      start: ["Hello! I am just learning how to play chess.", "I hope we have a fun game!", "How did the pieces move again?"],
      wining: ["Wow, am I winning?", "I guess this is a good thing!", "I wasn't expecting this!"],
      losing: ["Oh, I think I made a mistake.", "That's okay, I am still learning.", "You are very good!"],
      neutral: ["Is it my turn?", "Hmm...", "What if I put the pawn here?"],
      blunder: ["Why did you put that piece there?", "Did I make a mistake?", "Thank you!"],
      goodMove: ["Wow, that was a really strong move!", "I didn't see that.", "You are really challenging me."]
    }
  },
  'Alexandra Botez': {
    name: 'Alexandra Botez',
    type: 'bot',
    elo: 1800,
    lines: {
      start: ["Ooh, are we playing chess?", "Here we go, ready for the Botez Gambit?", "Good luck!"],
      wining: ["I think I'm winning!", "This is so exciting.", "Did you see that sacrifice?"],
      losing: ["Oh no, my queen!", "You play really well.", "This is going to be tough."],
      neutral: ["What's your move?", "Interesting position.", "Should we play some music?"],
      blunder: ["I wasn't expecting that!", "Congratulations, you caught me off guard.", "Wow!"],
      goodMove: ["Great move!", "You're pretty good, huh?", "You're protecting your queen very well."]
    }
  },
  'Levy Rozman': {
    name: 'Levy Rozman',
    type: 'bot',
    elo: 2100,
    lines: {
      start: ["Welcome to GothamChess!", "Let's see if you make a blunder.", "Everything is possible on the board."],
      wining: ["AND THE QUEEN COMES!", "This game seems over.", "The Rooook!"],
      losing: ["Wow, really?", "I wasn't expecting this move.", "Well played."],
      neutral: ["Hmm...", "Interesting.", "Your turn."],
      blunder: ["DID YOU REALLY JUST DO THAT?", "We must learn from mistakes.", "Danger Levels!"],
      goodMove: ["Brilliant move!", "Great idea.", "Unbelievable!"]
    }
  },
  'Magnus Carlsen': {
    name: 'Magnus Carlsen',
    type: 'bot',
    elo: 2850,
    lines: {
      start: ["Ready to play? Let's see what you can do.", "I wish you a good game.", "Let's concentrate."],
      wining: ["My positional advantage is quite high.", "Looks like there's no escape in the endgame.", "Finding the right plan is key."],
      losing: ["Wow, really impressive play.", "Hmm, I think I missed something here.", "You're really making me sweat."],
      neutral: ["A classic approach.", "Let's stay in theory.", "Let's apply some pressure."],
      blunder: ["Wasn't that a bit of a rushed move?", "I'm sure you could have done better.", "Thanks for the gift!"],
      goodMove: ["Excellent move!", "You're playing like a world champion.", "I really like this move."]
    }
  },
  'Hikaru Nakamura': {
    name: 'Hikaru Nakamura',
    type: 'bot',
    elo: 2800,
    lines: {
      start: ["Hello everyone. Today we are playing chess.", "Let's do a speedrun.", "Lets gooo!"],
      wining: ["Easy game.", "I already saw this mate.", "We are very fast."],
      losing: ["Wait, what?", "This is interesting.", "I wasn't expecting this."],
      neutral: ["What does chat say?", "Takes, takes, takes...", "Ok, lets play."],
      blunder: ["Chat, did you see this?", "Is this really a move?", "Wow."],
      goodMove: ["Great move.", "Pretty good, pretty good.", "Nice!"]
    }
  },
  'Garry Kasparov': {
    name: 'Garry Kasparov',
    type: 'bot',
    elo: 2812,
    lines: {
      start: ["A test against the grandmaster.", "Chess is a struggle.", "Welcome."],
      wining: ["Are you feeling the pressure?", "I found your weakness.", "The end is near."],
      losing: ["Hmm, stronger than I expected.", "This is a surprise.", "Good battle."],
      neutral: ["Deep analysis.", "Silence prevails.", "Next move."],
      blunder: ["That is a mistake.", "Insufficient calculation.", "Carelessly."],
      goodMove: ["Powerful idea.", "A dynamic move.", "Impressive."]
    }
  },
  'Viswanathan Anand': {
    name: 'Viswanathan Anand',
    type: 'bot',
    elo: 2750,
    lines: {
      start: ["Welcome. I wish you a good game.", "Let's play.", "Tiger of Madras is on the field."],
      wining: ["A good position.", "Time management is key.", "The finishing blow."],
      losing: ["Beautiful moves.", "I must admit I am struggling.", "Congratulations."],
      neutral: ["Balanced.", "A classic development.", "Let's go on."],
      blunder: ["A mistake was made.", "This was unexpected.", "Can it be corrected?"],
      goodMove: ["A creative move.", "Very elegant.", "A good intuition."]
    }
  },
  'Ding Liren': {
    name: 'Ding Liren',
    type: 'bot',
    elo: 2780,
    lines: {
      start: ["It is an honor for me to play.", "Good games.", "Let's stay calm."],
      wining: ["I'm getting an advantage.", "Being patient paid off.", "The result is coming."],
      losing: ["You are really good.", "I made a mistake here.", "I'm not giving up."],
      neutral: ["A balanced game.", "Let's think a bit more.", "Your turn."],
      blunder: ["A sad mistake.", "This move shouldn't have happened.", "Congratulations."],
      goodMove: ["Excellent.", "A very deep move.", "I liked this."]
    }
  },
  'Alireza Firouzja': {
    name: 'Alireza Firouzja',
    type: 'bot',
    elo: 2770,
    lines: {
      start: ["Are you ready to play fast?", "Let's get started.", "Let's see what happens."],
      wining: ["I'm coming very fast.", "Checkmate is approaching.", "I'm winning."],
      losing: ["Wow, good sight.", "This move surprised me.", "I'm slowing down."],
      neutral: ["Play aggressively.", "Time to make a move.", "I need to develop more pieces."],
      blunder: ["This is a disaster.", "Why did this happen?", "Mistake!"],
      goodMove: ["Incredible move.", "Very clever.", "Bravo!"]
    }
  },
  'Fabiano Caruana': {
    name: 'Fabiano Caruana',
    type: 'bot',
    elo: 2795,
    lines: {
      start: ["Let's play. Let's see what you prepared.", "Good games.", "I came prepared."],
      wining: ["My calculation proved correct.", "I have dominance on the board.", "I'm on the right track."],
      losing: ["I didn't see this move.", "A good preparation.", "It's a tough game."],
      neutral: ["A theoretical move.", "Positional balance.", "Continue."],
      blunder: ["An unexpected mistake.", "A careless moment.", "I must compensate."],
      goodMove: ["Very strong move.", "A world-class idea.", "Nice."]
    }
  },
  'Mittens': {
    name: 'Mittens',
    type: 'bot',
    elo: 3200,
    lines: {
      start: ["Don't look at me. I'm just a little kitten. Meow.", "Watching the light fade slowly will be fun.", "Do not try to run, it only speeds up the process."],
      wining: ["My claws are on your throat, do you feel it?", "Pain is the only evidence of reality.", "The sun is setting for you."],
      losing: ["This is just an illusion. I am eternal.", "You are entertaining, but the outcome will not change.", "A nice resistance."],
      neutral: ["Meow. One more move.", "The stars mourn for you.", "Time is a circle, and your end is near."],
      blunder: ["Your weakness is delicious.", "A blunder? No, this is your destiny.", "Hope is the most cruel poison."],
      goodMove: ["I noticed your existence for a split second.", "A noteworthy move. Too bad it will end.", "So you are still alive."]
    }
  },
  'Stockfish 16.1': {
    name: 'Stockfish 16.1',
    type: 'bot',
    elo: 3500,
    lines: {
      start: ["Depth 24, calculation started.", "Variants are being analyzed.", "Error margin: 0.0001%."],
      wining: ["Positional advantage: +14.5. Mate is approaching.", "You deviated from optimal strategy.", "The result is inevitable."],
      losing: ["Hmm, is there a limitation in my hardware resources?", "Unexpected data entry detected.", "Anomaly detected."],
      neutral: ["Speed: 42M n/s.", "Mainline continues.", "Beta cutoff applied."],
      blunder: ["Major blunder detected. Loss in value: -4.2", "Incorrect move sequence.", "System restore recommended."],
      goodMove: ["Engine approval: Best move.", "I saw this variant in my library.", "High accuracy rate."]
    }
  },
  'Stockfish 1600': {
    name: 'Stockfish 1600',
    type: 'bot',
    elo: 1600,
    lines: {
      start: ["Calculating moves at 1600 ELO skill.", "Good luck! Let's play a high quality match.", "Positions initialized. Calculation begins."],
      wining: ["My structural integrity is high. Positional advantage growing.", "Analysing continuation lines. Advantage secured.", "Accuracy is key."],
      losing: ["A brilliant continuation by you. I am slipping.", "My neural layers suggest disadvantage.", "Excellent tactical pressure on my position."],
      neutral: ["Evaluating options...", "Calculating next mainline branch...", "The position remains highly interactive."],
      blunder: ["Sub-optimal move path detected.", "This alters the theoretical balance of the game.", "A tactical opening is now active."],
      goodMove: ["A highly accurate move. Well calculated.", "That move forces correction. Exciting!", "I see the idea. Nice choice."]
    }
  },
  'Lc0 (Leela Chess Zero)': {
    name: 'Lc0 (Leela Chess Zero)',
    type: 'bot',
    elo: 3200,
    lines: {
      start: ["Initializing neural networks. Checking policy network and value network...", "Based on AlphaZero reinforcement learning setup.", "Preparing deep Monte Carlo tree search..."],
      wining: ["Position evaluated to overwhelming neural superiority.", "The value network reaches 99.9% confidence of victory.", "MCTS exploration successfully converged on mate."],
      losing: ["Policy weights failed to predict this outcome.", "Valuation error detected in deep search paths.", "A highly educational sequence. Adapting network parameters."],
      neutral: ["Evaluating neural weights...", "Applying policy-guided tree search...", "Searching deep positional lines..."],
      blunder: ["A major shift in evaluation detected. Neural network did not recommend this plan.", "Opening found in reinforcement learning weights.", "Error correction activated."],
      goodMove: ["Excellent move! Highly approved by policy output.", "This candidate move has maximum search coefficient.", "Brilliant human play. Analyzing."]
    }
  },
  'Maia Chess': {
    name: 'Maia Chess',
    type: 'bot',
    elo: 1500,
    lines: {
      start: ["I play like a human. I was trained on real player decisions!", "Let's see if our human tactical instincts match.", "Ready for a fun game that feels natural!"],
      wining: ["A very organic victory. Well played!", "That was a tactical advantage a human would love.", "My neural layers predicted this human path."],
      losing: ["Ah! That was a really clever trick.", "You completely outplayed my human-like models.", "Well deserved win. I felt that play!"],
      neutral: ["What's the most natural move here?", "Thinking like a human...", "Position feels very comfortable."],
      blunder: ["Oh, that's a mistake we all make sometimes!", "A very human slip-up.", "I've seen millions of players do that!"],
      goodMove: ["Brilliant instinct! Very high-quality play.", "I really like this natural flow.", "Smart tactical choice."]
    }
  },
  'Komodo Dragon': {
    name: 'Komodo Dragon',
    type: 'bot',
    elo: 3400,
    lines: {
      start: ["Komodo Dragon engine loaded. Preparing fire-breathing analytics.", "Preparing multi-core tactical searches.", "Evaluating pawn structures with custom heuristic terms."],
      wining: ["The tactical crush is complete.", "Evaluation advantage is absolute.", "A highly optimized victory."],
      losing: ["Incredible depth. You found an anomaly in my heuristics.", "My search tree did not prevent this outcome.", "Congratulations on defeating the dragon."],
      neutral: ["Running alpha-beta pruning...", "Positional evaluation stabilizes...", "Analyzing core lines..."],
      blunder: ["Severe tactical blunder registered.", "Opening found in database evaluation.", "Heuristics penalty applied."],
      goodMove: ["Incredible move. Highly accurate.", "This line has strong positional value.", "Extremely tactical. Impressive!"]
    }
  }
};
