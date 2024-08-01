import React, { useState, useEffect } from "react";
import * as _ from 'lodash';
import PropTypes from "prop-types";
import styles from "./App.css";
import {
  Alert,
  Badge,
  ToggleButton,
  ButtonGroup,
  Button,
  FormControl,
  Container,
  Row,
  Col,
} from "react-bootstrap";
import Select from "react-select";

import { AppNavbar } from "./AppNavbar.jsx";
import { List } from "immutable";
import { Board, MoveTable } from "./ChessApp.jsx";
import { Chessboard } from "react-chessboard";

import {
  GameClient,
  gameStatus,
  moveSortCompareFunction
} from "./helpers.jsx";
import { validateFen } from "chess.js"
import { getBest, makeRandomMove } from "./engine.js";

/* The window to enter moves. There are currently two options:
(1) Click on buttons, one for each move
(2) Enter the move in a text field and hit enter - disabled by default

Through trial and error I noticed that the first option simply works better, especially
when using a phone.
*/
export class MoveEntry extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: "", warning: null };
  }
  focus = () => {
    let node = this.inputNode;
    if (node && node.focus instanceof Function) {
      node.focus();
    }
  };
  componentDidMount() {
    this.focus();
  }

  setValue = (value) => this.setState({ value: value });
  onChange = (e) => this.setValue(e.target.value);
  handleKeyPress = (target) => {
    if (target.charCode == 13) {
      this.submit();
    }
  };
  submit = () => this.makeMove(this.state.value);
  makeMove = (move) => {
    const moveValid = this.props.gameClient.isMoveValid(move);
    if (moveValid) {
      this.props.makeMove(move);
      this.setState({ value: "", warning: null });
    } else {
      this.showWarning("Move is not valid");
    }
  };
  // eslint-disable-next-line no-unused-vars
  componentDidUpdate = (prevProps, prevState, snapshot) => {
    this.focus();
  };
  showWarning = (warning) => this.setState({ warning: warning });
  /* Display the move according to the app settings.
  For instance, if the `showIfCheck` setting is `false`, then remove the "+" from any move
  */
  displayMove = (move) => {
    var formattedMove = move;
    if (!this.props.parentState.showIfMate) {
      formattedMove = formattedMove.replace("#", "+");
    }
    if (!this.props.parentState.showIfTakes) {
      formattedMove = formattedMove.replace("x", "");
    }
    if (!this.props.parentState.showIfCheck) {
      formattedMove = formattedMove.replace("+", "");
    }
    return formattedMove;
  };
  render = () => {
    const moves = this.props.gameClient.client.isThreefoldRepetition()
      ? []
      : this.props.gameClient.client.moves().sort(moveSortCompareFunction);
    const buttonForMove = (move) => (
      <Col key={move} xs={3} md={2}>
        <div
          className={styles.moveButton}
          onClick={() => this.props.makeMove(move)}
        >
          {this.displayMove(move)}
        </div>
      </Col>
    );
    const input = !this.props.enterMoveByKeyboard ? (
      <Row style={{ marginLeft: 10, marginRight: 10 }}>
        {moves.map(buttonForMove)}
      </Row>
    ) : (
      <div>
        <Row>
          <Col sm={{ span: 4, offset: 4 }}>
            <FormControl
              ref={(ref) => (this.inputNode = ref)}
              type="text"
              onChange={this.onChange}
              onKeyPress={this.handleKeyPress}
              value={this.state.value}
            />
          </Col>
          <Col sm={2}>
            <Button id="submitButton" onClick={this.submit}>
              Submit
            </Button>
          </Col>
        </Row>
        <Row>
          <Col sm={{ span: 3, offset: 6 }}>
            <div style={{ color: "red" }}> {this.state.warning} </div>
          </Col>
        </Row>
      </div>
    );
    return <div>{input}</div>;
  };
}

MoveEntry.propTypes = {
  enterMoveByKeyboard: PropTypes.bool,
  makeMove: PropTypes.func,
  gameClient: PropTypes.any,
  parentState: PropTypes.object,
};

const resetState = (fen = null) => {
  let gameClient =
    typeof fen === "string" ? new GameClient(fen) : new GameClient();
  return {
    moves: List([]),
    gameClient: gameClient,
    colorToMoveWhite: gameClient.client.turn() === "w",
    showType: "make",
    takebackCache: [],
    customFen: fen === null ? null : fen,
    clickSquaresData: {},
    promotionData: {},
    boardHistoryData: {}
  };
};

/* Obtaining the starting state for a new game.
The starting state is not the same as the reset state, because we want
some properties, e.g. the Stockfish level, to persist throughout games.
The reset state does not contain these properties, so we need to add them 
here.
*/
var startingState = () => {
  var state = resetState();
  state["ownColorWhite"] = true;
  state["skillLevel"] = 1;
  state["depthLevel"] = 3;
  state["showIfMate"] = false;
  state["showIfTakes"] = true;
  state["showIfCheck"] = true;
  state["enterMoveByKeyboard"] = false;
  state["boardAppear"] = false;
  state["moveEntryAppear"] = true;
  state["moveTableAppear"] = true;
  state["autoMove"] = true;
  state["boardWidth"] = 450;
  return state;
};

/* Get the stockfish levels in terms of Elo rating.
Stockfish levels range from 0 (1100 Elo) to 20 (3100 Elo)
These are really very rough heuristics, but should be close enough for 
our purposes.
*/
const getStockfishLevels = () => {
  const values = [];
  const numLevels = 20;
  const minElo = 1100;
  const maxElo = 3100;
  for (let i = 1; i <= numLevels; i++) {
    const elo =
      Math.floor((minElo + (maxElo - minElo) * (i / numLevels)) / 100) * 100;
    values.push({ value: i, label: elo });
  }
  values.unshift({ value: 0, label: "Random Moves" });
  return values;
};

const getDateAndTimeForPGN = () => {
  const now = new Date();
  let year = now.getFullYear();
  let month = String(now.getMonth() + 1).padStart(2, "0");
  let day = String(now.getDate()).padStart(2, "0");
  let hours = String(now.getHours()).padStart(2, "0");
  let minutes = String(now.getMinutes()).padStart(2, "0");
  let seconds = String(now.getSeconds()).padStart(2, "0");
  const dateTag = `${year}.${month}.${day}`;
  const timeTag = `${hours}:${minutes}:${seconds}`;
  year = now.getUTCFullYear();
  month = String(now.getUTCMonth() + 1).padStart(2, "0");
  day = String(now.getUTCDate()).padStart(2, "0");
  hours = String(now.getUTCHours()).padStart(2, "0");
  minutes = String(now.getUTCMinutes()).padStart(2, "0");
  seconds = String(now.getUTCSeconds()).padStart(2, "0");
  const utcDateTag = `${year}.${month}.${day}`;
  const utcTimeTag = `${hours}:${minutes}:${seconds}`;
  return [dateTag, timeTag, utcDateTag, utcTimeTag];
};

const alertGameOver = (client) => {
    if (client.isGameOver()) {
      // const halfMoveClock = getHalfmoveClock(client.fen());
      if (client.isCheckmate()) {
        alert(client.turn() === "b" ? "White Won!" : "Black Won!");
      } else if (client.isStalemate()) {
        alert(client.turn() === "b" ? "Black is in stalemate!" : "White is in stalemate!");
      } else if (client.isInsufficientMaterial()) {
        alert("Draw by insufficient material!");
      } else if (client.isThreefoldRepetition()) {
        alert("Draw by threefold repetition!");
      } else if (client._halfMoves >= 100) {
        alert("Draw by 50 move rule!");
      }
    }
  };

const getUTCDateAndTimeForPGN = () => {
  const now = new Date();

  return [dateTag, timeTag];
};

/* Displays the window to change settings */
export class SettingsWindow extends React.Component {
  constructor(props) {
    super(props);
  }
  render = () => {
    const values = getStockfishLevels();
    // depth from 1 to 16 (too slow after 16)
    const depths = Array.from({ length: 17 - 1 }, (v, k) => ({
      value: k + 1,
      label: k + 1,
    }));

    const valsButtons = [
      { str: "Yes", value: true },
      { str: "False", value: false },
    ];

    const valsColor = [
      { str: "White", value: true },
      { str: "Black", value: false },
    ];

    /* Obtain the toggle button to turn a property on or off */
    const buttonForProperty = (name, display, values) => {
      return (
        <Row>
          <Col xs={6}>
            <div>{display}</div>
          </Col>
          <Col xs={6}>
            <ButtonGroup
              type="radio"
              name="options"
              value={this.props.parentState[name]}
            >
              {values.map((val, idx) => (
                <ToggleButton
                  key={idx}
                  value={val.value}
                  variant={
                    this.props.parentState[name] == val.value
                      ? "primary"
                      : "outline-primary"
                  }
                  onClick={() => this.props.setProperty(name, val.value)}
                >
                  {val.str}
                </ToggleButton>
              ))}
            </ButtonGroup>
          </Col>
        </Row>
      );
    };

    const hr = (
      <hr
        style={{
          height: "2px",
          border: "0 none",
          color: "lightGray",
          backgroundColor: "lightGray",
        }}
      />
    );
    const displaySettings = this.props.parentState
      .enterMoveByKeyboard ? null : (
      <div>
        {hr}
        {buttonForProperty("showIfMate", "Show if move is mate", valsButtons)}
        {hr}
        {buttonForProperty("showIfCheck", "Show if move is check", valsButtons)}
        {hr}
        {buttonForProperty(
          "showIfTakes",
          "Show is move is taking piece",
          valsButtons
        )}
      </div>
    );
    return (
      <div>
        <Row>
          <Col xs={6}>
            <div> Stockfish strength (Elo): </div>
          </Col>
          <Col xs={6}>
            <Select
              clearable={false}
              value={{ label: values[this.props.skillLevel].label }}
              isSearchable={false}
              onChange={this.props.setSkill}
              options={values}
            />
          </Col>
          <Col xs={6}>
            <div> Stockfish depth: </div>
          </Col>
          <Col xs={6}>
            <Select
              clearable={false}
              value={{ label: this.props.depthLevel }}
              isSearchable={false}
              onChange={this.props.setDepth}
              options={depths}
            />
          </Col>
        </Row>
        {hr}
        {buttonForProperty("ownColorWhite", "You play", valsColor)}
        {hr}
        {buttonForProperty(
          "enterMoveByKeyboard",
          "Enter moves by keyboard",
          valsButtons
        )}
        {displaySettings}
      </div>
    );
  };
}

SettingsWindow.propTypes = {
  setSkill: PropTypes.func,
  skillLevel: PropTypes.number,
  parentState: PropTypes.object,
  setProperty: PropTypes.func,
};

/* The statuswindow provides the status of the games and the last moves
by the player and the computer */
export class StatusWindow extends React.Component {
  constructor(props) {
    super(props);
  }

  render = () => {
    const humanText = this.props.humanMove ? (
      <div>
        <span>You played </span>
        <Badge bg="secondary"> {this.props.humanMove}</Badge>
      </div>
    ) : (
      <span>Make your move!</span>
    );
    const computerText = this.props.isComputerMove ? (
      <span>Computer is thinking...</span>
    ) : this.props.computerMove ? (
      <div>
        <span>Computer played </span>
        <Badge bg="secondary">{this.props.computerMove}</Badge>
      </div>
    ) : (
      <span>Computer is waiting...</span>
    );
    return (
      <div>
        <Row style={{ marginTop: 20 }}>
          <Col xs={6}>
            <Alert
              style={{ fontSize: "125%", height: 50, paddingTop: 10 }}
              className="text-center"
              variant={this.props.status[2]}
            >
              {" "}
              {this.props.status[1]}
            </Alert>
          </Col>
          <Col xs={6}>
            <div className="text-center">
              {this.props.status == gameStatus.starting ? null : (
                <Button
                  style={{ height: 50 }}
                  className={styles.newGameButton}
                  variant="primary"
                  id="resetButton"
                  onClick={this.props.reset}
                >
                  Start New
                </Button>
              )}
            </div>
          </Col>
        </Row>
        <Row>
          <div className="text-center">
            <span className={styles.statusStyle}>{humanText}</span>
          </div>
        </Row>
        {this.props.autoMove && (
          <Row>
            <div className="text-center">
              <span className={styles.statusStyle}>{computerText}</span>
            </div>
          </Row>
        )}
      </div>
    );
  };
}

StatusWindow.propTypes = {
  reset: PropTypes.func,
  status: PropTypes.any,
  computerMove: PropTypes.string,
  humanMove: PropTypes.string,
  setSkill: PropTypes.any,
  skillLevel: PropTypes.number,
};

class InputComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inputValue: null,
    };
  }

  isNotEmptyAndNotWhitespace = (str) => {
    return typeof str === "string" && str.trim().length > 0;
  };

  handleChange = (event) => {
    this.setState({ inputValue: event.target.value });
  };

  handleKeyPress = (event) => {
    if (event.key === "Enter") {
      this.handleSubmit();
    }
  };

  handleSubmit = () => {
    let inputValue =
      this.state.inputValue === null
        ? this.props.defaultValue
        : this.state.inputValue;
    if (this.isNotEmptyAndNotWhitespace(inputValue)) {
      this.props.handleInput(inputValue);
    }
  };

  render() {
    return (
      <label>
        <input
          type="text"
          value={
            this.state.inputValue === null
              ? this.props.defaultValue
              : this.state.inputValue
          }
          onChange={this.handleChange}
          onKeyPress={this.handleKeyPress}
        />
      </label>
    );
  }
}

/* The main app, which pulls in all the other windows. */
export class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = startingState();
  }
  reset = (fen = null) => {
    fen = typeof fen === "string" ? fen : null;
    this.setState(resetState(fen), () => {
      if (this.state.autoMove) this.makeComputerMove();
    });
  };

  // componentDidMount() {
  //
  // }

  // eslint-disable-next-line no-unused-vars
  componentDidUpdate = (prevProps, prevState, snapshot) => {
    var table = document.getElementById("moveTable");
    if (table != null && "scrollHeight" in table) {
      table.scrollTop = table.scrollHeight;
    }
  };
  componentDidMount = () => {
    window.addEventListener("keydown", this.handleKeyDown);
  };

  componentWillUnmount = () => {
    window.removeEventListener("keydown", this.handleKeyDown);
  };

  handleKeyDown = (event) => {
    if (event.keyCode === 37) this.lookBack(); // left arrow take back
    else if (event.keyCode === 39) this.lookFoward(); // right arrow redo move
    else if (event.keyCode === 40) this.lookBackToBeginning(); // bottom arrow redo move
    // else if (event.keyCode === 38) this.jumpToCurrent(); // top arrow jump to current position
  };

  makeComputerMoveDelayed = () => {
    if (this.state.boardAppear) setTimeout(this.makeComputerMove, 200);
    else this.makeComputerMove();
  };

  makeMove = (move) => {
    if (this.state.gameClient.client.isGameOver()) return;
    const moveRes = this.state.gameClient.move(move);
    if (moveRes === null) return;
    move = typeof move === "object" ? moveRes.san : move;
    const newMoves = this.state.moves.push(move);
    const nextMoveCallback = () => {
      if (this.state.autoMove) {
        this.makeComputerMoveDelayed()
      }
      if (this.state.gameClient.client.isGameOver()){
        setTimeout(() => {
          alertGameOver(this.state.gameClient.client)
        }, this.state.boardAppear ? 250 : 0);
      }
    }
    const newState = {
      moves: newMoves,
      colorToMoveWhite: !this.state.colorToMoveWhite,
      takebackCache: [], // if you make a new move, automatically cancels any takeback history
      clickSquaresData: {},
      promotionData: {},
      boardHistoryData: {}
    };
    this.setState(newState, nextMoveCallback);
  };

  inLookBackMode = () => this.state.boardHistoryData.client !== undefined;

  lookBackToSpecificMove = (histIdx, move= null) => {
    // if (!this.state.gameClient.client.isGameOver() && !this.isPlayersMove()) return;
    if (histIdx === this.state.moves.size - 1) {
      if (this.inLookBackMode()){
         this.jumpToCurrent()
      }
    } else {
      let history, client;
      client = _.cloneDeep(this.state.gameClient.client)
      client.undo()
      history = client.history({verbose: true})
      let histCurrentIdx = history.length - 1;
      while (histCurrentIdx > histIdx) {
        client.undo()
        histCurrentIdx--;
      }
      const newHistory = client.history();
      if(newHistory.length !== 0) console.assert(newHistory.at(-1) === move)
      const boardHistoryData = {client: client, fullHistory: history, histIdx: histIdx}
      this.setState({boardHistoryData: boardHistoryData}, () => {
        // console.log(this.state.boardHistoryData);
      })
    }

  }

  lookBackToBeginning = () =>{
    this.lookBackToSpecificMove(-1)
  }

  jumpToCurrent = () =>{
    this.setState({boardHistoryData: {}}) // clears boardHistoryData, causing the 'main' board to render
  }

  lookBack = () => {
    // if (!this.state.gameClient.client.isGameOver() && !this.isPlayersMove()) return;
    let boardHistoryData;
    if (this.inLookBackMode()) {
      const histIdx = this.state.boardHistoryData.histIdx
      if (histIdx === -1) return // at the OG position
      const client = this.state.boardHistoryData.client
      client.undo()
      boardHistoryData = {...this.state.boardHistoryData, histIdx: histIdx - 1}
    } else {
      const client = _.cloneDeep(this.state.gameClient.client)
      client.undo()
      const history = client.history({ verbose: true })
      boardHistoryData = {client: client, fullHistory: history, histIdx: history.length - 1}
    }
    this.setState({boardHistoryData: boardHistoryData})
  }

  lookFoward = () => {
    if (this.inLookBackMode()) {
      const histIdx = this.state.boardHistoryData.histIdx
      const fullHistory = this.state.boardHistoryData.fullHistory
      if (histIdx === fullHistory.length - 1) {
        this.jumpToCurrent()
      } else {
        this.state.boardHistoryData.client.move(fullHistory[histIdx + 1])
        let boardHistoryData = {...this.state.boardHistoryData, histIdx: this.state.boardHistoryData.histIdx + 1}
        this.setState({boardHistoryData: boardHistoryData})
      }
    }
  }

  takeback = () => {
    let gameOver = this.state.gameClient.client.isGameOver();
    if (!gameOver && !this.isPlayersMove()) return;
    let newMoves = this.state.moves;
    const newState = { colorToMoveWhite: this.state.colorToMoveWhite };
    if (newMoves.size !== 0) {
      for (let i = 0; i < 2; i++) {
        this.state.gameClient.client.undo();
        this.state.takebackCache.push(newMoves.last());
        newMoves = newMoves.splice(-1);
        // if playing computer or the most recent move was the computer ending the game, then break early
        if (!this.state.autoMove || (!this.isPlayersMove() && gameOver)) {
          newState.colorToMoveWhite = !newState.colorToMoveWhite;
          break;
        }
      }
      newState.moves = newMoves;
      this.setState(newState, () => {
        if (this.inLookBackMode()){
         this.jumpToCurrent()
        }
      });
    }
  };

  // redoMove = () => {
  //   if (!this.isPlayersMove()) return;
  //   let newMoves = this.state.moves;
  //   const newState = { colorToMoveWhite: this.state.colorToMoveWhite };
  //   if (this.state.takebackCache.length > 0) {
  //     for (let i = 0; i < 2; i++) {
  //       const lastUndoneMove = this.state.takebackCache.pop();
  //       this.state.gameClient.move(lastUndoneMove);
  //       newMoves = newMoves.push(lastUndoneMove);
  //       if (
  //         !this.state.autoMove ||
  //         (i === 0 && this.state.gameClient.client.isGameOver())
  //       ) {
  //         // if playing computer, or the most recent move ended the game, then only take back a half move
  //         newState.colorToMoveWhite = !newState.colorToMoveWhite;
  //         break;
  //       }
  //     }
  //     newState.moves = newMoves;
  //     this.setState(newState);
  //   }
  // };

  setFen = (fen) => {
    let isValidFen = validateFen(fen).ok;
    if (isValidFen) {
      this.reset(fen);
    } else {
      this.setState({ customFen: fen });
    }
  };

  onDrop = (sourceSquare, targetSquare, piece) => {
    if (this.inLookBackMode()){
      this.jumpToCurrent()
    } else {
      if (this.isPlayersMove()) {
        this.makeMove({
          from: sourceSquare,
          to: targetSquare,
          promotion: piece.slice(-1).toLowerCase(),
        });
      }
    }
  };

  onSquareClick = (square, piece) => {
    if (!this.isPlayersMove()) return;
    const clickSquaresData = this.state.clickSquaresData;
    // if a square with a piece hasnt already been clicked or if you're clicking a different piece of your color
    if (
      Object.keys(clickSquaresData).length === 0 ||
      (piece !== undefined &&
        (piece[0] === "w") === this.state.colorToMoveWhite)
    ) {
      const moves = this.state.gameClient.legalMoves.filter(
        (move) => move.from === square
      );
      if (moves.length === 0) {
        this.setState({ clickSquaresData: {} });
        return;
      }
      const client = this.state.gameClient.client;
      const newSquares = {};
      moves.map((move) => {
        newSquares[move.to] = {
          background:
            client.get(move.to) &&
            client.get(move.to).color !== client.get(square).color
              ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
              : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
          borderRadius: "50%",
        };
        return move;
      });
      newSquares[square] = {
        background: "rgba(255, 255, 0, 0.4)",
      };
      this.setState({
        clickSquaresData: {
          newSquares: newSquares,
          from: square,
          piece: piece,
        },
      });
    } else {
      if (Object.keys(clickSquaresData).length === 0) return;
      const state = this.state;
      // check for promotion
      if (
        (this.state.colorToMoveWhite &&
          this.state.clickSquaresData.piece === "wP" &&
          square[1] === "8") ||
        (!this.state.colorToMoveWhite &&
          this.state.clickSquaresData.piece === "bP" &&
          square[1] === "1")
      ) {
        this.setState({
          promotionData: { to: square, from: this.state.clickSquaresData.from },
          clickSquaresData: {},
        });
      } else {
        const moves = { from: clickSquaresData.from, to: square };
        this.makeMove(moves);
      }
    }
  };

  onPromotionPieceSelect = (piece, promoteFromSquare, promoteToSquare) => {
    const promoteFromSquareExists = promoteFromSquare !== undefined;
    this.makeMove({
      from:
        promoteFromSquareExists
          ? promoteFromSquare
          : this.state.promotionData.from,
      to:
        promoteFromSquareExists
          ? promoteToSquare
          : this.state.promotionData.to,
      promotion: piece.slice(-1).toLowerCase(),
    });
  };

  isPlayersMove = () =>
    !this.state.autoMove ||
    this.state.ownColorWhite === this.state.colorToMoveWhite;

  makeComputerMove = () => {
    // Only make a computer move if it's not the player's turn
    if (this.isPlayersMove()) {
      return;
    }
    const fen = this.state.gameClient.client.fen();
    if (this.state.skillLevel === 0)
      makeRandomMove(this.state.gameClient, this.makeMove);
    else
      getBest(this.state.skillLevel, this.state.depthLevel, fen, this.makeMove);
  };
  shownElement = () => {
    switch (this.state.showType) {
      case "make":
        return this.makeMoveElement();
      case "moves":
        return this.moveTableElement();
      case "board":
        return this.boardElement();
      case "board+moves":
        return this.moveTableAndBoardElement();
      case "settings":
        return this.settingsElement();
      case "board-editor":
        return this.boardEditorElement();
    }
  };
  getLastMove = (offsetTrue, offsetFalse) => () => {
    const history = this.state.gameClient.client.history();
    const offset = !this.isPlayersMove() ? offsetTrue : offsetFalse;
    return history[history.length - offset];
  };
  getLastVerboseMove = () => {
     let lastMove;
     if (this.state.boardHistoryData.client === undefined) {
       lastMove = this.state.gameClient.client.history({verbose: true})
           .at(-1);
       if (lastMove) return [lastMove.from, lastMove.to];
       return [];
     }
     const histIdx = this.state.boardHistoryData.histIdx
     if (histIdx < 0) return []
     lastMove = this.state.boardHistoryData.fullHistory.at(histIdx);
     if (lastMove) return [lastMove.from, lastMove.to];
  };
  getLastComputerMove = this.getLastMove(2, 1);
  getLastHumanMove = this.getLastMove(1, 2);
  toggleBoardAppearance = () => {
    this.setState({ boardAppear: !this.state.boardAppear });
  };
  toggleMoveEntryAppearance = () => {
    this.setState({ moveEntryAppear: !this.state.moveEntryAppear });
  }
  toggleMoveTableAppearance = () =>
    this.setState({ moveTableAppear: !this.state.moveTableAppear });
  toggleAutoMove = () => {
    this.setState({ autoMove: !this.state.autoMove }, () => {
      if (!this.isPlayersMove()) {
        this.makeComputerMoveDelayed();
      }
    });
  };

  increaseBoardWidth = () => {
    this.setState((prevState) => {
      if (prevState.boardWidth < 850) {
        return { boardWidth: prevState.boardWidth + 50 };
      }
      return null;
    });
  };

  // Handler for decreasing the width
  decreaseBoardWidth = () => {
    this.setState((prevState) => {
      if (prevState.boardWidth > 200) {
        return { boardWidth: prevState.boardWidth - 50 };
      }
      return null;
    });
  };

  downloadPGN = () => {
    const client = this.state.gameClient.client;
    const history = client.history({ verbose: true });

    if (history.length === 0) return;
    let result = "";
    if (client.isGameOver()) {
      result = client.isCheckmate() ? history.at(-1).color : "d";
    } else {
      result = prompt(
        "Who won? w/b/d/* (d for draw, * for unknown/in progress)"
      );
    }
    let resultTag = "";
    if (result === "w") resultTag = "1-0";
    else if (result === "b") resultTag = "0-1";
    else if (result === "d") resultTag = "1/2-1/2";
    else if (result === "*") resultTag = "*";
    else return;
    const [dateTag, timeTag, utcDateTag, utcTimeTag] = getDateAndTimeForPGN();
    let pgn = `[Date "${dateTag}"]\n`;
    pgn += `[Time "${timeTag}"]\n`;
    pgn += `[UTCDate "${utcDateTag}"]\n`;
    pgn += `[UTCTime "${utcTimeTag}"]\n`;
    pgn += `[Result "${resultTag}"]\n\n`;
    pgn += client.pgn();
    pgn += ` ${resultTag}`;
    console.log(pgn);

    const element = document.createElement("a");
    const file = new Blob([pgn], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "game.pgn";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  makeMoveElement = () => (
    <div>
      <StatusWindow
        reset={this.reset}
        gameClient={this.state.gameClient}
        status={this.state.gameClient.getStatus()}
        autoMove={this.state.autoMove}
        humanMove={this.getLastHumanMove()}
        computerMove={this.getLastComputerMove()}
        isComputerMove={!this.isPlayersMove()}
      />
      <div style={{ marginBottom: "1%" }}>
        Insert custom FEN:
        <InputComponent
          handleInput={this.setFen}
          defaultValue={
            this.state.customFen === null ? "" : this.state.customFen
          }
        />
        <div style={{ color: "red" }}>
          {this.state.customFen !== null &&
            !validateFen(this.state.customFen).ok && "Invalid FEN!"}
        </div>
      </div>
      <Button
        style={{ marginBottom: "1%" }}
        onClick={() => this.lookBackToBeginning()}
      >
        <svg width="1.5em"
          height="1.5em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.9167 12.0001L23 19.3334L23 4.66675L12.9167 12.0001Z" stroke="#333333" stroke-width="1.83333" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16.5833 19.3334L6.49998 12.0001L16.5833 4.66675" stroke="#333333" stroke-width="1.83333" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M11.0833 19.3334L0.99998 12.0001L11.0833 4.66675" stroke="#333333" stroke-width="1.83333" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </Button>
      <Button
        style={{ marginBottom: "1%", marginLeft: "1%"}}
        onClick={() => this.lookBack()}
      >
        <svg
          width="1.5em"
          height="1.5em"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10.2222 12L20 19.1111L20 4.88889L10.2222 12Z"
            stroke="#333333"
            strokeWidth="1.77778"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.7778 19.1111L3.99999 12L13.7778 4.88889"
            stroke="#333333"
            strokeWidth="1.77778"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Button>
      <Button
        style={{ marginBottom: "1%", marginLeft: "1%" }}
        onClick={() => this.lookFoward()}
      >
        <svg
          width="1.5em"
          height="1.5em"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13.7778 12L4 19.1111L4 4.88892L13.7778 12Z"
            stroke="#333333"
            strokeWidth="1.77778"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.2222 19.1111L20 12L10.2222 4.88892"
            stroke="#333333"
            strokeWidth="1.77778"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Button>
      <Button
        style={{ marginBottom: "1%", marginLeft: "1%" }}
        onClick={() => this.takeback()} disabled={
          !this.state.gameClient.client.isGameOver() && !this.isPlayersMove()
        }
      >
        Takeback
      </Button>
      <Button
        style={{ marginBottom: "1%", marginLeft: "1%" }}
        onClick={() => this.downloadPGN()}
      >
        PGN
      </Button>
      <Button
        style={{ marginBottom: "1%", marginLeft: "1%" }}
        variant="primary"
        id="toggleBoardAppearance"
        onClick={() => this.toggleBoardAppearance()}
      >
        {this.state.boardAppear ? "Hide Board" : "Show Board"}
      </Button>
      {this.state.boardAppear && this.boardElement()}
      <Button
        style={{ marginBottom: "1%", marginTop: "1%"}}
        variant="primary"
        id="toggleMoveEntryAppearance"
        onClick={() => this.toggleMoveEntryAppearance()}
      >
        {this.state.moveEntryAppear ? "Hide Move Options" : "Show Move Options"}
      </Button>
      {this.state.moveEntryAppear && this.isPlayersMove() ? (
        <Row>
          <MoveEntry
            enterMoveByKeyboard={this.state.enterMoveByKeyboard}
            gameClient={this.state.gameClient}
            makeMove={this.makeMove}
            parentState={this.state}
          />
        </Row>
      ) : null}
      <div>
        <Button
          style={{ marginBottom: "1%", marginTop: "1%" }}
          variant="primary"
          id="toggleMoveTableAppearance"
          onClick={() => this.toggleMoveTableAppearance()}
        >
          {this.state.moveTableAppear ? "Hide Move Table" : "Show Move Table"}
        </Button>
        {this.state.moveTableAppear && this.moveTableElement()}
      </div>
    </div>
  );
  boardElement = () => {
    const lastMove = this.getLastVerboseMove();
    const orientation = this.state.ownColorWhite ? "white" : "black"
    const animationDuration = 100;
    const boardWidth = this.state.boardWidth
    const board = this.inLookBackMode() ?
        (<Chessboard id="history"
          position={this.state.boardHistoryData.client.fen()}
          onPieceDrop={this.onDrop}
          boardOrientation={orientation}
          boardWidth={boardWidth}
          animationDuration={animationDuration}
          customArrows={[lastMove]}
          customDarkSquareStyle={{ backgroundColor: "#c39f82" }}
          customLightSquareStyle={{ backgroundColor: "#f3e0c3" }}
            />
        ) : (
        <Chessboard
            id="main"
          position={this.state.gameClient.client.fen()}
          onPieceDrop={this.onDrop}
          onSquareClick={this.onSquareClick}
          onPieceClick={this.onPieceClick}
          boardOrientation={orientation}
          boardWidth={boardWidth}
          animationDuration={animationDuration}
          customArrows={[lastMove]}
          customSquareStyles={this.state.clickSquaresData.newSquares}
          showPromotionDialog={
            Object.keys(this.state.promotionData).length !== 0
          }
          onPromotionPieceSelect={this.onPromotionPieceSelect}
        />
        )
    return (
      <div style={{ justifyContent: "center" }}>
        {/*<Board fen={this.state.gameClient.client.fen()} />*/}
        <div style={{ height: "20%", marginBottom: "1%" }}>
          <Button
            style={{ marginRight: "1%" }}
            onClick={this.decreaseBoardWidth}
          >
            -
          </Button>
          <Button onClick={this.increaseBoardWidth}>+</Button>
        </div>
        {board}
      </div>
    );
  };
  boardEditorElement = () => {
    return <Chessboard />;
  };
  handleChange = (value) => this.setState({ showType: value });
  handleCellClick = (colNum, rowNum, cellData) => {
    const histIdx = (rowNum  * 2 ) + (colNum === 2 ? 1 : 0)
    this.lookBackToSpecificMove(histIdx, cellData)
    // Perform any other actions with the data
  };
  moveTableElement = () => {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <MoveTable pgn={this.state.gameClient.client.pgn()} onCellClick={this.handleCellClick} shouldScrollBottom={!this.inLookBackMode()}/>
      </div>
    );
  };
  moveTableAndBoardElement = () => {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Board fen={this.state.gameClient.client.fen()} />
        </div>
        {this.moveTableElement()}
      </div>
    );
  };
  setSkill = (skill) => {
    this.setState({ skillLevel: skill.value });
  };
  setDepth = (depth) => {
    this.setState({ depthLevel: depth.value });
  };
  setOwnColor = (isWhite) =>
    this.setState({ ownColorWhite: isWhite }, this.makeComputerMove);
  setProperty = (name, value) => {
    var newState = {};
    newState[name] = value;

    var callback = () => {};
    if (name == "ownColorWhite" && this.state.autoMove) {
      callback = this.makeComputerMove;
    }

    this.setState(newState, callback);
  };
  settingsElement = () => (
    <SettingsWindow
      skillLevel={this.state.skillLevel}
      setSkill={this.setSkill}
      depthLevel={this.state.depthLevel}
      setDepth={this.setDepth}
      ownColorWhite={this.state.ownColorWhite}
      setOwnColor={this.setOwnColor}
      setProperty={this.setProperty}
      parentState={this.state}
    />
  );
  render = () => {
    return (
      <div>
        <Container>
          <Col md={{ span: 6, offset: 3 }}>
            <Row>
              <AppNavbar />
            </Row>
            <Row>
              <ButtonGroup className="mb-2">
                <Button
                  variant="secondary"
                  className="w-100"
                  onClick={() => this.handleChange("make")}
                >
                  Play
                </Button>
                {/*<Button*/}
                {/*  variant="secondary"*/}
                {/*  className="btn btn-default w-100"*/}
                {/*  onClick={() => this.handleChange("moves")}*/}
                {/*>*/}
                {/*  Moves*/}
                {/*</Button>*/}
                {/*<Button*/}
                {/*  variant="secondary"*/}
                {/*  className="btn btn-default w-100"*/}
                {/*  onClick={() => this.handleChange("board")}*/}
                {/*>*/}
                {/*  Board*/}
                {/*</Button>*/}
                {/*<Button*/}
                {/*  variant="secondary"*/}
                {/*  className="btn btn-default w-100"*/}
                {/*  onClick={() => this.handleChange("board+moves")}*/}
                {/*>*/}
                {/*  Board + Moves*/}
                {/*</Button>*/}
                <Button
                  variant="secondary"
                  className="btn btn-default w-100"
                  onClick={() => this.handleChange("settings")}
                >
                  Settings
                </Button>
                {/*<Button*/}
                {/*  variant="secondary"*/}
                {/*  className="btn btn-default w-100"*/}
                {/*  onClick={() => this.handleChange("board-editor")}*/}
                {/*>*/}
                {/*  Board Editor*/}
                {/*</Button>*/}
              </ButtonGroup>
            </Row>
            <Button
              style={{ height: 50 }}
              className={styles.newGameButton}
              variant="primary"
              id="toggleAutoMove"
              onClick={() => this.toggleAutoMove()}
              active={this.isPlayersMove()}
              disabled={!this.isPlayersMove()}
            >
              {this.state.autoMove ? "Manual" : "Playing Computer"}{" "}
            </Button>
            <div style={{ marginTop: 10 }}>{this.shownElement()}</div>
          </Col>
        </Container>
      </div>
    );
  };
}

App.defaultProps = {
  showInput: false,
};

// App.propTypes = {
//   autoMove: PropTypes.bool,
// };
