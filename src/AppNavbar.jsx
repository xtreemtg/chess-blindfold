import React from "react";
import { Nav, Navbar, Modal } from "react-bootstrap";

export const appName = "Blindfold chess";

export class AppNavbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = { showAbout: false };
  }
  setAbout = (val) => this.setState({ showAbout: val });
  render = () => {
    return (
      <div>
        <Navbar
          bg="light"
          style={{ marginBottom: 0, marginTop: 0, borderRadius: 0 }}
        >
          <Navbar.Brand href="#brand" style={{ marginLeft: 10 }}>
            Blindfold chess
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse>
            <Nav className="ms-auto">
              <Nav.Link onClick={() => this.setAbout(true)}>About</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <Modal show={this.state.showAbout} onHide={() => this.setAbout(false)}>
          <Modal.Header closeButton>
            <Modal.Title>About</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>A minimalist tool to play blindfold chess.</p>
            Features:
            <ul>
              <li>
                {" "}
                Hide/Show the board if you can't fully remember the position
              </li>
              <li> Hide/Show the move history</li>
              <li>
                {" "}
                Play by either clicking the moves, or, if you forget the board
                in your mind, by clicking on the board (i.e. dragging the
                pieces)
              </li>
              <li> Disable computer mode</li>
              <li> Change the Stockfish difficulty</li>
              <li>
                {" "}
                Provide different display options for possible moves. For
                instance, don't show whether a move is taking a piece, which
                makes the game harder
              </li>
              <li>
                {" "}
                Undo (take back) and redo moves (can also use left and right
                arrow keys){" "}
              </li>
              <li> Insert a custom FEN to play from a specific position</li>
              <li> Download a PGN of the game to learn from it</li>
            </ul>
            <p>
              All free and{" "}
              <a target="_blank" href="" rel="noreferrer">
                open-source
              </a>{" "}
              - happy for your contributions.
            </p>
          </Modal.Body>
        </Modal>
      </div>
    );
  };
}
