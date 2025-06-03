import React from 'react';

type ControlsProps = {
  onPlay: () => void;
  onPass: () => void;
  onExchange: () => void;
  onReset: () => void;
  disabledReset?: boolean;
};

const Controls: React.FC<ControlsProps> = ({ onPlay, onPass, onExchange, onReset, disabledReset }) => (
  <div className="controls">
    <button onClick={onPlay}>Play</button>
    <button onClick={onPass}>Pass</button>
    <button onClick={onExchange}>Exchange</button>
    <button onClick={onReset} disabled={disabledReset}>Reset Turn</button>
  </div>
);

export default Controls; 