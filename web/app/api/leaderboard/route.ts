import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const fromBlock = searchParams.get('fromBlock') ? parseInt(searchParams.get('fromBlock')!) : undefined;
    const toBlock = searchParams.get('toBlock') ? parseInt(searchParams.get('toBlock')!) : undefined;

    const db = getDatabase();
    const leaderboard = await db.getLeaderboard(limit, fromBlock, toBlock);
    
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}