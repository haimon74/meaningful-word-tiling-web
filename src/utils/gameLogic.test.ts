import { findAdvancedComputerMove, Tile } from './gameLogic';

describe('findAdvancedComputerMove', () => {
  function makeTile(letter: string, points = 1): Tile {
    return { letter, points, id: letter + Math.random() };
  }

  it('can play a word using only rack tiles', () => {
    const board = Array.from({ length: 5 }, () => Array(5).fill(null));
    const rack = [makeTile('C'), makeTile('A'), makeTile('T')];
    const dict = new Set(['cat']);
    // Place at center
    board[2][2] = null;
    const move = findAdvancedComputerMove(rack, board, dict);
    expect(move).toBeTruthy();
    const word = move!.map(m => m.tile.letter).join('').toLowerCase();
    expect(word).toBe('cat');
  });

  it('can play a word using existing board letter', () => {
    const board = Array.from({ length: 5 }, () => Array(5).fill(null));
    // Place E at (2,4)
    board[2][4] = makeTile('E');
    const rack = [makeTile('C'), makeTile('O'), makeTile('R')];
    const dict = new Set(['core']);
    // Should play C,O,R at (2,1),(2,2),(2,3) to make "CORE"
    const move = findAdvancedComputerMove(rack, board, dict);
    expect(move).toBeTruthy();
    const allTiles = [makeTile('C'), makeTile('O'), makeTile('R'), makeTile('E')];
    const word = [
      ...move!.map(m => m.tile.letter),
      board[2][4]!.letter
    ].join('').toLowerCase();
    expect(word).toBe('core');
  });

  it('does not play if no valid word can be formed', () => {
    const board = Array.from({ length: 5 }, () => Array(5).fill(null));
    const rack = [makeTile('X'), makeTile('Y'), makeTile('Z')];
    const dict = new Set(['cat']);
    const move = findAdvancedComputerMove(rack, board, dict);
    expect(move).toBeNull();
  });

  it('can play a word that forms a crossword', () => {
    const board = Array.from({ length: 5 }, () => Array(5).fill(null));
    // Place A at (2,2)
    board[2][2] = makeTile('A');
    // Place T at (2,3)
    board[2][3] = makeTile('T');
    const rack = [makeTile('C')];
    const dict = new Set(['cat', 'at']);
    // Should play C at (2,1) to make "CAT" and "AT"
    const move = findAdvancedComputerMove(rack, board, dict);
    expect(move).toBeTruthy();
    // Should use C at (2,1)
    expect(move!.some(m => m.row === 2 && m.col === 1 && m.tile.letter === 'C')).toBe(true);
  });

  it('can play D or T next to O to form DO or TO', () => {
    const board = Array.from({ length: 5 }, () => Array(5).fill(null));
    // Place O at (2,2)
    board[2][2] = makeTile('O');
    const rack = [makeTile('D'), makeTile('T')];
    const dict = new Set(['do', 'to']);
    // Should play D at (2,1) or T at (2,1) to make "DO" or "TO"
    const move = findAdvancedComputerMove(rack, board, dict);
    expect(move).toBeTruthy();
    const playedWord = move!.map(m => m.tile.letter).join('').toLowerCase() + board[2][2]!.letter.toLowerCase();
    expect(['do', 'to']).toContain(playedWord);
  });

  it('can play D or T next to O in NOT to form DO or TO', () => {
    const board = Array.from({ length: 5 }, () => Array(5).fill(null));
    // Place N,O,T at (2,1),(2,2),(2,3)
    board[2][1] = makeTile('N');
    board[2][2] = makeTile('O');
    board[2][3] = makeTile('T');
    const rack = [makeTile('T'), makeTile('A'), makeTile('T'), makeTile('R'), makeTile('D'), makeTile('M'), makeTile('P')];
    const dict = new Set(['do', 'to', 'not']);
    // Should play D or T at (1,2) or (3,2) to make "DO" or "TO"
    const move = findAdvancedComputerMove(rack, board, dict);
    expect(move).toBeTruthy();
    // Find the word played
    let playedWord = '';
    if (move!.some(m => m.row === 1 && m.col === 2)) {
      playedWord = move!.find(m => m.row === 1 && m.col === 2)!.tile.letter.toLowerCase() + board[2][2]!.letter.toLowerCase();
    } else if (move!.some(m => m.row === 3 && m.col === 2)) {
      playedWord = move!.find(m => m.row === 3 && m.col === 2)!.tile.letter.toLowerCase() + board[2][2]!.letter.toLowerCase();
    }
    expect(['do', 'to']).toContain(playedWord);
  });

  it('can use a blank tile to form a word (e.g., DO with blank as D)', () => {
    const board = Array.from({ length: 5 }, () => Array(5).fill(null));
    // Place O at (2,2)
    board[2][2] = makeTile('O');
    const blank: Tile = { letter: '', points: 0, id: 'blank1', isBlank: true };
    const rack = [blank];
    const dict = new Set(['do']);
    const move = findAdvancedComputerMove(rack, board, dict);
    expect(move).toBeTruthy();
    // The move should use the blank as 'D' to form 'DO' with the O on the board
    const played = move!.find(m => m.tile.isBlank && m.tile.assignedLetter === 'D');
    expect(played).toBeTruthy();
    // The word formed should be 'DO'
    const allTiles = [...move!.map(m => getTileLetter(m.tile)), board[2][2]!.letter];
    expect(allTiles.join('').toLowerCase()).toContain('do');
  });
});

// Helper for test to get the letter for a tile
function getTileLetter(tile: Tile): string {
  return tile.isBlank && tile.assignedLetter ? tile.assignedLetter : tile.letter;
} 