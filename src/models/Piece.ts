import { PIECE_COLORS } from '../utils/constants';

export type PieceShape = number[][];
export type PieceColor = string;

export class Piece {
  shape: PieceShape;
  color: PieceColor;
  width: number;
  height: number;

  constructor(shape: PieceShape, color: PieceColor) {
    this.shape = shape;
    this.color = color;
    this.width = shape[0].length;
    this.height = shape.length;
  }

  rotate(): void {
    // Create a new rotated shape matrix
    const newShape = Array(this.width).fill(null).map(() => Array(this.height).fill(0));
    
    // Perform rotation
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        newShape[col][this.height - 1 - row] = this.shape[row][col];
      }
    }
    
    // Update shape and dimensions
    this.shape = newShape;
    [this.width, this.height] = [this.height, this.width];
  }

  static createAllPieces(): Piece[] {
    return [
      // S piece
      new Piece([
        [1, 1, 0],
        [0, 1, 1]
      ], PIECE_COLORS.RED_S),
      
      // Z piece
      new Piece([
        [0, 1, 1],
        [1, 1, 0]
      ], PIECE_COLORS.GREEN_Z),
      
      // T piece
      new Piece([
        [0, 1, 0],
        [1, 1, 1]
      ], PIECE_COLORS.PURPLE_T),
      
      // L piece
      new Piece([
        [0, 0, 1],
        [1, 1, 1]
      ], PIECE_COLORS.ORANGE_L),
      
      // Reverse L piece
      new Piece([
        [1, 1, 1],
        [0, 0, 1]
      ], PIECE_COLORS.BLUE_L),
      
      // Square piece
      new Piece([
        [1, 1],
        [1, 1]
      ], PIECE_COLORS.YELLOW_SQUARE),
      
      // Line piece
      new Piece([
        [1, 1, 1, 1]
      ], PIECE_COLORS.CYAN_LINE)
    ];
  }
} 