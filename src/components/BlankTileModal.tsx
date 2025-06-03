import React from 'react';

interface BlankTileModalProps {
  open: boolean;
  onSelect: (letter: string) => void;
  onCancel: () => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const BlankTileModal: React.FC<BlankTileModalProps> = ({ open, onSelect, onCancel }) => {
  if (!open) return null;
  return (
    <div className="blank-tile-modal-overlay">
      <div className="blank-tile-modal">
        <h3>Select a letter for your blank tile</h3>
        <div className="blank-tile-letters">
          {ALPHABET.map(letter => (
            <button
              key={letter}
              className="blank-tile-letter-btn"
              onClick={() => onSelect(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
        <button className="blank-tile-cancel-btn" onClick={onCancel} style={{ marginTop: 12 }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BlankTileModal; 