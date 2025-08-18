import { NextResponse } from 'next/server';
import { blockchainService } from '@/lib/blockchain';

export async function GET() {
  try {
    const contractAddress = process.env.NEXT_PUBLIC_FIA_CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract address not configured' },
        { status: 500 }
      );
    }

    const contractInfo = await blockchainService.getContractInfo(contractAddress);
    
    return NextResponse.json(contractInfo);
  } catch (error) {
    console.error('Error fetching contract info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contract information' },
      { status: 500 }
    );
  }
}