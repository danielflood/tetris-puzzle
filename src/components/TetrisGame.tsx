'use client';

import { useEffect, useRef, useState } from 'react';
import { Board } from '../models/Board';
import { Piece } from '../models/Piece';
import {
  CELL_SIZE,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  SELECTION_HEIGHT,
  TITLE_HEIGHT,
  PADDING,
  COLORS,
} from '../utils/constants';

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<Board>(new Board());
  const refreshIconRef = useRef<HTMLImageElement | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load refresh icon once
    const refreshIcon = new Image();
    refreshIcon.src = '/refresh.svg';
    refreshIcon.onload = () => {
      refreshIconRef.current = refreshIcon;
    };

    // Calculate scale based on window size
    const updateScale = () => {
      if (!canvas) return;
      
      // Use 95vh to match the max-h-[95vh] class
      const maxHeight = window.innerHeight * 0.95;
      const maxWidth = window.innerWidth * 0.95;
      
      const gameAspect = WINDOW_WIDTH / (WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT);
      const containerAspect = maxWidth / maxHeight;
      
      let newScale;
      if (containerAspect > gameAspect) {
        // Container is wider than game - use height to scale
        newScale = maxHeight / (WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT);
      } else {
        // Container is taller than game - use width to scale
        newScale = maxWidth / WINDOW_WIDTH;
      }
      
      // Update canvas size
      canvas.style.width = `${WINDOW_WIDTH * newScale}px`;
      canvas.style.height = `${(WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT) * newScale}px`;
      canvas.width = WINDOW_WIDTH;
      canvas.height = WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT;
    };

    const board = boardRef.current;
    updateScale();

    // Convert screen coordinates to canvas coordinates
    const getCanvasCoordinates = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      if (!canvas) return;

      const touch = e.touches[0];
      const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);
      
      setMousePosition({ x, y });

      // Check reset button
      const resetButtonSize = 40;
      const resetButtonPadding = 10;
      const resetButtonX = WINDOW_WIDTH - resetButtonSize - resetButtonPadding;
      const resetButtonY = resetButtonPadding;
      
      if (x >= resetButtonX && x <= resetButtonX + resetButtonSize &&
          y >= resetButtonY && y <= resetButtonY + resetButtonSize) {
        board.resetBoard();
        return;
      }

      // Check rotate button if piece is selected
      if (board.selectedPiece) {
        const rotateButtonSize = 40;
        const rotateButtonPadding = 10;
        const rotateButtonX = rotateButtonPadding;
        const rotateButtonY = resetButtonY;
        
        if (x >= rotateButtonX && x <= rotateButtonX + rotateButtonSize &&
            y >= rotateButtonY && y <= rotateButtonY + rotateButtonSize) {
          board.selectedPiece.rotate();
          return;
        }
      }

      // Handle piece selection
      if (y >= TITLE_HEIGHT && y < WINDOW_HEIGHT + TITLE_HEIGHT) {
        const placedPiece = board.getPlacedPieceAtPosition(x, y);
        if (placedPiece) {
          board.selectedPiece = placedPiece;
          board.dragging = true;
          board.dragPos = { x, y };
          return;
        }
      }
      
      const piece = getPieceAtPosition(x, y);
      if (piece && !board.hasWon) {
        board.selectedPiece = piece;
        board.dragging = true;
        board.dragPos = { x, y };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!canvas) return;

      const touch = e.touches[0];
      const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);
      
      setMousePosition({ x, y });
      
      if (board.dragging) {
        board.dragPos = { x, y };
      } else if (y >= WINDOW_HEIGHT + TITLE_HEIGHT) {
        // Scrolling available pieces area
        const deltaX = touch.clientX - e.touches[0].clientX;
        board.targetScroll = Math.max(0, board.targetScroll + deltaX);
        
        const totalWidth = board.availablePieces.reduce((width, piece) =>
          width + (piece.width + 1) * CELL_SIZE, 0) - CELL_SIZE;
        const maxScroll = Math.max(0, totalWidth - WINDOW_WIDTH + 2 * PADDING);
        board.targetScroll = Math.min(board.targetScroll, maxScroll);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!canvas || !board.dragging || board.hasWon) return;

      const touch = e.changedTouches[0];
      const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);

      // Handle piece placement (similar to mouse up)
      if (board.selectedPiece) {
        let piecePlaced = false;
        
        if (y >= TITLE_HEIGHT && y < WINDOW_HEIGHT + TITLE_HEIGHT) {
          const adjustedX = x - (board.selectedPiece.width * CELL_SIZE) / 2;
          const adjustedY = y - (board.selectedPiece.height * CELL_SIZE) / 2;

          if (board.isValidPosition(board.selectedPiece, adjustedX, adjustedY)) {
            board.placePiece(board.selectedPiece, adjustedX, adjustedY);
            if (board.availablePieces.includes(board.selectedPiece)) {
              board.availablePieces = board.availablePieces.filter(
                p => p !== board.selectedPiece
              );
            }
            piecePlaced = true;

            if (board.checkWin()) {
              board.hasWon = true;
            }
          }
        }

        if (!piecePlaced && !board.availablePieces.includes(board.selectedPiece)) {
          board.availablePieces.push(board.selectedPiece);
        }

        board.dragging = false;
        board.selectedPiece = null;
      }
    };

    // Add touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Setup event listeners
    const handleMouseDown = (e: MouseEvent) => {
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      // Check if reset button was clicked (before win check)
      const resetButtonSize = 30;
      const resetButtonPadding = 10;
      const resetButtonX = WINDOW_WIDTH - resetButtonSize - resetButtonPadding;
      const resetButtonY = resetButtonPadding;
      
      if (x >= resetButtonX && x <= resetButtonX + resetButtonSize &&
          y >= resetButtonY && y <= resetButtonY + resetButtonSize) {
        board.resetBoard();
        return;
      }
      
      if (board.hasWon) {
        // Check if reset button was clicked
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonX = (WINDOW_WIDTH - buttonWidth) / 2;
        const buttonY = (WINDOW_HEIGHT + TITLE_HEIGHT) / 2 + 20;

        if (x >= buttonX && x <= buttonX + buttonWidth &&
            y >= buttonY && y <= buttonY + buttonHeight) {
          board.resetBoard();
        }
        return;
      }
      
      if (e.button === 0) { // Left click
        // First try to pick up a placed piece from the board
        if (y >= TITLE_HEIGHT && y < WINDOW_HEIGHT + TITLE_HEIGHT) {
          const placedPiece = board.getPlacedPieceAtPosition(x, y);
          if (placedPiece) {
            board.selectedPiece = placedPiece;
            board.dragging = true;
            board.dragPos = { x, y };
            return;
          }
        }
        
        // If no placed piece was clicked, try to select from available pieces
        const piece = getPieceAtPosition(x, y);
        if (piece && !board.hasWon) {
          board.selectedPiece = piece;
          board.dragging = true;
          board.dragPos = { x, y };
        }
      } else if (e.button === 2) { // Right click
        // If already dragging, just rotate the piece
        if (board.dragging && board.selectedPiece) {
          const currentCenterX = board.dragPos!.x;
          const currentCenterY = board.dragPos!.y;
          board.selectedPiece.rotate();
          board.dragPos = { x: currentCenterX, y: currentCenterY };
          return;
        }

        // Try to get piece at clicked position and rotate it (no picking up)
        const piece = getPieceAtPosition(x, y);
        if (piece) {
          piece.rotate();
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      setMousePosition({ x, y });
      
      if (board.dragging) {
        board.dragPos = { x, y };
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Only process left mouse button releases
      if (!canvas || !board.dragging || board.hasWon || e.button !== 0) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      if (board.selectedPiece) {
        let piecePlaced = false;
        
        // Try to place piece on board
        if (y >= TITLE_HEIGHT && y < WINDOW_HEIGHT + TITLE_HEIGHT) {
          const adjustedX = x - (board.selectedPiece.width * CELL_SIZE) / 2;
          const adjustedY = y - (board.selectedPiece.height * CELL_SIZE) / 2;

          if (board.isValidPosition(board.selectedPiece, adjustedX, adjustedY)) {
            board.placePiece(board.selectedPiece, adjustedX, adjustedY);
            // Only remove from available pieces if it was originally from there
            if (board.availablePieces.includes(board.selectedPiece)) {
              board.availablePieces = board.availablePieces.filter(
                p => p !== board.selectedPiece
              );
            }
            piecePlaced = true;

            if (board.checkWin()) {
              board.hasWon = true;
            }
          }
        }

        // If piece wasn't placed successfully and it wasn't from available pieces,
        // add it back to available pieces
        if (!piecePlaced && !board.availablePieces.includes(board.selectedPiece)) {
          board.availablePieces.push(board.selectedPiece);
        }

        board.dragging = false;
        board.selectedPiece = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!board.dragging && !board.hasWon) {
        if (e.deltaY < 0) {
          board.targetScroll = Math.max(0, board.targetScroll - CELL_SIZE * 2);
        } else {
          const totalWidth = board.availablePieces.reduce((width, piece) =>
            width + (piece.width + 1) * CELL_SIZE, 0) - CELL_SIZE;
          const maxScroll = Math.max(0, totalWidth - WINDOW_WIDTH + 2 * PADDING);
          board.targetScroll = Math.min(board.targetScroll + CELL_SIZE * 2, maxScroll);
        }
      }
    };

    // Add event listeners
    window.addEventListener('resize', updateScale);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Game loop with performance optimization
    let lastRender = 0;
    const fps = 60;
    const frameInterval = 1000 / fps;

    const render = (timestamp: number) => {
      const delta = timestamp - lastRender;
      
      if (delta >= frameInterval) {
        drawGame(ctx, board, mousePosition, refreshIconRef.current);
        lastRender = timestamp - (delta % frameInterval);
      }
      
      animationFrameId = requestAnimationFrame(render);
    };

    let animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', updateScale);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mousePosition]);

  const getPieceAtPosition = (x: number, y: number) => {
    const board = boardRef.current;
    if (y < WINDOW_HEIGHT + TITLE_HEIGHT) return null;

    let pieceX = PADDING - board.scrollOffset;
    for (const piece of board.availablePieces) {
      const pieceWidth = piece.width * CELL_SIZE;
      const pieceHeight = piece.height * CELL_SIZE;

      const pieceBounds = {
        x: pieceX,
        y: WINDOW_HEIGHT + TITLE_HEIGHT + 20,
        width: pieceWidth,
        height: pieceHeight
      };

      if (x >= pieceBounds.x && x < pieceBounds.x + pieceBounds.width &&
          y >= pieceBounds.y && y < pieceBounds.y + pieceBounds.height) {
        return piece;
      }

      pieceX += (piece.width + 1) * CELL_SIZE;
    }
    return null;
  };

  return (
    <div className="flex items-center justify-center h-screen w-full overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={WINDOW_WIDTH}
          height={WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT}
          className="max-h-[95vh] max-w-[95vw] border-2 border-gray-700 rounded-lg shadow-lg object-contain touch-none"
          style={{ 
            aspectRatio: `${WINDOW_WIDTH}/${WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT}`,
            height: 'auto'
          }}
        />
      </div>
    </div>
  );
}

function drawGame(
  ctx: CanvasRenderingContext2D, 
  board: Board,
  mousePosition: { x: number, y: number } | null,
  refreshIcon: HTMLImageElement | null
) {
  // Fill background
  ctx.fillStyle = COLORS.BG_COLOR;
  ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT);

  // Draw reset button in top-right corner with increased size
  const resetButtonSize = 40; // Increased size for touch
  const resetButtonPadding = 10;
  const resetButtonX = WINDOW_WIDTH - resetButtonSize - resetButtonPadding;
  const resetButtonY = resetButtonPadding;

  // Draw circular background
  ctx.fillStyle = COLORS.BUTTON_COLOR;
  ctx.beginPath();
  ctx.arc(resetButtonX + resetButtonSize/2, resetButtonY + resetButtonSize/2, resetButtonSize/2, 0, Math.PI * 2);
  ctx.fill();

  // Draw refresh icon if loaded
  if (refreshIcon) {
    ctx.save();
    ctx.filter = 'brightness(0) invert(1)';
    ctx.drawImage(
      refreshIcon,
      resetButtonX + resetButtonSize/4,
      resetButtonY + resetButtonSize/4,
      resetButtonSize/2,
      resetButtonSize/2
    );
    ctx.restore();
  }

  // Draw title
  ctx.font = '40px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText('TETRIS', WINDOW_WIDTH / 2, TITLE_HEIGHT / 2 + 15);

  // Draw board grid
  for (let row = 0; row < board.grid.length; row++) {
    for (let col = 0; col < board.grid[0].length; col++) {
      const x = col * CELL_SIZE + PADDING;
      const y = row * CELL_SIZE + TITLE_HEIGHT;

      if (board.grid[row][col] !== null) {
        // Draw cell
        ctx.fillStyle = String(board.grid[row][col] || COLORS.EMPTY_COLOR);
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        // Draw cell border
        ctx.strokeStyle = COLORS.GRID_COLOR;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  // Draw selection area
  ctx.fillStyle = '#282828';
  ctx.fillRect(0, WINDOW_HEIGHT + TITLE_HEIGHT, WINDOW_WIDTH, SELECTION_HEIGHT);
  ctx.strokeStyle = COLORS.GRID_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, WINDOW_HEIGHT + TITLE_HEIGHT);
  ctx.lineTo(WINDOW_WIDTH, WINDOW_HEIGHT + TITLE_HEIGHT);
  ctx.stroke();

  // Draw available pieces
  let pieceX = PADDING - board.scrollOffset;
  for (const piece of board.availablePieces) {
    if (piece !== board.selectedPiece || !board.dragging) {
      drawPieceInSelection(ctx, piece, pieceX);
    }
    pieceX += (piece.width + 1) * CELL_SIZE;
  }

  // Draw dragged piece
  if (board.dragging && board.selectedPiece && board.dragPos) {
    drawDraggedPiece(ctx, board);
  }

  // Draw win message
  if (board.hasWon) {
    drawWinMessage(ctx);
  }

  // Draw rotate button when a piece is selected (on mobile)
  if (board.selectedPiece && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    const rotateButtonSize = 40;
    const rotateButtonPadding = 10;
    const rotateButtonX = rotateButtonPadding;
    const rotateButtonY = resetButtonY;

    // Draw circular background
    ctx.fillStyle = COLORS.BUTTON_COLOR;
    ctx.beginPath();
    ctx.arc(rotateButtonX + rotateButtonSize/2, rotateButtonY + rotateButtonSize/2, rotateButtonSize/2, 0, Math.PI * 2);
    ctx.fill();

    // Draw rotate arrow
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const centerX = rotateButtonX + rotateButtonSize/2;
    const centerY = rotateButtonY + rotateButtonSize/2;
    const radius = rotateButtonSize/3;
    
    // Draw circular arrow
    ctx.arc(centerX, centerY, radius, 0, 1.5 * Math.PI);
    ctx.moveTo(centerX + radius, centerY);
    ctx.lineTo(centerX + radius + 5, centerY - 5);
    ctx.moveTo(centerX + radius, centerY);
    ctx.lineTo(centerX + radius + 5, centerY + 5);
    ctx.stroke();

    // Draw hover text
    if (mousePosition && 
        mousePosition.x >= rotateButtonX && 
        mousePosition.x <= rotateButtonX + rotateButtonSize &&
        mousePosition.y >= rotateButtonY && 
        mousePosition.y <= rotateButtonY + rotateButtonSize) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText('Rotate Piece', rotateButtonX + rotateButtonSize + 5, rotateButtonY + rotateButtonSize/2 + 5);
    }
  }

  // Update scroll
  board.updateScroll();
}

function drawPieceInSelection(ctx: CanvasRenderingContext2D, piece: Piece, x: number) {
  const y = WINDOW_HEIGHT + TITLE_HEIGHT + 20;

  for (let row = 0; row < piece.height; row++) {
    for (let col = 0; col < piece.width; col++) {
      if (piece.shape[row][col]) {
        ctx.fillStyle = piece.color;
        ctx.fillRect(
          x + col * CELL_SIZE,
          y + row * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );
        ctx.strokeStyle = COLORS.GRID_COLOR;
        ctx.strokeRect(
          x + col * CELL_SIZE,
          y + row * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }
  }
}

function drawDraggedPiece(ctx: CanvasRenderingContext2D, board: Board) {
  if (!board.selectedPiece || !board.dragPos) return;

  const { x: mouseX, y: mouseY } = board.dragPos;
  const pieceWidth = board.selectedPiece.width * CELL_SIZE;
  const pieceHeight = board.selectedPiece.height * CELL_SIZE;
  
  // Calculate the exact position to center the piece on the cursor
  const startX = Math.round(mouseX - pieceWidth / 2);
  const startY = Math.round(mouseY - pieceHeight / 2);

  // Define board boundaries
  const boardLeft = PADDING;
  const boardRight = PADDING + WINDOW_WIDTH;
  const boardTop = TITLE_HEIGHT;
  const boardBottom = TITLE_HEIGHT + WINDOW_HEIGHT;

  // Check if mouse is within board boundaries
  const isOverBoard = (
    boardLeft <= mouseX && mouseX <= boardRight &&
    boardTop <= mouseY && mouseY <= boardBottom
  );

  // Draw the dragged piece with transparency
  ctx.globalAlpha = 0.5;
  for (let row = 0; row < board.selectedPiece.height; row++) {
    for (let col = 0; col < board.selectedPiece.width; col++) {
      if (board.selectedPiece.shape[row][col]) {
        const x = Math.round(startX + col * CELL_SIZE);
        const y = Math.round(startY + row * CELL_SIZE);
        ctx.fillStyle = board.selectedPiece.color;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }
  ctx.globalAlpha = 1.0;

  // Draw preview on board
  if (isOverBoard) {
    const gridX = Math.floor((startX - PADDING) / CELL_SIZE);
    const gridY = Math.floor((startY - TITLE_HEIGHT) / CELL_SIZE);
    const isValid = board.isValidPosition(board.selectedPiece, startX, startY);

    ctx.strokeStyle = isValid ? '#00FF00' : '#FF0000';
    ctx.lineWidth = 2;

    for (let row = 0; row < board.selectedPiece.height; row++) {
      for (let col = 0; col < board.selectedPiece.width; col++) {
        if (board.selectedPiece.shape[row][col]) {
          const x = (gridX + col) * CELL_SIZE + PADDING;
          const y = (gridY + row) * CELL_SIZE + TITLE_HEIGHT;
          if (x >= boardLeft && x < boardRight && y >= boardTop && y < boardBottom) {
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }
  }
}

function drawWinMessage(ctx: CanvasRenderingContext2D) {
  // Create semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT);

  // Draw win message
  ctx.font = '32px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText('Puzzle Complete!',
    WINDOW_WIDTH / 2,
    (WINDOW_HEIGHT + TITLE_HEIGHT) / 2 - 20);

  // Draw reset button
  const buttonWidth = 120;
  const buttonHeight = 40;
  const buttonX = (WINDOW_WIDTH - buttonWidth) / 2;
  const buttonY = (WINDOW_HEIGHT + TITLE_HEIGHT) / 2 + 20;

  // Draw button background
  ctx.fillStyle = COLORS.BUTTON_COLOR;
  ctx.beginPath();
  ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
  ctx.fill();

  // Draw button text
  ctx.font = '20px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Reset Game', 
    WINDOW_WIDTH / 2,
    buttonY + buttonHeight/2 + 6);
} 