import React from 'react';
import { Tile } from '../utils/gameLogic';

type RackProps = {
  tiles: Tile[];
  selectedTileId?: string | null;
  onTileSelect?: (tileId: string) => void;
};

const Rack: React.FC<RackProps> = ({ tiles, selectedTileId, onTileSelect }) => {
  return (
    <div className="rack">
      {Array.from({ length: 7 }).map((_, i) => {
        const tile = tiles[i];
        const isSelected = tile && tile.id === selectedTileId;
        return (
          <div
            className={`rack-tile${isSelected ? ' selected' : ''}`}
            key={i}
            onClick={() => tile && onTileSelect && onTileSelect(tile.id)}
            style={{ cursor: tile ? 'pointer' : 'default', borderColor: isSelected ? '#1976d2' : undefined }}
          >
            {tile ? tile.letter : <span style={{ color: '#ccc' }}>?</span>}
          </div>
        );
      })}
    </div>
  );
};

export default Rack; 