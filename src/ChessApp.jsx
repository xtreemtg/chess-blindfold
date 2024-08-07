import React, { useEffect, useRef } from "react";
import { useTable } from "react-table";
import PropTypes from "prop-types";
import styled from "styled-components";
import { Row } from "react-bootstrap";
import Chessdiagram from "react-chessdiagram";
// import { Chessboard } from "react-chessboard";
import { defaultGetRows } from "./helpers.jsx";
// import {GameClient} from "./helpers"

const lightSquareColor = "#f2f2f2";
const darkSquareColor = "#bfbfbf";
const flip = false;

const width = window.innerWidth;
const maxSquareSize = 50;
const squareSize = Math.min(width / 10, maxSquareSize);

const cols = [
  {
    Header: "Move",
    accessor: "moveNumber",
  },
  {
    Header: "White",
    accessor: "white",
  },
  {
    Header: "Black",
    accessor: "black",
  },
];

const Styles = styled.div`
  padding: 1rem;

  table {
    border-spacing: 0;
    border: 1px solid black;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      :last-child {
        border-right: 0;
      }
    }

    td {
      input {
        font-size: 1rem;
        padding: 0;
        margin: 0;
        border: 0;
      }
    }
  }

  .pagination {
    padding: 0.5rem;
  }
`;

function Table({ columns, data, onCellClick, shouldScrollBottom}) {
  // Use the state and functions returned from useTable to build your UI
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({
      columns,
      data,
    });

  const tableContainerRef = useRef(null);
  const scrollToBottom = () => {
    if (tableContainerRef.current && shouldScrollBottom) {
      tableContainerRef.current.scrollTop =
        tableContainerRef.current.scrollHeight;
    }
  };
  useEffect(() => {
    scrollToBottom();
  });
  const onCellClicked = (colNum, rowNum, cellData) => {
    if (onCellClick) {
      onCellClick(colNum, rowNum, cellData);
    }
  };

  // Render the UI for your table
  return (
    <div
      ref={tableContainerRef}
      style={{ overflowY: "scroll", height: "20em" }}
    >
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            // eslint-disable-next-line react/jsx-key
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                // eslint-disable-next-line react/jsx-key
                <th {...column.getHeaderProps()}>{column.render("Header")}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row, rowIndex) => {
            prepareRow(row);
            return (
              // eslint-disable-next-line react/jsx-key
              <tr {...row.getRowProps()}>
                {row.cells.map((cell, colIndex) => {
                  // eslint-disable-next-line react/jsx-key
                  return (
                    <td {...cell.getCellProps({
                      onClick: () =>
                      onCellClicked(colIndex, rowIndex, cell.value),
                      style: { cursor: 'pointer' }
                    })}>{cell.render("Cell")}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

Table.propTypes = {
  data: PropTypes.any,
  columns: PropTypes.any,
};

export class Board extends React.Component {
  constructor(props) {
    super(props);
  }
  render = () => (
    <Chessdiagram
      flip={flip}
      fen={this.props.fen}
      squareSize={squareSize}
      lightSquareColor={lightSquareColor}
      darkSquareColor={darkSquareColor}
    />
  );
}

Board.propTypes = {
  fen: PropTypes.string,
};

export class MoveTable extends React.Component {
  constructor(props) {
    super(props);
  }
  // getMoves = () => defaultGetRows(this.props.pgn);
  // rowMapper = (row) => ({
  //   moveNumber: row[0],
  //   white: row[1],
  //   black: row[2],
  // });
  // getData = () => this.getMoves().map(this.rowMapper);
  generateMoveList = (history) => {
  const moveList = [];

  // Iterate through the move history in steps of 2 (for White and Black moves)
  for (let i = 0; i < history.length; i += 2) {
    moveList.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1] || null,// Black's move might not exist if it's White's turn
    });
  }
  return moveList;
}
  render = () => {
    // var data = this.getData();
    const data = this.generateMoveList(this.props.client.history())
    if (data.length === 0)
      return <div style={{ textAlign: "center" }}>No moves yet</div>;
    return (
      <Row className="justify-content-md-center">
        <Styles>
          <Table columns={cols} data={data} onCellClick={this.props.onCellClick} shouldScrollBottom={this.props.shouldScrollBottom}/>
        </Styles>
      </Row>
    );
  };
}

MoveTable.propTypes = {
  pgn: PropTypes.string,
};
