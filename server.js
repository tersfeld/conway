const express = require("express");
const path = require("path");
const app = require("express")();

const server = require("http").Server(app);
const io = require("socket.io")(server);

const Promise = require("bluebird");
const randomColor = require("randomcolor");

const squareSize = 16; //TODO: we could put an input in the UI and put an API call to update the size of squares
const tickTime = 1000; //TODO: we could put a slider in the UI and put an API call to update the ticktime

const windowWidth = 800;
const windowHeight = 400;

const gridWidth = Math.floor(windowWidth / squareSize);
const gridHeight = Math.floor(windowHeight / squareSize);

let cells = [];
let ticks = 0;

class Cell {
  constructor(x, y, color, status) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.status = status;
  }
}

class Color {
  constructor(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function generateCells() {
  let scopedCells = [];
  for (let i = 0; i < gridHeight; i++) {
    scopedCells[i] = [];
    for (let j = 0; j < gridWidth; j++) {
      scopedCells[i][j] = new Cell(j, i, randomColor(), "dead");
    }
  }
  return scopedCells;
}

function addCell(coordinates, color) {
  const gridX = Math.floor(coordinates.x / squareSize);
  const gridY = Math.floor(coordinates.y / squareSize);
  if (gridX > 0 && gridX < gridWidth && gridY > 0 && gridY < gridHeight) {
    cells[gridY][gridX] = new Cell(gridX, gridY, color, "alive");
    io.sockets.emit("cells", { cells });
  }
}

function countNeighbors(y, x) {
  let numberOfNeighbors = 0;
  let neighborsAverageColor = new Color(0, 0, 0);

  for (let i = y - 1; i < y + 2; i++) {
    for (let j = x - 1; j < x + 2; j++) {
      if (i === y && j === x) {
        // we skip the current cell as it is not a neighbor of itself
        continue;
      }
      if (i > 0 && i < gridHeight) {
        if (j > 0 && j < gridWidth) {
          if (cells[i][j].status === "alive") {
            numberOfNeighbors += 1;

            const rgb = hexToRgb(cells[i][j].color);
            neighborsAverageColor.r += rgb.r;
            neighborsAverageColor.g += rgb.g;
            neighborsAverageColor.b += rgb.b;
          }
        }
      }
    }
  }

  // simple color average
  if (numberOfNeighbors !== 0) {
    neighborsAverageColor.r = Math.floor(
      neighborsAverageColor.r / numberOfNeighbors
    );
    neighborsAverageColor.g = Math.floor(
      neighborsAverageColor.g / numberOfNeighbors
    );
    neighborsAverageColor.b = Math.floor(
      neighborsAverageColor.b / numberOfNeighbors
    );
  }

  return { numberOfNeighbors, neighborsAverageColor };
}

function updateCells(updates) {
  for (let i = 0; i < updates.length; i++) {
    const { x, y } = updates[i];
    cells[y][x] = updates[i];
  }
}

function checkCells() {
  let updatedCells = [];
  for (let i = 0; i < gridHeight; i++) {
    for (let j = 0; j < gridWidth; j++) {
      const { numberOfNeighbors, neighborsAverageColor } = countNeighbors(i, j);
      let cell = null;

      if (cells[i][j].status === "alive") {
        if (numberOfNeighbors < 2) {
          // Any live cell with fewer than two live neighbors dies, as if by underpopulation.
          cell = new Cell(j, i, cells[i][j].color, "dead");
        } else if (numberOfNeighbors === 2 || numberOfNeighbors === 3) {
          // Any live cell with two or three live neighbors lives on to the next generation.
          cell = new Cell(j, i, cells[i][j].color, "alive");
        } else if (numberOfNeighbors > 3) {
          // Any live cell with more than three live neighbors dies, as if by overpopulation.
          cell = new Cell(j, i, cells[i][j].color, "dead");
        }
      } else {
        // Any dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.
        if (numberOfNeighbors === 3) {
          const c = rgbToHex(
            neighborsAverageColor.r,
            neighborsAverageColor.g,
            neighborsAverageColor.b
          );
          cell = new Cell(j, i, c, "alive");
        }
      }
      if (cell) {
        updatedCells.push(cell);
      }
    }
  }
  updateCells(updatedCells);
  io.sockets.emit("updates", { updatedCells });
}

function generateRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function placePattern(color) {
  for (let k = 0; k < 5; k++) {
    const x = generateRandomInt(4, gridWidth - 4);
    const y = generateRandomInt(4, gridHeight - 4);

    for (let i = y; i < y + 2; i++) {
      for (let j = x; j < x + 2; j++) {
        cells[i][j].color = color;
        cells[i][j].status = "alive";
      }
    }

    for (let i = y + 2; i < y + 4; i++) {
      for (let j = x + 2; j < x + 4; j++) {
        cells[i][j].color = color;
        cells[i][j].status = "alive";
      }
    }
  }

  for (let k = 0; k < 5; k++) {
    const x = generateRandomInt(4, gridWidth - 4);
    const y = generateRandomInt(4, gridHeight - 4);
    for (let i = y; i < y + 3; i++) {
      cells[i][x].color = color;
      cells[i][x].status = "alive";
    }
  }
}

// main function
// 1. checking if world updated
// 2. sending the new tick count to clients
function worldTick() {
  // Placing random patterns with a random color every 100 ticks
  if (ticks % 100 === 0) {
    placePattern(randomColor());
  }

  checkCells();

  console.log("Ticking: " + ticks);
  ticks += 1;
  io.sockets.emit("ticks", ticks);

  return Promise.delay(tickTime).then(() => worldTick());
}

cells = generateCells();
worldTick();

// Handling a new connection from a client
io.on("connection", function(socket) {
  const color = randomColor();

  // we start by emitting the matrix, and their assigned color
  socket.emit("init", { cells: cells, color: color });

  // handling some client demands
  // the current player wants to create a new cell at a given coordinates
  socket.on("newCell", function(data) {
    addCell(data, color);
  });

  // handling some client demands
  // the current player wants to place random patterns
  socket.on("pattern", function() {
    placePattern(color);
  });
});

// if we are in production mode, we serve everything through this server, UI included
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));

  app.get("/*", function(req, res) {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

const PORT = process.env.PORT || 5000;

if (module === require.main) {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log("Press Ctrl+C to quit.");
  });
}
