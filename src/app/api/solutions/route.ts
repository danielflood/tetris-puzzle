import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { boardState, colorMap } = await request.json();
    
    const solution = await prisma.solution.create({
      data: {
        piecePositions: {
          boardState,
          colorMap
        },
        user: {
          connect: {
            id: session.user.id
          }
        }
      },
    });

    return NextResponse.json(solution);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save solution" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const solutions = await prisma.solution.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ solutions });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch solutions", solutions: [] },
      { status: 500 }
    );
  }
} 