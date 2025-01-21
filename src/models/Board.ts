import { Piece } from './Piece';
import {
  CELL_SIZE,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  PADDING,
  TITLE_HEIGHT,
  WINDOW_WIDTH,
  COLORS,
} from '../utils/constants';

export type Grid = (number | string | null)[][];
export type Position = { x: number; y: number };

export class Board {
  grid: Grid;
  availablePieces: Piece[];
  selectedPiece: Piece | null;
  dragging: boolean;
  dragPos: Position | null;
  hasWon: boolean;
  scrollOffset: number;
  targetScroll: number;
  scrollSpeed: number;

  constructor() {
    this.dragging = false;
    this.selectedPiece = null;
    this.dragPos = null;
    this.hasWon = false;
    this.scrollOffset = 0;
    this.targetScroll = 0;
    this.scrollSpeed = 15;
    
    // Initialize grid
    this.grid = [
      [null, 0, 0, 0, null],    // Top row with corners missing
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0]           // Now 6 rows
    ];
    
    // Initialize pieces
    this.availablePieces = Piece.createAllPieces();
  }

  resetBoard(): void {
    // Reset grid with missing corners
    this.grid = [
      [null, 0, 0, 0, null],    // Top row with corners missing
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0]           // Now 6 rows
    ];
    
    // Reset pieces and state
    this.availablePieces = Piece.createAllPieces();
    this.dragging = false;
    this.selectedPiece = null;
    this.hasWon = false;
    this.scrollOffset = 0;
    this.targetScroll = 0;
  }

  isValidPosition(piece: Piece, startX: number, startY: number): boolean {
    // Convert pixel coordinates to grid coordinates
    const gridX = Math.floor((startX - PADDING) / CELL_SIZE);
    const gridY = Math.floor((startY - TITLE_HEIGHT) / CELL_SIZE);
    
    // Check if any part of the piece would be outside the board
    if (gridX < 0 || gridX + piece.width > BOARD_WIDTH ||
        gridY < 0 || gridY + piece.height > BOARD_HEIGHT) {
      return false;
    }
    
    // Check each cell of the piece
    for (let row = 0; row < piece.height; row++) {
      for (let col = 0; col < piece.width; col++) {
        if (piece.shape[row][col]) {
          const boardRow = gridY + row;
          const boardCol = gridX + col;
          
          // We already checked boundaries, just check if the cell is available
          if (this.grid[boardRow][boardCol] === null ||
              this.grid[boardRow][boardCol] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }

  placePiece(piece: Piece, x: number, y: number): void {
    // Convert pixel coordinates to grid coordinates
    const gridX = Math.floor((x - PADDING) / CELL_SIZE);
    const gridY = Math.floor((y - TITLE_HEIGHT) / CELL_SIZE);
    
    // Only place if the position is valid
    if (!this.isValidPosition(piece, x, y)) {
      return;
    }
    
    // Place each cell of the piece
    for (let row = 0; row < piece.height; row++) {
      for (let col = 0; col < piece.width; col++) {
        if (piece.shape[row][col]) {
          this.grid[gridY + row][gridX + col] = piece.color;
        }
      }
    }
  }

  checkWin(): boolean {
    // Check if all pieces have been placed
    if (this.availablePieces.length === 0) {
      // Check if all grid spaces are filled
      for (let row = 0; row < this.grid.length; row++) {
        for (let col = 0; col < this.grid[0].length; col++) {
          if (this.grid[row][col] !== null && this.grid[row][col] === 0) {
            return false;
          }
        }
      }
      return true;
    }
    return false;
  }

  updateScroll(): void {
    if (this.scrollOffset < this.targetScroll) {
      this.scrollOffset = Math.min(this.scrollOffset + this.scrollSpeed, this.targetScroll);
    } else if (this.scrollOffset > this.targetScroll) {
      this.scrollOffset = Math.max(this.scrollOffset - this.scrollSpeed, this.targetScroll);
    }
  }

  getMousePos(e: MouseEvent, canvas: HTMLCanvasElement): Position {
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / WINDOW_WIDTH;
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  }

  getPlacedPieceAtPosition(x: number, y: number): Piece | null {
    // Convert pixel coordinates to grid coordinates
    const gridX = Math.floor((x - PADDING) / CELL_SIZE);
    const gridY = Math.floor((y - TITLE_HEIGHT) / CELL_SIZE);
    
    // Check if click is within board bounds
    if (gridX < 0 || gridX >= BOARD_WIDTH || 
        gridY < 0 || gridY >= BOARD_HEIGHT ||
        this.grid[gridY][gridX] === null ||
        this.grid[gridY][gridX] === 0) {
      return null;
    }

    // Get the color of the clicked cell
    const color = this.grid[gridY][gridX];
    
    // Find all connected cells of the same color
    const visited = new Set<string>();
    const shape: number[][] = [];
    let minX = gridX;
    let minY = gridY;
    let maxX = gridX;
    let maxY = gridY;

    const explore = (row: number, col: number) => {
      const key = `${row},${col}`;
      if (visited.has(key)) return;
      
      if (row < 0 || row >= BOARD_HEIGHT || 
          col < 0 || col >= BOARD_WIDTH || 
          this.grid[row][col] !== color) {
        return;
      }

      visited.add(key);
      minX = Math.min(minX, col);
      maxX = Math.max(maxX, col);
      minY = Math.min(minY, row);
      maxY = Math.max(maxY, row);

      explore(row + 1, col);
      explore(row - 1, col);
      explore(row, col + 1);
      explore(row, col - 1);
    };

    explore(gridY, gridX);

    // Create the piece shape
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    for (let i = 0; i < height; i++) {
      shape[i] = Array(width).fill(0);
    }

    // Fill in the shape
    visited.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      shape[row - minY][col - minX] = 1;
    });

    // Remove the piece from the board
    visited.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      this.grid[row][col] = 0;
    });

    return new Piece(shape, color as string);
  }
} 