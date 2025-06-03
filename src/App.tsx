import React, { useEffect, useMemo, useState } from 'react';
import Board from './components/Board';
import Rack from './components/Rack';
import Scoreboard from './components/Scoreboard';
import Controls from './components/Controls';
import DefinitionQuiz from './components/DefinitionQuiz';
import BlankTileModal from './components/BlankTileModal';
import './App.css';
import { createTileBag, refillRack, Tile, TileBag, arePlacementsInLine, isMoveConnected, getAllWordsFormed, calculateScore, BOARD_MULTIPLIERS, findSimpleComputerMove, findAdvancedComputerMove, findBestComputerMove } from './utils/gameLogic';

// Placeholder imports for components (to be created)
// import Board from './components/Board';
// import Rack from './components/Rack';
// import Scoreboard from './components/Scoreboard';
// import Controls from './components/Controls';
// import DefinitionQuiz from './components/DefinitionQuiz';

const BOARD_SIZE = 15;

type PendingPlacement = {
  tile: Tile;
  row: number;
  col: number;
};

const App: React.FC = () => {
  // Game state hooks
  const [board, setBoard] = useState<any[][]>(
    Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null))
  );
  const [playerRack, setPlayerRack] = useState<Tile[]>([]);
  const [computerRack, setComputerRack] = useState<Tile[]>([]);
  const [tileBag, setTileBag] = useState<TileBag>([]);
  const [scores, setScores] = useState<{ player: number; computer: number }>({ player: 0, computer: 0 });
  const [turn, setTurn] = useState<'player' | 'computer'>('player');
  const [definitionQuiz, setDefinitionQuiz] = useState<null | { word: string; choices: string[]; correct: number }>(null);
  const [wordLists, setWordLists] = useState<any>({});
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [pendingPlacements, setPendingPlacements] = useState<PendingPlacement[]>([]);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [computerAction, setComputerAction] = useState<string | null>(null);
  const [checkingOnlineWord, setCheckingOnlineWord] = useState(false);
  const [showComputerRack, setShowComputerRack] = useState(false);
  const [wordMemo, setWordMemo] = useState<{ [word: string]: { valid: boolean, meaning?: string } }>({});
  const [blankModalOpen, setBlankModalOpen] = useState(false);
  const [pendingBlankPlacement, setPendingBlankPlacement] = useState<{ row: number; col: number; tile: Tile } | null>(null);
  const [pendingBonus, setPendingBonus] = useState<{ word: string; source: string } | null>(null);
  const [quizSelectedIdx, setQuizSelectedIdx] = useState<number | null>(null);
  const [quizShowExample, setQuizShowExample] = useState(false);
  const [quizExample, setQuizExample] = useState<string | undefined>(undefined);
  const [quizClosePending, setQuizClosePending] = useState(false);
  const [difficulty, setDifficulty] = useState<'beginner' | 'advanced'>('advanced');

  // Load word lists from public/data
  useEffect(() => {
    const loadWordLists = async () => {
      const [sat, oxford3000, oxford5000] = await Promise.all([
        fetch('/data/SAT369_definitions_examples.json').then(res => res.json()),
        fetch('/data/oxford_3000.json').then(res => res.json()),
        fetch('/data/oxford_5000_exclusive.json').then(res => res.json()),
      ]);
      setWordLists({ sat, oxford3000, oxford5000 });
    };
    loadWordLists();
  }, []);

  // On first load, create tile bag and fill racks
  useEffect(() => {
    const bag = createTileBag();
    const { rack: playerRackInit, bag: bagAfterPlayer } = refillRack([], bag);
    const { rack: computerRackInit, bag: bagAfterComputer } = refillRack([], bagAfterPlayer);
    setTileBag(bagAfterComputer);
    setPlayerRack(playerRackInit);
    setComputerRack(computerRackInit);
  }, []);

  // Select a tile from the rack
  const handleTileSelect = (tileId: string) => {
    setSelectedTileId(tileId);
  };

  // Place selected tile on the board
  const handleCellClick = (row: number, col: number) => {
    if (!selectedTileId) return;
    if (board[row][col] !== null || pendingPlacements.some(p => p.row === row && p.col === col)) return;
    const tile = playerRack.find(t => t.id === selectedTileId);
    if (!tile) return;
    if (tile.isBlank) {
      setPendingBlankPlacement({ tile, row, col });
      setBlankModalOpen(true);
      return;
    }
    setPendingPlacements([...pendingPlacements, { tile, row, col }]);
    setPlayerRack(playerRack.filter(t => t.id !== selectedTileId));
    setSelectedTileId(null);
  };

  interface Word {
    word: string;
    part_of_speech: string;
    definition: string;
    // example: string;
  }

  // Helper to get words from a word list (array or object)
  function getWordListWords(list: Word[]): string[] {
    if (!list) return [];
    // debugger;
    // If array of objects with 'word' property
    if (list.length > 0) {
      const firstWord = list[0] || {};
        if (typeof firstWord === 'object' && 'word' in firstWord) {
        return list.map((w: Word) => String(w.word).toLowerCase());
        } else {
        // shouldn't arrive here
        }
    } 
    return [];
  }

  // const dictSet = useMemo(() => {
  //   if (!wordLists) return new Set([]);
  //   return new Set([
  //   ...getWordListWords(Object.values(wordLists.sat)),
  //   ...getWordListWords(Object.values(wordLists.oxford3000)),
  //   ...getWordListWords(Object.values(wordLists.oxford5000)),
  // ])}, [wordLists]);

  // Spinner component
  const Spinner = () => (
    <div style={{ marginTop: 8 }}>
      <div className="spinner" />
      <div style={{ fontSize: 12, color: '#1976d2' }}>Checking word online...</div>
    </div>
  );

  // Add a helper to trigger the definition quiz for a given move
  function maybeShowDefinitionQuiz(words: any[][], board: any[][], wordLists: any, wordMemo: any, setDefinitionQuiz: any, setPendingBonus: any) {
    const main = getMainWordAndScore(words, board);
    if (main) {
      const { wordStr } = main;
      const defObj = getWordSourceAndDefinition(wordStr, wordLists, wordMemo);
      if (defObj && defObj.definition) {
        const distractors = getRandomOxford3000Definitions(wordLists, wordStr, 3);
        const allChoices = [defObj.definition, ...distractors];
        const shuffled = allChoices.map((choice, i) => ({ choice, i })).sort(() => Math.random() - 0.5);
        const choices = shuffled.map(x => x.choice);
        const correct = shuffled.findIndex(x => x.i === 0);
        setDefinitionQuiz({
          word: wordStr,
          choices,
          correct
        });
        setPendingBonus({ word: wordStr, source: defObj.source });
        return true;
      }
    }
    return false;
  }

  // Placeholder callbacks
  const handlePlay = async () => {
    if (pendingPlacements.length === 0) return;
    // --- Move validation ---
    const placements = pendingPlacements.map(p => ({ row: p.row, col: p.col, tile: p.tile }));
    // 1. All in a line
    const { isLine } = arePlacementsInLine(placements);
    if (!isLine) {
      alert('Tiles must be placed in a straight line.');
      return;
    }
    // 2. Connected to existing tiles (or center for first move)
    if (!isMoveConnected(placements, board)) {
      alert('Move must connect to existing tiles (or cover center for first move).');
      return;
    }
    // 3. All words valid (local + online + memo)
    const words = getAllWordsFormed(placements, board);
    const dictSet = new Set([
      ...getWordListWords(Object.values(wordLists.sat)),
      ...getWordListWords(Object.values(wordLists.oxford3000)),
      ...getWordListWords(Object.values(wordLists.oxford5000)),
    ]);
    let newMemo: { [word: string]: { valid: boolean, meaning?: string } } = { ...wordMemo };
    for (const wordArr of words) {
      const wordStr = wordArr.map(w => w.tile.letter).join('').toLowerCase();
      // Check memo first
      if (newMemo[wordStr]) {
        if (!newMemo[wordStr].valid) {
          alert(`Invalid word: ${wordStr}`);
          return;
        } else {
          continue;
        }
      }
      if (dictSet.has(wordStr)) {
        newMemo[wordStr] = { valid: true };
        continue;
      }
      // Not found locally, check online
      setCheckingOnlineWord(true);
      try {
        const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordStr}`);
        const data = await resp.json();
        setCheckingOnlineWord(false);
        if (Array.isArray(data) && data.length > 0 && data[0].meanings && data[0].meanings.length > 0 && data[0].meanings[0].definitions && data[0].meanings[0].definitions.length > 0) {
          const meaning = data[0].meanings[0].definitions[0].definition;
          newMemo[wordStr] = { valid: true, meaning };
          continue;
        } else {
          newMemo[wordStr] = { valid: false };
          alert(`Invalid word: ${wordStr}`);
          setWordMemo(newMemo);
          return;
        }
      } catch (e) {
        setCheckingOnlineWord(false);
        alert(`Error checking word online: ${wordStr}`);
        return;
      }
    }
    setWordMemo(newMemo);
    // --- End validation ---
    // Calculate score
    const score = calculateScore(words);
    setScores(prev => ({ ...prev, player: prev.player + score }));
    // Commit pending placements to the board
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => row.slice());
      pendingPlacements.forEach(({ tile, row, col }) => {
        newBoard[row][col] = tile;
      });
      return newBoard;
    });
    // Clear pending placements
    setPendingPlacements([]);
    // Refill rack
    setPlayerRack(prevRack => {
      const { rack: newRack, bag: newBag } = refillRack(prevRack, tileBag);
      setTileBag(newBag);
      return newRack;
    });
    // --- Definition Quiz logic (only after human turn) ---
    maybeShowDefinitionQuiz(words, board, wordLists, newMemo, setDefinitionQuiz, setPendingBonus);
    // Always switch to computer turn after play
    setTurn('computer');
    setIsComputerThinking(true);
  };
  const handlePass = () => { alert('Pass pressed'); };
  const handleExchange = () => { alert('Exchange pressed'); };
  const handleQuizSelect = (idx: number) => {
    if (!definitionQuiz) return;
    setQuizSelectedIdx(idx);
    if (idx === definitionQuiz.correct && pendingBonus) {
      let bonus = 0;
      if (pendingBonus.source === 'sat') bonus = 10;
      else if (pendingBonus.source === 'oxford5000') bonus = 7;
      else if (pendingBonus.source === 'oxford3000' || pendingBonus.source === 'api') bonus = 5;
      setScores(prev => ({ ...prev, player: prev.player + bonus }));
      setQuizShowExample(false);
      setQuizExample(undefined);
      setQuizClosePending(true);
      setTimeout(() => {
        setDefinitionQuiz(null);
        setPendingBonus(null);
        setQuizSelectedIdx(null);
        setQuizShowExample(false);
        setQuizExample(undefined);
        setQuizClosePending(false);
      }, 1000);
    } else {
      // Show example for the correct answer if available
      let example: string | undefined = undefined;
      if (definitionQuiz && pendingBonus) {
        // Find the correct entry in the word lists
        const word = definitionQuiz.word;
        let entry: any = null;
        if (pendingBonus.source === 'sat') {
          entry = Object.values(wordLists.sat || {}).find((w: any) => w.word && String(w.word).toLowerCase() === word);
        } else if (pendingBonus.source === 'oxford5000') {
          entry = Object.values(wordLists.oxford5000 || {}).find((w: any) => w.word && String(w.word).toLowerCase() === word);
        } else if (pendingBonus.source === 'oxford3000') {
          entry = Object.values(wordLists.oxford3000 || {}).find((w: any) => w.word && String(w.word).toLowerCase() === word);
        }
        if (entry && entry.example) example = entry.example;
      }
      setQuizShowExample(true);
      setQuizExample(example);
    }
  };
  const handleQuizClose = () => {
    setDefinitionQuiz(null);
    setPendingBonus(null);
    setQuizSelectedIdx(null);
    setQuizShowExample(false);
    setQuizExample(undefined);
    setQuizClosePending(false);
  };

  // Reset turn: move pending tiles back to rack
  const handleResetTurn = () => {
    if (pendingPlacements.length === 0) return;
    setPlayerRack(prev => [...prev, ...pendingPlacements.map(p => p.tile)]);
    setPendingPlacements([]);
    setSelectedTileId(null);
  };

  // Merge board and pending placements for display
  const displayBoard = board.map((row, rowIdx) =>
    row.map((cell, colIdx) => {
      const pending = pendingPlacements.find(p => p.row === rowIdx && p.col === colIdx);
      return pending ? pending.tile : cell;
    })
  );

  // Computer move effect
  useEffect(() => {
    if (turn === 'computer' && isComputerThinking) {
      setTimeout(() => {
        // Build dictionary set
        const dictSet = new Set([
          ...getWordListWords(Object.values(wordLists.sat)),
          ...getWordListWords(Object.values(wordLists.oxford3000)),
          ...getWordListWords(Object.values(wordLists.oxford5000)),
        ]);
        // Debug logs
        console.log('AI DEBUG: board', board);
        console.log('AI DEBUG: computerRack', computerRack);
        console.log('AI DEBUG: dictSet has DO:', dictSet.has('do'), 'TO:', dictSet.has('to'));
        debugger;
        // Find a move using advanced AI
        const move = difficulty === 'beginner'
          ? findSimpleComputerMove(computerRack, board, dictSet)
          : findBestComputerMove(computerRack, board, dictSet);
        console.log('AI DEBUG: move found', move);
        if (move) {
          // Commit move to board
          setBoard(prevBoard => {
            const newBoard = prevBoard.map(row => row.slice());
            move.forEach(({ tile, row, col }) => {
              newBoard[row][col] = tile;
            });
            return newBoard;
          });
          // Update computer rack
          setComputerRack(prevRack => {
            const usedIds = new Set(move.map(m => m.tile.id));
            const filtered = prevRack.filter(t => !usedIds.has(t.id));
            const { rack: newRack, bag: newBag } = refillRack(filtered, tileBag);
            setTileBag(newBag);
            return newRack;
          });
          // Score
          const words = getAllWordsFormed(move, board);
          const score = calculateScore(words);
          setScores(prev => ({ ...prev, computer: prev.computer + score }));
          // Show what the computer played
          const playedWord = words.length > 0 ? words[0].map(w => w.tile.letter).join('') : '';
          setComputerAction(`Computer played: ${playedWord}`);
          // --- NO quiz popover after computer move ---
        } else {
          setComputerAction('Computer passed!');
        }
        // Hide the message after 2 seconds
        // setTimeout(() => setComputerAction(null), 2000);
        // Switch back to player
        setTurn('player');
        setIsComputerThinking(false);
      }, 1000);
    }
  }, [turn, isComputerThinking, board, computerRack, tileBag, wordLists, difficulty]);

  const handleBlankSelect = (letter: string) => {
    if (!pendingBlankPlacement) return;
    const tileWithLetter = { ...pendingBlankPlacement.tile, assignedLetter: letter };
    setPendingPlacements([...pendingPlacements, { tile: tileWithLetter, row: pendingBlankPlacement.row, col: pendingBlankPlacement.col }]);
    setPlayerRack(playerRack.filter(t => t.id !== pendingBlankPlacement.tile.id));
    setSelectedTileId(null);
    setBlankModalOpen(false);
    setPendingBlankPlacement(null);
  };

  const handleBlankCancel = () => {
    setBlankModalOpen(false);
    setPendingBlankPlacement(null);
  };

  function getMainWordAndScore(words: any[][], board: any[][]): { wordArr: any[]; wordStr: string; score: number } | null {
    let maxScore = -1;
    let mainWord = null;
    for (const wordArr of words) {
      const wordStr = wordArr.map((w: any) => w.tile.isBlank && w.tile.assignedLetter ? w.tile.assignedLetter : w.tile.letter).join('').toLowerCase();
      const score = calculateScore([wordArr]);
      if (score > maxScore) {
        maxScore = score;
        mainWord = { wordArr, wordStr, score };
      }
    }
    return mainWord;
  }

  function getWordSourceAndDefinition(word: string, wordLists: any, wordMemo: any): { source: string; definition: string } | null {
    // Check SAT first
    const satArr = Object.values(wordLists.sat || {}) as any[];
    const satEntry = satArr.find((w: any) => w.word && String(w.word).toLowerCase() === word);
    if (satEntry && satEntry.definition) return { source: 'sat', definition: satEntry.definition };
    // Then Oxford 5000
    const ox5Arr = Object.values(wordLists.oxford5000 || {}) as any[];
    const ox5Entry = ox5Arr.find((w: any) => w.word && String(w.word).toLowerCase() === word);
    if (ox5Entry && ox5Entry.definition) return { source: 'oxford5000', definition: ox5Entry.definition };
    // Then Oxford 3000
    const ox3Arr = Object.values(wordLists.oxford3000 || {}) as any[];
    const ox3Entry = ox3Arr.find((w: any) => w.word && String(w.word).toLowerCase() === word);
    if (ox3Entry && ox3Entry.definition) return { source: 'oxford3000', definition: ox3Entry.definition };
    // Then API/memo
    if (wordMemo[word] && wordMemo[word].meaning) return { source: 'api', definition: wordMemo[word].meaning };
    return null;
  }

  function getRandomOxford3000Definitions(wordLists: any, excludeWord: string, n: number): string[] {
    const ox3Arr = Object.values(wordLists.oxford3000 || {}) as any[];
    const filtered = ox3Arr.filter((w: any) => w.word && String(w.word).toLowerCase() !== excludeWord && w.definition);
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n).map((w: any) => w.definition);
  }

  return (
    <div className="App">
      <h1>Meaningful Word Tiling</h1>
      <Scoreboard scores={scores} turn={turn} />
      <div className="main-area">
        <Board
          board={displayBoard}
          onCellClick={turn === 'player' ? handleCellClick : undefined}
          multipliers={BOARD_MULTIPLIERS}
        />
        <div className="side-area">
          <Rack
            tiles={playerRack}
            selectedTileId={selectedTileId}
            onTileSelect={turn === 'player' ? handleTileSelect : undefined}
          />
          <Controls onPlay={handlePlay} onPass={handlePass} onExchange={handleExchange} onReset={handleResetTurn} disabledReset={pendingPlacements.length === 0} />
          {checkingOnlineWord && <Spinner />}
          <button style={{ marginTop: 16 }} onClick={() => setShowComputerRack(v => !v)}>
            {showComputerRack ? 'Hide Computer Tiles' : 'Show Computer Tiles'}
          </button>
          {showComputerRack && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Computer Tiles:</div>
              <Rack tiles={computerRack} />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="difficulty-select">Difficulty: </label>
            <select id="difficulty-select" value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
              <option value="beginner">Beginner</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          {computerAction && <div style={{ marginTop: 16, fontWeight: 600, color: '#1976d2' }}>{computerAction}</div>}
        </div>
      </div>
      
      {definitionQuiz && (
        <div className="definition-quiz-popover">
          <DefinitionQuiz
            word={definitionQuiz.word}
            choices={definitionQuiz.choices}
            correct={definitionQuiz.correct}
            onSelect={handleQuizSelect}
            selectedIdx={quizSelectedIdx}
            showExample={quizShowExample}
            example={quizExample}
            onClose={!quizClosePending && quizSelectedIdx !== null && quizSelectedIdx !== definitionQuiz.correct ? handleQuizClose : undefined}
          />
        </div>
      )}
      <BlankTileModal
        open={blankModalOpen}
        onSelect={handleBlankSelect}
        onCancel={handleBlankCancel}
      />
    </div>
  );
};

export default App;
