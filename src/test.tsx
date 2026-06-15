import { useState } from 'react';
import { motion } from 'motion/react';

type Player = 'X' | 'O' | null;

export default function TicTacToe() {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState<boolean>(true);
  
  const calculateWinner = (squares: Player[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const winner = calculateWinner(board);
  const isDraw = !winner && board.every((square) => square !== null);

  const handleClick = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="p-8 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-[32px] shadow-2xl flex flex-col items-center"
      >
        <h2 className="text-3xl font-serif tracking-[0.2em] mb-8 text-white/80 uppercase">Tic Tac Toe</h2>
        
        <div className="grid grid-cols-3 gap-3 mb-8">
          {board.map((cell, index) => (
            <button
              key={index}
              onClick={() => handleClick(index)}
              className="w-24 h-24 text-5xl flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all duration-300"
            >
              {cell && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={cell === 'X' ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'text-white/40'}
                >
                  {cell}
                </motion.span>
              )}
            </button>
          ))}
        </div>

        <div className="h-12 flex flex-col items-center justify-center">
          {winner ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-medium tracking-widest text-white shadow-white drop-shadow-lg">
              WINNER: {winner}
            </motion.div>
          ) : isDraw ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-medium tracking-widest text-white/50">
              DRAW
            </motion.div>
          ) : (
             <div className="text-sm font-mono tracking-widest text-white/50 uppercase gap-2 flex items-center">
               Next Player: <span className={`text-lg transition-colors ${xIsNext ? 'text-white' : 'text-white/50'}`}>{xIsNext ? 'X' : 'O'}</span>
             </div>
          )}
        </div>

        {(winner || isDraw) && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={resetGame}
            className="mt-6 px-10 py-4 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-[18px] transition-all duration-300 hover:bg-white/20 active:scale-95 font-mono tracking-widest text-xs uppercase"
          >
            Play Again
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
