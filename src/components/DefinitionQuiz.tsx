import React from 'react';

type DefinitionQuizProps = {
  word: string;
  choices: string[];
  correct: number;
  onSelect: (choiceIdx: number) => void;
  selectedIdx?: number | null;
  showExample?: boolean;
  example?: string;
  onClose?: () => void;
};

const DefinitionQuiz: React.FC<DefinitionQuizProps> = ({ word, choices, correct, onSelect, selectedIdx = null, showExample = false, example, onClose }) => (
  <div className="definition-quiz">
    {onClose && (
      <button className="quiz-close-btn" onClick={onClose} style={{ position: 'absolute', top: 8, right: 12, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
    )}
    <h3>Get bonus points for selecting the correct definition for the word: <b>{word}</b></h3>
    <div className="quiz-choices">
      {choices.map((choice, idx) => {
        let style: React.CSSProperties = {};
        if (selectedIdx !== null) {
          if (idx === correct) style.background = '#d4f7d4'; // green
          if (idx === selectedIdx && selectedIdx !== correct) style.background = '#ffd6d6'; // red
        }
        return (
          <div key={idx} style={{ position: 'relative' }}>
            <button
              onClick={() => onSelect(idx)}
              disabled={selectedIdx !== null}
              style={style}
            >
              {choice}
            </button>
            {showExample && idx === correct && example && (
              <div style={{ fontStyle: 'italic', color: '#444', marginTop: 4, fontSize: 14, textAlign: 'left' }}>
                Example: {example}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default DefinitionQuiz; 