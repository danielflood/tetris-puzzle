'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { CELL_SIZE, COLORS } from '@/utils/constants';

interface Solution {
  id: string;
  createdAt: string;
  piecePositions: {
    boardState: number[][];
    colorMap: { [key: number]: string };
  };
}

const SOLUTION_CANVAS_SIZE = 300;
const SOLUTION_CELL_SIZE = 40;
const SOLUTION_PADDING = 30;
const GRID_SIZE = { width: 5, height: 6 };

export default function SolutionsGallery() {
  const { data: session, status } = useSession();
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/solutions')
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error);
            setSolutions([]);
          } else {
            setSolutions(data.solutions || []);
          }
        })
        .catch(error => {
          setError('Failed to fetch solutions');
          setSolutions([]);
        });
    }
  }, [status]);

  function drawSolution(ctx: CanvasRenderingContext2D, solution: Solution) {
    // Clear the canvas
    ctx.clearRect(0, 0, SOLUTION_CANVAS_SIZE, SOLUTION_CANVAS_SIZE);
    
    // Draw background
    ctx.fillStyle = COLORS.BG_COLOR;
    ctx.fillRect(0, 0, SOLUTION_CANVAS_SIZE, SOLUTION_CANVAS_SIZE);

    // Calculate cell size to fit the grid with padding
    const cellSize = Math.min(
      (SOLUTION_CANVAS_SIZE - 2 * SOLUTION_PADDING) / GRID_SIZE.width,
      (SOLUTION_CANVAS_SIZE - 2 * SOLUTION_PADDING) / GRID_SIZE.height
    );

    // Calculate extra padding to center the grid
    const totalWidth = GRID_SIZE.width * cellSize;
    const totalHeight = GRID_SIZE.height * cellSize;
    const extraPaddingX = (SOLUTION_CANVAS_SIZE - totalWidth) / 2;
    const extraPaddingY = (SOLUTION_CANVAS_SIZE - totalHeight) / 2;

    // Draw each cell
    const { boardState, colorMap } = solution.piecePositions;
    for (let row = 0; row < boardState.length; row++) {
      for (let col = 0; col < boardState[0].length; col++) {
        // Skip the top corners
        if (row === 0 && (col === 0 || col === boardState[0].length - 1)) continue;
        
        const pieceNumber = boardState[row][col];
        const x = extraPaddingX + col * cellSize;
        const y = extraPaddingY + row * cellSize;

        // Draw the cell
        ctx.fillStyle = pieceNumber > 0 ? colorMap[pieceNumber] : COLORS.EMPTY_COLOR;
        ctx.fillRect(x, y, cellSize, cellSize);
        
        // Draw cell border
        ctx.strokeStyle = COLORS.GRID_COLOR;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }
  }

  if (status === 'loading') {
    return <div className="p-4">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-4">
        <p>Please sign in to view your solutions.</p>
        <Link href="/" className="text-blue-500 hover:underline">
          Go to Home
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-500">{error}</p>
        <Link href="/" className="text-blue-500 hover:underline">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Solutions</h1>
        <Link href="/" className="text-blue-500 hover:underline">
          Back to Game
        </Link>
      </div>

      {solutions.length === 0 ? (
        <p>No solutions found. Complete a puzzle to see it here!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solutions.map((solution) => (
            <div
              key={solution.id}
              className="bg-gray-800 p-4 rounded-lg shadow-lg"
            >
              <div className="mb-2 text-sm text-gray-400">
                {new Date(solution.createdAt).toLocaleString()}
              </div>
              <canvas
                width={SOLUTION_CANVAS_SIZE}
                height={SOLUTION_CANVAS_SIZE}
                ref={(canvas) => {
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      drawSolution(ctx, solution);
                    }
                  }
                }}
                className="w-full h-auto"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 