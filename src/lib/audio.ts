let sounds: Record<string, HTMLAudioElement> | null = null;

const initSounds = () => {
  if (typeof window === 'undefined') return null;
  return {
    move: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3"),
    capture: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3"),
    check: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3"),
    castle: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3"),
    gameEnd: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3"),
    promote: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3"),
    click: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3"),
    hover: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3"),
    notification: new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3")
  };
};

export const playSound = (type: "move" | "capture" | "check" | "gameEnd" | "promote" | "castle" | "click" | "hover" | "notification") => {
  if (!sounds) {
    sounds = initSounds();
  }
  
  if (sounds) {
    const sound = sounds[type];
    if (sound) {
      sound.currentTime = 0;
      if (type === "hover") {
        sound.volume = 0.15;
      } else {
        sound.volume = 0.7;
      }
      sound.play().catch(e => console.error("Audio play error:", e));
    }
  }
};
