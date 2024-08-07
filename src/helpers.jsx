/* A hack for a weird problem: The import is handled differently
when running in webpack-dev-server and through jest. 
Just importing twice, and using the one version that works */
import { Chess, validateFen } from "chess.js";
// import Chess2 from "chess.js";

// Using either `Chess` or `Chess2` - see the reason for this hack above
export const newClient = (fen = startingFen) => new Chess(fen);
  // Chess ? new Chess(fen) : new Chess2(fen);

export const startingFen =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const gameStatus = {
  starting: [0, "Starting", "secondary"],
  active: [1, "Playing", "secondary"],
  whiteWon: [2, "1 - 0", "danger"],
  blackWon: [3, "0 - 1", "danger"],
  draw: [4, "½ - ½", "warning"],
};

export const getHalfmoveClock = (fen) => {
  // Split the FEN string into its components
  const parts = fen.split(" ");

  // Check if the FEN string is valid
  if (parts.length !== 6) {
    throw new Error("Invalid FEN string");
  }

  // The halfmove clock is the fifth element (index 4)
  return parseInt(parts[4], 10);
};

const getRandomSquare = () => {
  const files = 'abcdefgh';
  const ranks = '12345678';
  const randomFile = files[Math.floor(Math.random() * files.length)];
  const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
  return randomFile + randomRank;
}

const areAdjacentSquares = (square1, square2) => {
  // Convert squares from algebraic notation to rank and file
  const file1 = square1.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank1 = parseInt(square1.charAt(1)) - 1;
  const file2 = square2.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank2 = parseInt(square2.charAt(1)) - 1;

  // Calculate the differences between the ranks and files
  const rankDifference = Math.abs(rank1 - rank2);
  const fileDifference = Math.abs(file1 - file2);

  // Return true if the kings are adjacent
  return rankDifference <= 1 && fileDifference <= 1;
}

const isLegalPosition = (fen, kingSquares = {}) => {
  if(!validateFen(fen).ok) return false
  const chess = new Chess(fen)
  const board = chess.board()
  // if didnt pass in which squares the kings are on, need to get that info manually
  let whiteKingSquare;
  let blackKingSquare;
  if(kingSquares.whiteKingSquare !== undefined && kingSquares.blackKingSquare !== undefined){
    whiteKingSquare = kingSquares.whiteKingSquare
    blackKingSquare = kingSquares.blackKingSquare
  } else {
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          if (piece.type === 'k') {
            if (piece.color === 'w') {
              whiteKingSquare = piece.square;
            } else {
              blackKingSquare = piece.square;
            }
          }
        }
      }
    }
  }
  if (areAdjacentSquares(whiteKingSquare, blackKingSquare)) {
    return false;
  }
  // check if the enemy king is in check when it's current player's turn. that would be illegal
  chess._turn = chess.turn() === 'w' ? 'b' : 'w'
  if (chess.inCheck()) {
      return false;
  }
  return true

}

const twoRandomSquaresOfSpecificColors = (sameColor = true) => {
  const chess = new Chess()
  let sq1, sq2;
  do {
    sq1 = getRandomSquare();
    sq2 = getRandomSquare();
    // if sameColor is true, generate 2 random squares until they are the same color. and vice versa
  } while(sameColor ? chess.squareColor(sq1) !== chess.squareColor(sq2) : chess.squareColor(sq1) === chess.squareColor(sq2));
  return [sq1, sq2]
}


export const generateRandomKRKPosition = () => {
  const chess = new Chess();
  let positionIsValid = false;
  while (!positionIsValid) {
    chess.clear();
    let [wk, bk]= [getRandomSquare(), getRandomSquare()]
    chess.put({ type: 'k', color: 'w' }, wk);
    chess.put({ type: 'k', color: 'b' }, bk);
    chess.put({ type: 'r', color: 'w' }, getRandomSquare());
    // Check if the generated position is valid (no king is in check)
    positionIsValid = isLegalPosition(chess.fen(), {whiteKingSquare: wk, blackKingSquare: bk})
  }
  // Return the FEN string of the generated position
  return chess.fen();
}

export const generateRandomKBBKPosition = () => {
  const chess = new Chess();
  let positionIsValid = false;
  while (!positionIsValid) {
    chess.clear();
    let [wk, bk]= [getRandomSquare(), getRandomSquare()]
    let [bishop1Square, bishop2Square] = twoRandomSquaresOfSpecificColors(false)
    chess.put({ type: 'k', color: 'w' }, wk);
    chess.put({ type: 'k', color: 'b' }, bk);
    chess.put({ type: 'b', color: 'w' }, bishop1Square);
    chess.put({ type: 'b', color: 'w' }, bishop2Square);
    // Check if the generated position is valid (no king is in check)
    positionIsValid = isLegalPosition(chess.fen(), {whiteKingSquare: wk, blackKingSquare: bk})
  }
  // Return the FEN string of the generated position
  return chess.fen();
}

export const generateRandomKNBKPosition = () =>{
  const chess = new Chess();
  let positionIsValid = false;
  while (!positionIsValid) {
    chess.clear();
    let [wk, bk]= [getRandomSquare(), getRandomSquare()]
    chess.put({ type: 'k', color: 'w' }, wk);
    chess.put({ type: 'k', color: 'b' }, bk);
    chess.put({ type: 'n', color: 'w' }, getRandomSquare());
    chess.put({ type: 'b', color: 'w' }, getRandomSquare());
    // Check if the generated position is valid (no king is in check)
    positionIsValid = isLegalPosition(chess.fen(), {whiteKingSquare: wk, blackKingSquare: bk})
  }
  // Return the FEN string of the generated position
  return chess.fen();
}

export class GameClient {
  constructor(loader= {}) {
    if(loader.pgn !== undefined){
      this.client = new Chess()
      this.client.loadPgn(loader.pgn)
    } else {
      const fen = loader.fen === undefined ? startingFen : loader.fen;
      this.client = new Chess(fen)
    }
    this.legalMoves = this.client.moves({ verbose: true });
  }
  temp = () => true;
  isMoveValid = (move) => {
    // To test whether a move is valid, we need to create a new client
    // to ensure we are not changing the existing client's state
    const client = newClient(this.client.fen());
    const result = client.move(move);
    return result != null;
  };
  move = (mv) => {
    try {
      return this.client.move(mv);
    } catch (e) {
      console.assert(e.message.includes("Invalid move"))
      return null
    }
  }

  getStatus = () => {
    this.legalMoves = this.client.moves({ verbose: true });
    // const halfMoveClock = getHalfmoveClock(this.client.fen());
    const client = this.client;

    if (client.history().length === 0) return gameStatus.starting;
    if (client.isCheckmate())
      return client.turn() === "b" ? gameStatus.whiteWon : gameStatus.blackWon;
    if (client.isDraw()) return gameStatus.draw;
    return gameStatus.active;
  };
}

export const defaultGetRows = (movetext, newlineChar) => {
  // eslint-disable-line no-unused-vars
  newlineChar;
  let ms = movetext;
  if (!ms) {
    return [];
  }
  /* delete comments */
  ms = ms.replace(/(\{[^}]+\})+?/g, "");

  /* delete recursive annotation variations */
  /* eslint-disable no-useless-escape */
  const ravRegex = /(\([^\(\)]+\))+?/g;
  while (ravRegex.test(ms)) {
    ms = ms.replace(ravRegex, "");
  }

  /* delete numeric annotation glyphs */
  ms = ms.replace(/\$\d+/g, "");

  /* Delete result */
  ms = ms.replace(/(?:1-0|0-1|1\/2-1\/2|\*)$/, "");

  /* Delete any double spaces */
  ms = ms.replace(/\s\s/g, " ").trim();

  /* Split into rows */
  const rows = [];
  const rowRegex = /\d+\.\s?\S+(?:\s+\S+)?/g;
  /* eslint-disable no-constant-condition */
  while (true) {
    const result = rowRegex.exec(ms);
    if (!result) {
      break;
    }
    const row = result[0].split(/\s|\.\s?/g);
    row[0] = parseInt(row[0]);
    rows.push(row);
  }
  return rows;
};

/*
Sort order for moves:
1. Pawn moves (alphabetically ordered)
2. Castling
3. Piece moves (alphabetically ordered)
 */
export const moveSortCompareFunction = (a, b) => {
  const aIsLower = a[0] === a[0].toLowerCase();
  const bIsLower = b[0] === b[0].toLowerCase();

  const compareWithCastles = (a, b) => {
    const aIsCastle = a[0] === "O";
    const bIsCastle = b[0] === "O";
    return aIsCastle != bIsCastle ? bIsCastle - aIsCastle : a > b ? 1 : -1;
  };
  return aIsLower != bIsLower ? bIsLower - aIsLower : compareWithCastles(a, b);
};
