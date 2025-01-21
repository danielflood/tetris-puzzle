export const CELL_SIZE = 50;
export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 6;
export const PADDING = 40;
export const TITLE_HEIGHT = 80;
export const SELECTION_HEIGHT = 160;
export const WINDOW_WIDTH = BOARD_WIDTH * CELL_SIZE + PADDING * 2;
export const WINDOW_HEIGHT = BOARD_HEIGHT * CELL_SIZE + PADDING;

export const COLORS = {
  BG_COLOR: '#1a1a1a',
  GRID_COLOR: '#333333',
  EMPTY_COLOR: '#262626',
  BUTTON_COLOR: '#404040',
  BUTTON_HOVER_COLOR: '#505050',
} as const;

export const PIECE_COLORS = {
  RED_S: '#ff4444',
  GREEN_Z: '#44ff44',
  PURPLE_T: '#9933cc',
  ORANGE_L: '#ffaa33',
  BLUE_L: '#3333ff',
  YELLOW_SQUARE: '#ffff44',
  CYAN_LINE: '#33ffff',
} as const; 