const express = require("express");
const path = require("path");
const app = require("express")();

const server = require("http").Server(app);
const io = require("socket.io")(server);

var Promise = require("bluebird");
var randomColor = require("randomcolor");

let cells = [];
let squareSize = 16; //TODO: we could put an input in the UI and put an API call to update the size of squares
let tickTime = 1000; //TODO: we could put a slider in the UI and put an API call to update the ticktime
let ticks = 0;

const windowWidth = 800;
const windowHeight = 400;

const gridWidth = Math.floor(windowWidth / squareSize);
const gridHeight = Math.floor(windowHeight / squareSize);

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
      scopedCells[i][j] = new Cell(j, i, randomColor, "dead");
    }
  }
  return scopedCells;
}

// with more time, I would have a better OOP approach
function addCell(coordinates, color) {
  const gridX = Math.floor(coordinates.x / squareSize);
  const gridY = Math.floor(coordinates.y / squareSize);
  if (gridX > 0 && gridX < gridWidth && gridY > 0 && gridY < gridHeight) {
    cells[gridY][gridX] = new Cell(gridX, gridY, color, "alive");
    io.sockets.emit("cells", { cells });
  }
}

function countNeighbours(y, x) {
  let neighbours = 0;
  let neighbours_average_color = new Color(0, 0, 0);

  for (let i = y - 1; i < y + 2; i++) {
    for (let j = x - 1; j < x + 2; j++) {
      if (i === y && j === x) {
        // we skip the current cell as it is not a neighbour of itself
        continue;
      }
      if (i > 0 && i < gridHeight) {
        if (j > 0 && j < gridWidth) {
          if (cells[i][j].status === "alive") {
            neighbours += 1;

            const rgb = hexToRgb(cells[i][j].color);
            neighbours_average_color.r += rgb.r;
            neighbours_average_color.g += rgb.g;
            neighbours_average_color.b += rgb.b;
          }
        }
      }
    }
  }

  // simple color average
  if (neighbours !== 0) {
    neighbours_average_color.r = Math.floor(
      neighbours_average_color.r / neighbours
    );
    neighbours_average_color.g = Math.floor(
      neighbours_average_color.g / neighbours
    );
    neighbours_average_color.b = Math.floor(
      neighbours_average_color.b / neighbours
    );
  }

  return { neighbours, neighbours_average_color };
}

function updateCells(updates) {
  for (let i = 0; i < updates.length; i++) {
    const { x, y } = updates[i];
    cells[y][x] = updates[i];
  }
}

function checkCells() {
  let updatedCells = [];
  // let newCells = copyCells(cells);
  for (let i = 0; i < gridHeight; i++) {
    for (let j = 0; j < gridWidth; j++) {
      const { neighbours, neighbours_average_color } = countNeighbours(i, j);
      let cell = null;

      if (cells[i][j].status === "alive") {
        if (neighbours < 2) {
          // Any live cell with fewer than two live neighbours dies, as if by underpopulation.
          cell = new Cell(j, i, cells[i][j].color, "dead");
        } else if (neighbours === 2 || neighbours === 3) {
          // Any live cell with two or three live neighbours lives on to the next generation.
          cell = new Cell(j, i, cells[i][j].color, "alive");
        } else if (neighbours > 3) {
          // Any live cell with more than three live neighbours dies, as if by overpopulation.
          cell = new Cell(j, i, cells[i][j].color, "dead");
        }
      } else {
        // Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
        if (neighbours === 3) {
          const c = rgbToHex(
            neighbours_average_color.r,
            neighbours_average_color.g,
            neighbours_average_color.b
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

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function placePattern(pattern, color) {
  for (let k = 0; k < 5; k++) {
    const x = getRandomInt(4, gridWidth - 4);
    const y = getRandomInt(4, gridHeight - 4);

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
    const x = getRandomInt(4, gridWidth - 4);
    const y = getRandomInt(4, gridHeight - 4);
    for (let i = y; i < y + 3; i++) {
      cells[i][x].color = color;
      cells[i][x].status = "alive";
    }
  }
}

function worldTick() {
  checkCells();

  console.log("ticking: " + ticks);
  ticks += 1;
  io.sockets.emit("ticks", ticks);

  return Promise.delay(tickTime).then(() => worldTick());
}

cells = generateCells();
worldTick();

io.on("connection", function(socket) {
  const color = randomColor();

  socket.emit("cells", { cells });

  // the current player wants to create a new cell at a given coordinates
  socket.on("newCell", function(data) {
    addCell(data, color);
  });

  // the current player wants to place random patterns
  socket.on("pattern", function(pattern) {
    placePattern(pattern, color);
  });
});

// serv the production files (react app)
app.use(express.static(path.join(__dirname, "build")));

app.get("/*", function(req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = process.env.PORT || 5000;

if (module === require.main) {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log("Press Ctrl+C to quit.");
  });
}
