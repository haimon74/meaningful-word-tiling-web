// Scrabble tile distribution
export const TILE_DISTRIBUTION: Record<string, { quantity: number; points: number }> = {
  A: { quantity: 9, points: 1 },
  B: { quantity: 2, points: 3 },
  C: { quantity: 2, points: 3 },
  D: { quantity: 4, points: 2 },
  E: { quantity: 12, points: 1 },
  F: { quantity: 2, points: 4 },
  G: { quantity: 3, points: 2 },
  H: { quantity: 2, points: 4 },
  I: { quantity: 9, points: 1 },
  J: { quantity: 1, points: 8 },
  K: { quantity: 1, points: 5 },
  L: { quantity: 4, points: 1 },
  M: { quantity: 2, points: 3 },
  N: { quantity: 6, points: 1 },
  O: { quantity: 8, points: 1 },
  P: { quantity: 2, points: 3 },
  Q: { quantity: 1, points: 10 },
  R: { quantity: 6, points: 1 },
  S: { quantity: 4, points: 1 },
  T: { quantity: 6, points: 1 },
  U: { quantity: 4, points: 1 },
  V: { quantity: 2, points: 4 },
  W: { quantity: 2, points: 4 },
  X: { quantity: 1, points: 8 },
  Y: { quantity: 2, points: 4 },
  Z: { quantity: 1, points: 10 },
  Blank: { quantity: 2, points: 0 },
};

export type Tile = {
  letter: string;
  points: number;
  id: string; // unique id for React key and tracking
  isBlank?: boolean;
  assignedLetter?: string;
};

export type TileBag = Tile[];

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createTileBag(): TileBag {
  let bag: Tile[] = [];
  let uid = 0;
  for (const [letter, { quantity, points }] of Object.entries(TILE_DISTRIBUTION)) {
    for (let i = 0; i < quantity; i++) {
      if (letter === 'Blank') {
        bag.push({ letter: '', points: 0, id: `${letter}-${i}-${uid++}`, isBlank: true });
      } else {
        bag.push({ letter, points, id: `${letter}-${i}-${uid++}` });
      }
    }
  }
  return shuffle(bag);
}

export function drawTiles(bag: TileBag, n: number): { drawn: Tile[]; bag: TileBag } {
  const drawn = bag.slice(0, n);
  const rest = bag.slice(n);
  return { drawn, bag: rest };
}

export function refillRack(rack: Tile[], bag: TileBag): { rack: Tile[]; bag: TileBag } {
  const needed = 7 - rack.length;
  if (needed <= 0) return { rack, bag };
  const { drawn, bag: newBag } = drawTiles(bag, needed);
  return { rack: [...rack, ...drawn], bag: newBag };
}

// Check if all placements are in a straight line
export function arePlacementsInLine(placements: { row: number; col: number }[]): { isLine: boolean; isRow: boolean; isCol: boolean } {
  if (placements.length === 0) return { isLine: false, isRow: false, isCol: false };
  const allRows = placements.every(p => p.row === placements[0].row);
  const allCols = placements.every(p => p.col === placements[0].col);
  return { isLine: allRows || allCols, isRow: allRows, isCol: allCols };
}

// Get the main word formed by the placements
export function getMainWord(placements: { row: number; col: number; tile: Tile }[], board: (Tile | null)[][]): { row: number; col: number; tile: Tile }[] {
  if (placements.length === 0) return [];
  const { isRow, isCol } = arePlacementsInLine(placements);
  if (!isRow && !isCol) return [];
  const fixed = isRow ? 'row' : 'col';
  const varDim = isRow ? 'col' : 'row';
  const fixedVal = placements[0][fixed];
  // Find min/max in the variable dimension
  const indices = placements.map(p => p[varDim]);
  const minIdx = Math.min(...indices);
  const maxIdx = Math.max(...indices);
  const mainWord: { row: number; col: number; tile: Tile }[] = [];
  for (let i = minIdx; i <= maxIdx; i++) {
    const r = isRow ? fixedVal : i;
    const c = isRow ? i : fixedVal;
    // Check if tile is from placement or board
    const placed = placements.find(p => p.row === r && p.col === c);
    if (placed) {
      mainWord.push({ row: r, col: c, tile: placed.tile });
    } else if (board[r][c]) {
      mainWord.push({ row: r, col: c, tile: board[r][c]! });
    } else {
      // Gap in the word
      return [];
    }
  }
  return mainWord;
}

// Check if move is connected to existing tiles (or covers center for first move)
export function isMoveConnected(placements: { row: number; col: number }[], board: (Tile | null)[][]): boolean {
  const BOARD_SIZE = board.length;
  const center = Math.floor(BOARD_SIZE / 2);
  // If board is empty, must cover center
  const boardHasTiles = board.some(row => row.some(cell => cell));
  if (!boardHasTiles) {
    return placements.some(p => p.row === center && p.col === center);
  }
  // Otherwise, must be adjacent to existing tile
  const dirs = [
    [0, 1], [1, 0], [0, -1], [-1, 0]
  ];
  for (const { row, col } of placements) {
    for (const [dr, dc] of dirs) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr][nc]) return true;
      }
    }
  }
  return false;
}

// Get all words formed (main and crosswords)
export function getAllWordsFormed(placements: { row: number; col: number; tile: Tile }[], board: (Tile | null)[][]): { row: number; col: number; tile: Tile }[][] {
  if (placements.length === 0) return [];
  const words: { row: number; col: number; tile: Tile }[][] = [];
  const placedSet = new Set(placements.map(p => `${p.row},${p.col}`));
  // Determine direction
  const { isRow, isCol } = arePlacementsInLine(placements);
  if (!isRow && !isCol) return [];
  // Main word direction
  const mainDir = isRow ? [0, 1] : [1, 0];
  const perpDir = isRow ? [1, 0] : [0, 1];
  // Find the start of the main word
  const start = placements[0];
  let r = start.row, c = start.col;
  // Go backward in main direction
  while (true) {
    const nr = r - mainDir[0], nc = c - mainDir[1];
    if (nr < 0 || nc < 0 || nr >= board.length || nc >= board.length) break;
    if (board[nr][nc]) {
      r = nr; c = nc;
    } else {
      break;
    }
  }
  // Collect the main word
  const mainWord: { row: number; col: number; tile: Tile }[] = [];
  let cr = r, cc = c;
  while (cr >= 0 && cc >= 0 && cr < board.length && cc < board.length) {
    // Use placed tile if present, else board tile
    const placed = placements.find(p => p.row === cr && p.col === cc);
    if (placed) {
      mainWord.push({ row: cr, col: cc, tile: placed.tile });
    } else if (board[cr][cc]) {
      mainWord.push({ row: cr, col: cc, tile: board[cr][cc]! });
    } else {
      break;
    }
    cr += mainDir[0];
    cc += mainDir[1];
  }
  if (mainWord.length > 1) words.push(mainWord);
  // Crosswords for each placed tile
  for (const p of placements) {
    // Go backward in perpendicular direction
    let r1 = p.row, c1 = p.col;
    while (true) {
      const nr = r1 - perpDir[0], nc = c1 - perpDir[1];
      if (nr < 0 || nc < 0 || nr >= board.length || nc >= board.length) break;
      if (board[nr][nc]) {
        r1 = nr; c1 = nc;
      } else {
        break;
      }
    }
    // Collect the crossword
    const crossWord: { row: number; col: number; tile: Tile }[] = [];
    let cr2 = r1, cc2 = c1;
    while (cr2 >= 0 && cc2 >= 0 && cr2 < board.length && cc2 < board.length) {
      const placed = placements.find(pp => pp.row === cr2 && pp.col === cc2);
      if (placed) {
        crossWord.push({ row: cr2, col: cc2, tile: placed.tile });
      } else if (board[cr2][cc2]) {
        crossWord.push({ row: cr2, col: cc2, tile: board[cr2][cc2]! });
      } else {
        break;
      }
      cr2 += perpDir[0];
      cc2 += perpDir[1];
    }
    // Only add if it's a real word (length > 1) and not the same as mainWord
    if (crossWord.length > 1) {
      // Check if this is the same as mainWord
      const isSame = crossWord.length === mainWord.length && crossWord.every((cw, i) =>
        mainWord[i] && mainWord[i].row === cw.row && mainWord[i].col === cw.col
      );
      if (!isSame) {
        // Avoid duplicates
        const key = crossWord.map(x => `${x.row},${x.col}`).join('|');
        if (!words.some(w => w.map(x => `${x.row},${x.col}`).join('|') === key)) {
          words.push(crossWord);
        }
      }
    }
  }
  return words;
}

// Helper to get the letter for a tile (assignedLetter for blank, else letter)
function getTileLetter(tile: Tile): string {
  return tile.isBlank && tile.assignedLetter ? tile.assignedLetter : tile.letter;
}

// Update calculateScore to use getTileLetter
export function calculateScore(words: { row: number; col: number; tile: Tile }[][]): number {
  let total = 0;
  for (const word of words) {
    for (const { tile } of word) {
      total += tile.points; // blank is 0
    }
  }
  return total;
}

// Standard Scrabble board multipliers (15x15)
// 'TW' = triple word, 'DW' = double word, 'TL' = triple letter, 'DL' = double letter, null = normal
export const BOARD_MULTIPLIERS: (null | 'TW' | 'DW' | 'TL' | 'DL')[][] = [
  ['TW',null,null,'DL',null,null,null,'TW',null,null,null,'DL',null,null,'TW'],
  [null,'DW',null,null,null,'TL',null,null,null,'TL',null,null,null,'DW',null],
  [null,null,'DW',null,null,null,'DL',null,'DL',null,null,null,'DW',null,null],
  ['DL',null,null,'DW',null,null,null,'DL',null,null,null,'DW',null,null,'DL'],
  [null,null,null,null,'DW',null,null,null,null,null,'DW',null,null,null,null],
  [null,'TL',null,null,null,'TL',null,null,null,'TL',null,null,null,'TL',null],
  [null,null,'DL',null,null,null,'DL',null,'DL',null,null,null,'DL',null,null],
  ['TW',null,null,'DL',null,null,null,'DW',null,null,null,'DL',null,null,'TW'],
  [null,null,'DL',null,null,null,'DL',null,'DL',null,null,null,'DL',null,null],
  [null,'TL',null,null,null,'TL',null,null,null,'TL',null,null,null,'TL',null],
  [null,null,null,null,'DW',null,null,null,null,null,'DW',null,null,null,null],
  ['DL',null,null,'DW',null,null,null,'DL',null,null,null,'DW',null,null,'DL'],
  [null,null,'DW',null,null,null,'DL',null,'DL',null,null,null,'DW',null,null],
  [null,'DW',null,null,null,'TL',null,null,null,'TL',null,null,null,'DW',null],
  ['TW',null,null,'DL',null,null,null,'TW',null,null,null,'DL',null,null,'TW'],
];

// Find all anchor points (empty cells adjacent to existing tiles, or center if first move)
function getAnchorPoints(board: (Tile | null)[][]): { row: number; col: number }[] {
  const BOARD_SIZE = board.length;
  const anchors: { row: number; col: number }[] = [];
  const dirs = [
    [0, 1], [1, 0], [0, -1], [-1, 0]
  ];
  const boardHasTiles = board.some(row => row.some(cell => cell));
  if (!boardHasTiles) {
    const center = Math.floor(BOARD_SIZE / 2);
    return [{ row: center, col: center }];
  }
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]) continue;
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          if (board[nr][nc]) {
            anchors.push({ row: r, col: c });
            break;
          }
        }
      }
    }
  }
  return anchors;
}

// Helper: generate all permutations of length n from an array (returns array, not generator)
function permutationsArr(arr: Tile[], n: number): Tile[][] {
  if (n === 0) return [[]];
  const result: Tile[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const perm of permutationsArr(rest, n - 1)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// Try all possible placements of 1-7 tiles from rack at each anchor, in both directions
export function findSimpleComputerMove(rack: Tile[], board: (Tile | null)[][], wordSet: Set<string>): { tile: Tile; row: number; col: number }[] | null {
  const anchors = getAnchorPoints(board);
  const BOARD_SIZE = board.length;
  for (const anchor of anchors) {
    for (const dir of [ [0, 1], [1, 0] ] as const) { // horizontal, vertical
      for (let len = 1; len <= rack.length; len++) {
        for (const perm of permutationsArr(rack, len)) {
          // Try to place perm at anchor, going forward
          let placements: { tile: Tile; row: number; col: number }[] = [];
          let fits = true;
          for (let i = 0; i < perm.length; i++) {
            const row = anchor.row + dir[0] * i;
            const col = anchor.col + dir[1] * i;
            if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) { fits = false; break; }
            if (board[row][col]) { fits = false; break; }
            placements.push({ tile: perm[i], row, col });
          }
          if (!fits) continue;
          // Validate move: must be in a line, connected, and all words valid
          const { isLine } = arePlacementsInLine(placements);
          if (!isLine) continue;
          if (!isMoveConnected(placements, board)) continue;
          const words = getAllWordsFormed(placements, board);
          let allValid = true;
          for (const wordArr of words) {
            const wordStr = wordArr.map(w => getTileLetter(w.tile)).join('').toLowerCase();
            if (!wordSet.has(wordStr)) {
              allValid = false;
              break;
            }
          }
          if (allValid && words.length > 0) {
            return placements;
          }
        }
      }
    }
  }
  return null;
}

// Helper: generate all permutations of length n from an array (returns array, not generator)
function permutationsArrWithBlanks(arr: Tile[], n: number): Tile[][] {
  if (n === 0) return [[]];
  const result: Tile[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const perm of permutationsArrWithBlanks(rest, n - 1)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// Advanced AI: Try to fit rack tiles into empty cells, using board letters where present
export function findAdvancedComputerMove(rack: Tile[], board: (Tile | null)[][], wordSet: Set<string>): { tile: Tile; row: number; col: number }[] | null {
  const BOARD_SIZE = board.length;
  const anchors = getAnchorPoints(board);
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const anchor of anchors) {
    for (const dir of [ [0, 1], [1, 0] ] as const) { // horizontal, vertical
      for (let len = 1; len <= Math.min(BOARD_SIZE, rack.length + 1); len++) {
        for (let offset = 0; offset < len; offset++) {
          const startRow = anchor.row - dir[0] * offset;
          const startCol = anchor.col - dir[1] * offset;
          const endRow = startRow + dir[0] * (len - 1);
          const endCol = startCol + dir[1] * (len - 1);
          if (startRow < 0 || startCol < 0 || endRow < 0 || endCol < 0 || startRow >= BOARD_SIZE || startCol >= BOARD_SIZE || endRow >= BOARD_SIZE || endCol >= BOARD_SIZE) continue;
          const line: (Tile | null)[] = [];
          const emptyIndices: number[] = [];
          for (let i = 0; i < len; i++) {
            const r = startRow + dir[0] * i;
            const c = startCol + dir[1] * i;
            const cell = board[r][c];
            line.push(cell);
            if (!cell) emptyIndices.push(i);
          }
          const anchorIdx = dir[0] ? anchor.row - startRow : anchor.col - startCol;
          if (anchorIdx < 0 || anchorIdx >= len) continue;
          if (emptyIndices.length > rack.length) continue;
          const emptyCount = emptyIndices.length;
          const rackPerms = permutationsArrWithBlanks(rack, emptyCount);
          for (const perm of rackPerms) {
            // For each blank in perm, try all possible letters (A-Z)
            const blankIndices = perm.map((t, i) => t.isBlank ? i : -1).filter(i => i !== -1);
            const blankCombos = blankIndices.length === 0 ? [[]] : cartesianProduct(Array(blankIndices.length).fill(ALPHABET.split('')));
            for (const blankLetters of blankCombos) {
              // Create a deep copy of perm with assignedLetter for blanks
              const permCopy = perm.map((t, i) => {
                if (t.isBlank) {
                  const val = blankLetters[blankIndices.indexOf(i)];
                  return { ...t, assignedLetter: typeof val === 'string' ? val : undefined };
                }
                return { ...t };
              });
              const wordTiles: { tile: Tile; row: number; col: number }[] = [];
              let permIdx = 0;
              for (let i = 0; i < len; i++) {
                const r = startRow + dir[0] * i;
                const c = startCol + dir[1] * i;
                if (board[r][c]) continue;
                wordTiles.push({ tile: permCopy[permIdx++], row: r, col: c });
              }
              let wordStr = '';
              permIdx = 0;
              for (let i = 0; i < len; i++) {
                if (line[i]) wordStr += getTileLetter(line[i]!);
                else wordStr += getTileLetter(permCopy[permIdx++]);
              }
              wordStr = wordStr.toLowerCase();
              if (!isMoveConnected(wordTiles, board)) continue;
              const words = getAllWordsFormed(wordTiles, board);
              if (words.length === 0) continue;
              let atLeastOneValid = false;
              let allValid = true;
              for (const wArr of words) {
                const wStr = wArr.map(w => getTileLetter(w.tile)).join('').toLowerCase();
                if (wordSet.has(wStr)) {
                  atLeastOneValid = true;
                } else {
                  allValid = false;
                  break;
                }
              }
              if (atLeastOneValid && allValid) {
                // Return the move with the correct assignedLetter for blanks
                return wordTiles;
              }
            }
          }
        }
      }
    }
  }
  return null;
}

// Helper: cartesian product for blank letter combos
function cartesianProduct<T>(arr: T[][]): T[][] {
  return arr.reduce<T[][]>((a, b) => a.flatMap(d => b.map(e => [...d, e])), [[]]);
} 