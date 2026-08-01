import StockfishWorker from "stockfish.js/stockfish.js?worker";

export function createEngine() {
  const worker = new StockfishWorker();
  
  worker.onmessage = (e) => {
    console.log("Stockfish:", e.data);
  };
  
  worker.postMessage("uci");
  
  return worker;
}
