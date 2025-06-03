import React from 'react';

type ScoreboardProps = {
  scores: { player: number; computer: number };
  turn: 'player' | 'computer';
};

const Scoreboard: React.FC<ScoreboardProps> = ({ scores, turn }) => (
  <div className="scoreboard">
    <div>Player: {scores.player}</div>
    <div>Computer: {scores.computer}</div>
    <div>Turn: <b>{turn === 'player' ? 'You' : 'Computer'}</b></div>
  </div>
);

export default Scoreboard; 