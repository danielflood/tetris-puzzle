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
    
    // Check each cell of the piece
    for (let row = 0; row < piece.height; row++) {
      for (let col = 0; col < piece.width; col++) {
        if (piece.shape[row][col]) {
          const boardRow = gridY + row;
          const boardCol = gridX + col;
          
          // Check bounds and cell availability
          if (boardRow < 0 || boardRow >= BOARD_HEIGHT ||
              boardCol < 0 || boardCol >= BOARD_WIDTH ||
              this.grid[boardRow][boardCol] === null ||
              this.grid[boardRow][boardCol] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }

  placePiece(piece: Piece, x: number, y: number): void {
    const gridX = Math.floor((x - PADDING) / CELL_SIZE);
    const gridY = Math.floor((y - TITLE_HEIGHT) / CELL_SIZE);
    
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
} 