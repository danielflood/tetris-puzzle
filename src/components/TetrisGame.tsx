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
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

// Add these new interfaces at the top of the file
interface CanvasLayers {
  static: HTMLCanvasElement;
  dynamic: HTMLCanvasElement;
}

interface CanvasContexts {
  static: CanvasRenderingContext2D | null;
  dynamic: CanvasRenderingContext2D | null;
}

interface PiecePosition {
  color: string;
  cells: [number, number][];
}

interface SolutionData {
  [key: number]: PiecePosition;
}

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<Board>(new Board());
  const refreshIconRef = useRef<HTMLImageElement | null>(null);
  const rotateIconRef = useRef<HTMLImageElement | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [scrollStartOffset, setScrollStartOffset] = useState(0);
  const lastRenderRef = useRef<number>(0);
  const isDirtyRef = useRef<boolean>(true);
  const { data: session } = useSession();
  const [hasSavedSolution, setHasSavedSolution] = useState(false);

  useEffect(() => {
    // Detect if we're on mobile
    setIsMobile('ontouchstart' in window);
    
    const staticCanvas = staticCanvasRef.current;
    const dynamicCanvas = dynamicCanvasRef.current;
    if (!staticCanvas || !dynamicCanvas) return;

    const staticCtx = staticCanvas.getContext('2d');
    const dynamicCtx = dynamicCanvas.getContext('2d');
    if (!staticCtx || !dynamicCtx) return;

    // Load refresh icon once
    const refreshIcon = new Image();
    refreshIcon.src = '/refresh.svg';
    refreshIcon.onload = () => {
      refreshIconRef.current = refreshIcon;
      isDirtyRef.current = true;
    };

    // Load rotate icon once
    const rotateIcon = new Image();
    rotateIcon.src = '/rotate_piece.svg';
    rotateIcon.onload = () => {
      rotateIconRef.current = rotateIcon;
      isDirtyRef.current = true;
    };

    // Calculate scale based on window size
    const updateScale = () => {
      if (!staticCanvas || !dynamicCanvas) return;
      
      const containerWidth = staticCanvas.parentElement?.clientWidth || window.innerWidth * 0.95;
      const containerHeight = staticCanvas.parentElement?.clientHeight || window.innerHeight * 0.95;
      
      const gameAspect = WINDOW_WIDTH / (WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT);
      const containerAspect = containerWidth / containerHeight;
      
      let newScale;
      if (containerAspect > gameAspect) {
        newScale = containerHeight / (WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT);
      } else {
        newScale = containerWidth / WINDOW_WIDTH;
      }
      
      // Apply scale to both canvases
      [staticCanvas, dynamicCanvas].forEach(canvas => {
        canvas.width = WINDOW_WIDTH;
        canvas.height = WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT;
        canvas.style.width = `${WINDOW_WIDTH * newScale}px`;
        canvas.style.height = `${(WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT) * newScale}px`;
      });
      
      isDirtyRef.current = true;
    };

    // Convert screen coordinates to canvas coordinates
    const getCanvasCoordinates = (clientX: number, clientY: number) => {
      const rect = staticCanvas.getBoundingClientRect();
      const scaleX = WINDOW_WIDTH / rect.width;
      const scaleY = (WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT) / rect.height;
      
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    // Add vibration feedback functions
    const vibrateSuccess = () => {
      if ('vibrate' in navigator) {
        navigator.vibrate(50); // Short success vibration
      }
    };

    const vibrateError = () => {
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 30, 30]); // Three quick error pulses
      }
    };

    // Add state for tracking the primary touch
    let lastDragPos = { x: 0, y: 0 };
    let isRotating = false;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      if (!staticCanvas) return;

      // If already dragging and a second finger touches, just rotate
      if (boardRef.current.dragging && boardRef.current.selectedPiece && e.touches.length === 2) {
        boardRef.current.selectedPiece.rotate();
        vibrateSuccess(); // Give feedback for rotation
        isDirtyRef.current = true;
        return;
      }

      // Only handle first touch for dragging/selection
      if (e.touches.length > 1) {
        return;
      }

      const touch = e.touches[0];
      const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);
      
      setMousePosition({ x, y });
      isDirtyRef.current = true;

      // Store the initial touch identifier for tracking
      const primaryTouchId = touch.identifier;

      // Define common button dimensions
      const buttonPadding = 10;
      const rotateButtonSize = 40;
      const resetButtonSize = 40;

      // Check rotate button first if piece is selected
      if (boardRef.current.selectedPiece) {
        const rotateButtonX = buttonPadding;
        const rotateButtonY = buttonPadding;
        
        if (x >= rotateButtonX && x <= rotateButtonX + rotateButtonSize &&
            y >= rotateButtonY && y <= rotateButtonY + rotateButtonSize) {
          boardRef.current.selectedPiece.rotate();
          isDirtyRef.current = true;
          return;
        }
      }

      // Check if touching scroll bar area
      const scrollBarHeight = 6;
      const scrollBarY = WINDOW_HEIGHT + TITLE_HEIGHT + SELECTION_HEIGHT - scrollBarHeight - 10;
      if (y >= scrollBarY - 10 && y <= scrollBarY + scrollBarHeight + 10) {
        setIsScrolling(true);
        setScrollStartX(x);
        setScrollStartOffset(boardRef.current.scrollOffset);
        return;
      }

      // If game is won, only allow clicking the reset button
      if (boardRef.current.hasWon) {
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonX = (WINDOW_WIDTH - buttonWidth) / 2;
        const buttonY = (WINDOW_HEIGHT + TITLE_HEIGHT) / 2 + 20;

        if (x >= buttonX && x <= buttonX + buttonWidth &&
            y >= buttonY && y <= buttonY + buttonHeight) {
          handleReset();
        }
        return;
      }

      // Check reset button
      const resetButtonX = WINDOW_WIDTH - resetButtonSize - buttonPadding;
      const resetButtonY = buttonPadding;
      
      if (x >= resetButtonX && x <= resetButtonX + resetButtonSize &&
          y >= resetButtonY && y <= resetButtonY + resetButtonSize) {
        boardRef.current.resetBoard();
        return;
      }

      // Rest of the touch handling only if game is not won
      if (!boardRef.current.hasWon) {
        // Handle piece selection with tap
        if (y >= TITLE_HEIGHT && y < WINDOW_HEIGHT + TITLE_HEIGHT) {
          const placedPiece = boardRef.current.getPlacedPieceAtPosition(x, y);
          if (placedPiece) {
            boardRef.current.selectedPiece = placedPiece;
            boardRef.current.dragPos = { x, y };
            boardRef.current.dragging = true;
            isDirtyRef.current = true;
            return;
          }
        }
        
        // Check for piece in selection area
        const piece = getPieceAtPosition(x, y);
        if (piece) {
          // If tapping a different piece, switch selection
          boardRef.current.selectedPiece = piece;
          boardRef.current.dragPos = { x, y };
          boardRef.current.dragging = true;
          isDirtyRef.current = true;
        } else if (!piece && y < WINDOW_HEIGHT + TITLE_HEIGHT && x >= PADDING && x <= WINDOW_WIDTH - PADDING) {
          // Only clear selection if tapping empty space on the board (not UI elements)
          boardRef.current.selectedPiece = null;
          isDirtyRef.current = true;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!staticCanvas || boardRef.current.hasWon) return;

      // Ignore move events with multiple touches
      if (e.touches.length > 1) return;

      const touch = e.touches[0];
      const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);
      
      // Check if touch started on rotate button
      const buttonPadding = 10;
      const rotateButtonSize = 40;
      const rotateButtonX = buttonPadding;
      const rotateButtonY = buttonPadding;
      
      if (x >= rotateButtonX && x <= rotateButtonX + rotateButtonSize &&
          y >= rotateButtonY && y <= rotateButtonY + rotateButtonSize) {
        return; // Don't move piece if touching rotate button
      }
      
      setMousePosition({ x, y });
      isDirtyRef.current = true;
      
      if (isScrolling) {
        const totalWidth = boardRef.current.availablePieces.reduce((width, piece) =>
          width + (piece.width + 1) * CELL_SIZE, 0) - CELL_SIZE;
        const maxScroll = Math.max(0, totalWidth - WINDOW_WIDTH + 2 * PADDING);
        
        const deltaX = x - scrollStartX;
        const scrollSensitivity = 2.5; // Increase scroll speed
        boardRef.current.scrollOffset = Math.max(0, Math.min(maxScroll, scrollStartOffset + deltaX * scrollSensitivity));
        boardRef.current.targetScroll = boardRef.current.scrollOffset;
        isDirtyRef.current = true;
        return;
      }
      
      if (boardRef.current.selectedPiece) {
        boardRef.current.dragging = true;
        boardRef.current.dragPos = { x, y };
        isDirtyRef.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      
      if (!staticCanvas || boardRef.current.hasWon) return;

      if (isScrolling) {
        setIsScrolling(false);
        return;
      }

      const touch = e.changedTouches[0];
      const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);

      if (boardRef.current.selectedPiece && boardRef.current.dragging) {
        let piecePlaced = false;
        
        if (y >= TITLE_HEIGHT && y < WINDOW_HEIGHT + TITLE_HEIGHT) {
          const pieceWidth = boardRef.current.selectedPiece.width * CELL_SIZE;
          const pieceHeight = boardRef.current.selectedPiece.height * CELL_SIZE;
          const gridX = Math.floor((x - PADDING - pieceWidth/2) / CELL_SIZE);
          const gridY = Math.floor((y - TITLE_HEIGHT - pieceHeight/2) / CELL_SIZE);
          const snapX = gridX * CELL_SIZE + PADDING;
          const snapY = gridY * CELL_SIZE + TITLE_HEIGHT;

          if (boardRef.current.isValidPosition(boardRef.current.selectedPiece, snapX, snapY)) {
            boardRef.current.placePiece(boardRef.current.selectedPiece, snapX, snapY);
            if (boardRef.current.availablePieces.includes(boardRef.current.selectedPiece)) {
              boardRef.current.availablePieces = boardRef.current.availablePieces.filter(
                p => p !== boardRef.current.selectedPiece
              );
              // Adjust scroll position when a piece is removed
              const totalWidth = boardRef.current.availablePieces.reduce((width, piece) =>
                width + (piece.width + 1) * CELL_SIZE, 0) - CELL_SIZE;
              const maxScroll = Math.max(0, totalWidth - WINDOW_WIDTH + 2 * PADDING);
              boardRef.current.scrollOffset = Math.min(boardRef.current.scrollOffset, maxScroll);
              boardRef.current.targetScroll = boardRef.current.scrollOffset;
            }
            piecePlaced = true;
            vibrateSuccess(); // Vibrate on successful placement

            if (boardRef.current.checkWin()) {
              boardRef.current.hasWon = true;
            }
            // Only clear selection if piece was successfully placed
            boardRef.current.selectedPiece = null;
          } else {
            vibrateError(); // Vibrate on invalid placement attempt
          }
        }

        const selectedPiece = boardRef.current.selectedPiece;
        if (!piecePlaced && selectedPiece && !boardRef.current.availablePieces.includes(selectedPiece)) {
          boardRef.current.availablePieces.push(selectedPiece);
        }

        // Only clear dragging state and dragPos, maintain selection for rotation
        boardRef.current.dragging = false;
        boardRef.current.dragPos = null;
        isDirtyRef.current = true;
      }
    };

    // Game loop with optimized rendering
    const render = (timestamp: number) => {
      const delta = timestamp - lastRenderRef.current;
      const fps = 60;
      const frameInterval = 1000 / fps;
      
      if (delta >= frameInterval) {
        if (isDirtyRef.current) {
          // Clear both canvases
          staticCtx.clearRect(0, 0, staticCanvas.width, staticCanvas.height);
          dynamicCtx.clearRect(0, 0, dynamicCanvas.width, dynamicCanvas.height);

          // Draw static elements (board, UI) on static canvas
          drawStaticElements(staticCtx, boardRef.current, refreshIconRef.current, rotateIconRef.current);
          
          // Draw dynamic elements (dragged pieces, hover effects) on dynamic canvas
          drawDynamicElements(dynamicCtx, boardRef.current, mousePosition);
          
          isDirtyRef.current = false;
        }
        lastRenderRef.current = timestamp - (delta % frameInterval);
      }
      
      animationFrameId = requestAnimationFrame(render);
    };

    let animationFrameId = requestAnimationFrame(render);

    // Add event listeners
    window.addEventListener('resize', updateScale);

    // Mouse event handlers
    const handleMouseDown = (e: MouseEvent) => {
      if (!staticCanvas) return;
      
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      setMousePosition({ x, y });
      isDirtyRef.current = true;

      // Handle right click rotation while dragging
      if (e.button === 2) {
        e.preventDefault();
        if (boardRef.current.dragging && boardRef.current.selectedPiece) {
          boardRef.current.selectedPiece.rotate();
          isDirtyRef.current = true;
          return;
        }
        // Try to get piece at clicked position and rotate it (no picking up)
        const piece = getPieceAtPosition(x, y);
        if (piece) {
          piece.rotate();
          isDirtyRef.current = true;
        }
        return;
      }
      
      // Check if reset button was clicked (before win check)
      const resetButtonSize = 40;
      const resetButtonPadding = 10;
      const resetButtonX = WINDOW_WIDTH - resetButtonSize - resetButtonPadding;
      const resetButtonY = resetButtonPadding;
      
      if (x >= resetButtonX && x <= resetButtonX + resetButtonSize &&
          y >= resetButtonY && y <= resetButtonY + resetButtonSize) {
        handleReset();
        return;
      }
      
      if (boardRef.current.hasWon) {
        // Check if reset button was clicked
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonX = (WINDOW_WIDTH - buttonWidth) / 2;
        const buttonY = (WINDOW_HEIGHT + TITLE_HEIGHT) / 2 + 20;

        if (x >= buttonX && x <= buttonX + buttonWidth &&
            y >= buttonY && y <= buttonY + buttonHeight) {
          handleReset();
        }
        return;
      }
      
      if (e.button === 0) { // Left click
        // First try to pick up a placed piece from the board
        if (y >= TITLE_HEIGHT && y < WINDOW_HEIGHT + TITLE_HEIGHT) {
          const placedPiece = boardRef.current.getPlacedPieceAtPosition(x, y);
          if (placedPiece) {
            boardRef.current.selectedPiece = placedPiece;
            boardRef.current.dragging = true;
            boardRef.current.dragPos = { x, y };
            isDirtyRef.current = true;
            return;
          }
        }
        
        // If no placed piece was clicked, try to select from available pieces
        const piece = getPieceAtPosition(x, y);
        if (piece && !boardRef.current.hasWon) {
          boardRef.current.selectedPiece = piece;
          boardRef.current.dragging = true;
          boardRef.current.dragPos = { x, y };
          isDirtyRef.current = true;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!staticCanvas || !boardRef.current.dragging) return;
      
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      setMousePosition({ x, y });
      boardRef.current.dragPos = { x, y };
      isDirtyRef.current = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Only handle left mouse button releases
      if (e.button !== 0) return;
      if (!staticCanvas || !boardRef.current.dragging || !boardRef.current.selectedPiece || boardRef.current.hasWon) return;
      
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      let piecePlaced = false;
      
      // Try to place piece on board
      if (y >= TITLE_HEIGHT && y < WINDOW_HEIGHT + TITLE_HEIGHT) {
        const pieceWidth = boardRef.current.selectedPiece.width * CELL_SIZE;
        const pieceHeight = boardRef.current.selectedPiece.height * CELL_SIZE;
        const gridX = Math.floor((x - PADDING - pieceWidth/2) / CELL_SIZE);
        const gridY = Math.floor((y - TITLE_HEIGHT - pieceHeight/2) / CELL_SIZE);
        const snapX = gridX * CELL_SIZE + PADDING;
        const snapY = gridY * CELL_SIZE + TITLE_HEIGHT;

        if (boardRef.current.isValidPosition(boardRef.current.selectedPiece, snapX, snapY)) {
          boardRef.current.placePiece(boardRef.current.selectedPiece, snapX, snapY);
          if (boardRef.current.availablePieces.includes(boardRef.current.selectedPiece)) {
            boardRef.current.availablePieces = boardRef.current.availablePieces.filter(
              p => p !== boardRef.current.selectedPiece
            );
            // Adjust scroll position when a piece is removed
            const totalWidth = boardRef.current.availablePieces.reduce((width, piece) =>
              width + (piece.width + 1) * CELL_SIZE, 0) - CELL_SIZE;
            const maxScroll = Math.max(0, totalWidth - WINDOW_WIDTH + 2 * PADDING);
            boardRef.current.scrollOffset = Math.min(boardRef.current.scrollOffset, maxScroll);
            boardRef.current.targetScroll = boardRef.current.scrollOffset;
          }
          piecePlaced = true;

          if (boardRef.current.checkWin()) {
            boardRef.current.hasWon = true;
          }
        }
      }

      // If piece wasn't placed successfully and it wasn't from available pieces,
      // add it back to available pieces
      const selectedPiece = boardRef.current.selectedPiece;
      if (!piecePlaced && selectedPiece && !boardRef.current.availablePieces.includes(selectedPiece)) {
        boardRef.current.availablePieces.push(selectedPiece);
      }

      // Always clear dragging and selection state
      boardRef.current.dragging = false;
      boardRef.current.selectedPiece = null;
      boardRef.current.dragPos = null;
      isDirtyRef.current = true;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!boardRef.current.dragging && !boardRef.current.hasWon) {
        const totalWidth = boardRef.current.availablePieces.reduce((width, piece) =>
          width + (piece.width + 1) * CELL_SIZE, 0) - CELL_SIZE;
        const maxScroll = Math.max(0, totalWidth - WINDOW_WIDTH + 2 * PADDING);
        
        if (e.deltaY < 0) {
          boardRef.current.scrollOffset = Math.max(0, boardRef.current.scrollOffset - CELL_SIZE * 2);
        } else {
          boardRef.current.scrollOffset = Math.min(boardRef.current.scrollOffset + CELL_SIZE * 2, maxScroll);
        }
        boardRef.current.targetScroll = boardRef.current.scrollOffset;
        isDirtyRef.current = true;
      }
    };

    // Add event listeners to both canvases
    [staticCanvas, dynamicCanvas].forEach(canvas => {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    
    // Add global mouse up handler
    window.addEventListener('mouseup', handleMouseUp);
    
    updateScale();

    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('mouseup', handleMouseUp);
      
      [staticCanvas, dynamicCanvas].forEach(canvas => {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('wheel', handleWheel);
        canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
      });
      
      cancelAnimationFrame(animationFrameId);
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

  // Update win check to save solution
  useEffect(() => {
    const board = boardRef.current;
    if (board.hasWon && !hasSavedSolution) {
      saveSolution();
      setHasSavedSolution(true);
    }
  }, [boardRef.current.hasWon]);

  // Add reset handler to clear saved state
  const handleReset = () => {
    boardRef.current.resetBoard();
    setHasSavedSolution(false);
    isDirtyRef.current = true;
  };

  // Update the saveSolution function to capture the correct positions
  const saveSolution = async () => {
    if (!session?.user) {
      return;
    }

    // Create a 2D grid representation of the board
    const boardState = Array(boardRef.current.grid.length).fill(null)
      .map(() => Array(boardRef.current.grid[0].length).fill(null));

    // Map each piece to a number and its color
    const pieceColorMap = new Map();
    boardRef.current.placedPieces.forEach((piece, index) => {
      pieceColorMap.set(piece.color, index + 1); // +1 so 0 can represent empty cells
    });

    // Fill the board state with piece numbers
    for (let row = 0; row < boardRef.current.grid.length; row++) {
      for (let col = 0; col < boardRef.current.grid[0].length; col++) {
        const cellColor = boardRef.current.grid[row][col];
        boardState[row][col] = cellColor ? pieceColorMap.get(cellColor) : 0;
      }
    }

    try {
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          boardState,
          colorMap: Object.fromEntries([...pieceColorMap.entries()].map(([color, num]) => [num, color]))
        }),
      });

      if (!response.ok) {
        return;
      }
    } catch (error) {
      // Silently fail - no need to show error to user for solution saving
      return;
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
      <div className="absolute top-4 right-4 flex gap-4 items-center">
        {session ? (
          <>
            <span className="text-white">
              {session.user.name}
            </span>
            <Link 
              href="/solutions" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              My Solutions
            </Link>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={() => signIn('google')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sign In
          </button>
        )}
      </div>
      
      <div 
        className="relative" 
        style={{ 
          width: `${WINDOW_WIDTH}px`,
          height: `${WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT}px`,
          maxWidth: '95vw',
          maxHeight: '95vh'
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas
          ref={staticCanvasRef}
          width={WINDOW_WIDTH}
          height={WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT}
          className="absolute inset-0 w-full h-full border-2 border-gray-700 rounded-lg shadow-lg touch-none"
          onContextMenu={(e) => e.preventDefault()}
        />
        <canvas
          ref={dynamicCanvasRef}
          width={WINDOW_WIDTH}
          height={WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT}
          className="absolute inset-0 w-full h-full touch-none"
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
}

// Split the drawing functions
function drawStaticElements(
  ctx: CanvasRenderingContext2D,
  board: Board,
  refreshIcon: HTMLImageElement | null,
  rotateIcon: HTMLImageElement | null
) {
  // Fill background
  ctx.fillStyle = COLORS.BG_COLOR;
  ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT + SELECTION_HEIGHT + TITLE_HEIGHT);

  // Draw reset button in top-right corner
  const resetButtonSize = 40;
  const resetButtonPadding = 10;
  const resetButtonX = WINDOW_WIDTH - resetButtonSize - resetButtonPadding;
  const resetButtonY = resetButtonPadding;

  // Draw circular background for reset button
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
      resetButtonX + resetButtonSize/8,
      resetButtonY + resetButtonSize/8,
      resetButtonSize * 3/4,
      resetButtonSize * 3/4
    );
    ctx.restore();
  }

  // Draw title
  ctx.font = '40px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText('TETRIS', WINDOW_WIDTH / 2, TITLE_HEIGHT / 2 + 15);

  // Draw board grid and placed pieces
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

  // Draw selection area background
  ctx.fillStyle = '#282828';
  ctx.fillRect(0, WINDOW_HEIGHT + TITLE_HEIGHT, WINDOW_WIDTH, SELECTION_HEIGHT);
  ctx.strokeStyle = COLORS.GRID_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, WINDOW_HEIGHT + TITLE_HEIGHT);
  ctx.lineTo(WINDOW_WIDTH, WINDOW_HEIGHT + TITLE_HEIGHT);
  ctx.stroke();

  // Draw available pieces (if not being dragged)
  let pieceX = PADDING - board.scrollOffset;
  for (const piece of board.availablePieces) {
    if (piece !== board.selectedPiece || !board.dragging) {
      drawPieceInSelection(ctx, piece, pieceX, board);
    }
    pieceX += (piece.width + 1) * CELL_SIZE;
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

    // Draw rotate icon if loaded
    if (rotateIcon) {
      ctx.save();
      ctx.filter = 'brightness(0) invert(1)';
      ctx.drawImage(
        rotateIcon,
        rotateButtonX + rotateButtonSize/4,
        rotateButtonY + rotateButtonSize/4,
        rotateButtonSize/2,
        rotateButtonSize/2
      );
      ctx.restore();
    }
  }

  // Draw scroll bar for mobile
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    const scrollBarHeight = 6;
    const scrollBarY = WINDOW_HEIGHT + TITLE_HEIGHT + SELECTION_HEIGHT - scrollBarHeight - 10;
    const totalWidth = board.availablePieces.reduce((width, piece) =>
      width + (piece.width + 1) * CELL_SIZE, 0) - CELL_SIZE;
    
    // Draw scroll bar background
    ctx.fillStyle = '#444444';
    ctx.fillRect(PADDING, scrollBarY, WINDOW_WIDTH - 2 * PADDING, scrollBarHeight);
    
    // Calculate and draw scroll handle
    const maxScroll = Math.max(0, totalWidth - WINDOW_WIDTH + 2 * PADDING);
    if (maxScroll > 0) {
      const handleWidth = Math.max(40, (WINDOW_WIDTH - 2 * PADDING) * (WINDOW_WIDTH / totalWidth));
      const scrollProgress = board.scrollOffset / maxScroll;
      const handleX = PADDING + scrollProgress * ((WINDOW_WIDTH - 2 * PADDING) - handleWidth);
      
      ctx.fillStyle = '#888888';
      ctx.beginPath();
      ctx.roundRect(handleX, scrollBarY, handleWidth, scrollBarHeight, 3);
      ctx.fill();
    }
  }
}

function drawDynamicElements(
  ctx: CanvasRenderingContext2D,
  board: Board,
  mousePosition: { x: number, y: number } | null
) {
  // Draw dragged piece
  if (board.dragging && board.selectedPiece && board.dragPos) {
    const { x: mouseX, y: mouseY } = board.dragPos;
    const pieceWidth = board.selectedPiece.width * CELL_SIZE;
    const pieceHeight = board.selectedPiece.height * CELL_SIZE;
    
    // Calculate the exact position to center the piece on the cursor
    const startX = Math.round(mouseX - pieceWidth / 2);
    const startY = Math.round(mouseY - pieceHeight / 2);

    // Define board boundaries
    const boardLeft = PADDING;
    const boardRight = WINDOW_WIDTH - PADDING;
    const boardTop = TITLE_HEIGHT;
    const boardBottom = TITLE_HEIGHT + WINDOW_HEIGHT;

    // Check if mouse is within board boundaries
    const isOverBoard = (
      mouseY >= boardTop && mouseY <= boardBottom &&
      mouseX >= boardLeft && mouseX <= boardRight
    );

    // Draw the dragged piece with transparency
    ctx.globalAlpha = 0.7;
    for (let row = 0; row < board.selectedPiece.height; row++) {
      for (let col = 0; col < board.selectedPiece.width; col++) {
        if (board.selectedPiece.shape[row][col]) {
          const x = Math.round(startX + col * CELL_SIZE);
          const y = Math.round(startY + row * CELL_SIZE);
          ctx.fillStyle = board.selectedPiece.color;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = COLORS.GRID_COLOR;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }
    }
    ctx.globalAlpha = 1.0;

    // Draw preview on board
    if (isOverBoard) {
      const gridX = Math.floor((mouseX - PADDING - pieceWidth/2) / CELL_SIZE);
      const gridY = Math.floor((mouseY - TITLE_HEIGHT - pieceHeight/2) / CELL_SIZE);
      const snapX = gridX * CELL_SIZE + PADDING;
      const snapY = gridY * CELL_SIZE + TITLE_HEIGHT;
      
      const isValid = board.isValidPosition(board.selectedPiece, snapX, snapY);

      ctx.strokeStyle = isValid ? '#00FF00' : '#FF0000';
      ctx.lineWidth = 2;

      for (let row = 0; row < board.selectedPiece.height; row++) {
        for (let col = 0; col < board.selectedPiece.width; col++) {
          if (board.selectedPiece.shape[row][col]) {
            const x = gridX * CELL_SIZE + PADDING + col * CELL_SIZE;
            const y = gridY * CELL_SIZE + TITLE_HEIGHT + row * CELL_SIZE;
            if (x >= boardLeft && x < boardRight && y >= boardTop && y < boardBottom) {
              ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
          }
        }
      }
    }
  }

  // Draw win message if game is won
  if (board.hasWon) {
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
}

function drawPieceInSelection(ctx: CanvasRenderingContext2D, piece: Piece, x: number, board: Board) {
  const y = WINDOW_HEIGHT + TITLE_HEIGHT + 20;
  const isSelected = board.selectedPiece === piece;

  for (let row = 0; row < piece.height; row++) {
    for (let col = 0; col < piece.width; col++) {
      if (piece.shape[row][col]) {
        // Brighten the color if the piece is selected
        if (isSelected) {
          ctx.fillStyle = adjustBrightness(piece.color, 1.3);
        } else {
          ctx.fillStyle = piece.color;
        }
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

function adjustBrightness(color: string, factor: number): string {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Adjust brightness
  const adjustedR = Math.min(255, Math.round(r * factor));
  const adjustedG = Math.min(255, Math.round(g * factor));
  const adjustedB = Math.min(255, Math.round(b * factor));

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(adjustedR)}${toHex(adjustedG)}${toHex(adjustedB)}`;
} 