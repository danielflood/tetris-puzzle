export const CELL_SIZE = 30;
export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 6;
export const PADDING = 20;
export const TITLE_HEIGHT = 60;
export const SELECTION_HEIGHT = 120;
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
  RED_S: '#ff0000',
  GREEN_Z: '#00ff00',
  PURPLE_T: '#800080',
  ORANGE_L: '#ffa500',
  BLUE_L: '#0000ff',
  YELLOW_SQUARE: '#ffff00',
  CYAN_LINE: '#00ffff',
} as const; 