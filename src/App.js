import React, { Component } from "react";
import { Stage, Layer, Rect, Text } from "react-konva";

import socketIOClient from "socket.io-client";

export default class App extends Component {
  state = {
    myColor: null,
    cells: [],
    squareSize: 16,
    ticks: 0,
    socket: socketIOClient(
      process.env.NODE_ENV === "development" ? ":5000/" : "/"
    )
  };

  componentDidMount() {
    this.state.socket.on("init", data => {
      console.log(data);
      this.setState({ myColor: data });
    });

    // we listen to the cells topic to get the cell matrix
    this.state.socket.on("cells", data => {
      this.setState({ cells: data.cells });
    });

    this.state.socket.on("ticks", data => {
      this.setState({ ticks: data });
    });

    this.state.socket.on("updates", data => {
      const { updatedCells } = data;
      let cells = this.state.cells;
      for (let i = 0; i < updatedCells.length; i++) {
        const { x, y } = updatedCells[i];
        cells[y][x] = updatedCells[i];
      }
      this.setState({ cells: cells });
    });
  }

  addCell = clickEvent => {
    // we verify we don't click on alive cell
    if (clickEvent.target.x() === 0 && clickEvent.target.y() === 0) {
      const x = clickEvent.evt.x;
      const y = clickEvent.evt.y;
      this.state.socket.emit("newCell", { x, y });
    }
  };

  render() {
    return (
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={this.addCell}
      >
        <Layer>
          <Text
            text="Click here to place some patterns"
            onMouseDown={e => this.state.socket.emit("pattern", "beacon")}
          />
          {this.state.myColor ? (
            <Text
              text={`You are this color`}
              x={200}
              fill={this.state.myColor}
            />
          ) : (
            <Text text={"Connecting..."} />
          )}

          <Text text={`Ticks: ${this.state.ticks}`} x={300} />
          {this.state.cells.map((cellLine, i) => {
            return cellLine.map((cell, j) => {
              if (cell.status === "alive") {
                return (
                  <Rect
                    key={i + j}
                    x={j * 16}
                    y={i * 16}
                    width={this.state.squareSize}
                    height={this.state.squareSize}
                    fill={cell.color}
                    shadowBlur={1}
                  />
                );
              }
            });
          })}
        </Layer>
      </Stage>
    );
  }
}
