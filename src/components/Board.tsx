import React from 'react';
import { Tile } from '../utils/gameLogic';

type BoardProps = {
  board: (Tile | null)[][];
  onCellClick?: (row: number, col: number) => void;
  multipliers: (null | 'TW' | 'DW' | 'TL' | 'DL')[][];
};

function getMultiplierLabel(mult: string | null): string {
  switch (mult) {
    case 'TW': return '3W';
    case 'DW': return '2W';
    case 'TL': return '3L';
    case 'DL': return '2L';
    default: return '';
  }
}

const Board: React.FC<BoardProps> = ({ board, onCellClick, multipliers }) => {
  return (
    <div className="board-grid">
      {board.map((row, rowIdx) => (
        <div className="board-row" key={rowIdx}>
          {row.map((cell, colIdx) => {
            const mult = multipliers[rowIdx][colIdx];
            return (
              <div
                className="board-cell"
                key={colIdx}
                onClick={() => !cell && onCellClick && onCellClick(rowIdx, colIdx)}
                style={{ cursor: !cell && onCellClick ? 'pointer' : 'default', background: cell ? '#f5e7c0' : undefined }}
              >
                {cell ? (
                  <b style={cell.isBlank ? { color: '#888', textTransform: 'lowercase' } : {}}>
                    {cell.isBlank && cell.assignedLetter ? cell.assignedLetter : cell.letter}
                  </b>
                ) : (
                  mult ? <span style={{ fontSize: 11, color: '#1976d2', fontWeight: 600 }}>{getMultiplierLabel(mult)}</span> : null
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Board; 