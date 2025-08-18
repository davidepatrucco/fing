#!/usr/bin/env node

import { config } from 'dotenv';
import { blockchainService } from '../lib/blockchain.js';
import { getDatabase } from '../lib/database.js';

config();

class EventIndexer {
  private db;
  private contractAddress: string;
  private indexInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.db = getDatabase();
    this.contractAddress = process.env.NEXT_PUBLIC_FIA_CONTRACT_ADDRESS || '';
    
    if (!this.contractAddress) {
      console.error('Error: NEXT_PUBLIC_FIA_CONTRACT_ADDRESS environment variable is required');
      process.exit(1);
    }
  }

  async indexEvents(fromBlock: number = 0, toBlock: number | string = 'latest') {
    try {
      console.log(`Indexing events from block ${fromBlock} to ${toBlock}...`);
      
      const events = await blockchainService.getFingeredEvents(
        this.contractAddress,
        fromBlock,
        toBlock
      );

      console.log(`Found ${events.length} events`);

      for (const event of events) {
        // Get block timestamp if not available
        if (event.timestamp === 0) {
          event.timestamp = await blockchainService.getBlockTimestamp(event.blockNumber);
        }

        await this.db.insertEvent({
          blockNumber: event.blockNumber,
          txHash: event.txHash,
          from: event.from,
          to: event.to,
          amount: event.amount,
          timestamp: event.timestamp
        });
      }

      console.log(`Successfully indexed ${events.length} events`);
    } catch (error) {
      console.error('Error indexing events:', error);
    }
  }

  async getLastIndexedBlock(): Promise<number> {
    try {
      const events = await this.db.getEvents(1);
      return events.length > 0 ? events[0].blockNumber : 0;
    } catch {
      return 0;
    }
  }

  async startWatching(intervalMs: number = 30000) {
    console.log(`Starting event watcher (checking every ${intervalMs}ms)...`);
    
    // Initial index
    const lastBlock = await this.getLastIndexedBlock();
    await this.indexEvents(lastBlock);

    // Set up interval
    this.indexInterval = setInterval(async () => {
      const lastIndexed = await this.getLastIndexedBlock();
      const currentBlock = await blockchainService.getCurrentBlockNumber();
      
      if (currentBlock > lastIndexed) {
        console.log(`New blocks detected (${lastIndexed} -> ${currentBlock})`);
        await this.indexEvents(lastIndexed + 1, currentBlock);
      }
    }, intervalMs);
  }

  stop() {
    if (this.indexInterval) {
      clearInterval(this.indexInterval);
      this.indexInterval = null;
    }
    this.db.close();
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'watch';

  const indexer = new EventIndexer();

  switch (command) {
    case 'index':
      const fromBlock = parseInt(args[1]) || 0;
      const toBlock = args[2] === 'latest' ? 'latest' : parseInt(args[2]) || 'latest';
      await indexer.indexEvents(fromBlock, toBlock);
      process.exit(0);
      break;

    case 'watch':
      const interval = parseInt(args[1]) || 30000;
      await indexer.startWatching(interval);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\nShutting down indexer...');
        indexer.stop();
        process.exit(0);
      });
      break;

    default:
      console.log('Usage:');
      console.log('  node indexer.js index [fromBlock] [toBlock]  - Index events from specific block range');
      console.log('  node indexer.js watch [intervalMs]           - Watch for new events (default: 30s)');
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { EventIndexer };