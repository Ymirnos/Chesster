/// <reference types="vite/client" />

declare module "stockfish.js/stockfish.js?worker" {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}
