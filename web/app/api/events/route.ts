import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const fromBlock = searchParams.get('fromBlock') ? parseInt(searchParams.get('fromBlock')!) : undefined;
    const toBlock = searchParams.get('toBlock') ? parseInt(searchParams.get('toBlock')!) : undefined;

    const db = getDatabase();
    const events = await db.getEvents(limit, fromBlock, toBlock);
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}