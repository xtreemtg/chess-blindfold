
# Blindfold chess

This is an app to train you in playing blindfold. Think of it as stockfish without the board. You see all possible moves and click on a move to make it.

Took what cgoldammer [built](https://github.com/cgoldammer/chess-blindfold) and expanded on it.

## Features

- Hide/Show the board if you can't fully remember the position
- Hide/Show the move history
- Play by either clicking the moves, or, if you forget the board in your mind, by clicking on the board (i.e. dragging the pieces)
- Disable computer mode
- Change the Stockfish difficulty
- Provide different display options for possible moves. For instance, don't show whether a move is taking a piece, which makes the game harder
- Undo (take back) and redo moves
- Insert a custom FEN to play from a specific position
- Download a PGN from the game to learn from it

## Possible improvements

- Ask questions about position (e.g. what are the fields for the white pawns?)
- add a clock
- add multiplayer


## Compiling the code

To compile the app, you need to run the `setup.sh` script. The main task of the script is to download compiled code for Stockfish.js.


