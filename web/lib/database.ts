import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'events.db');

export interface FingeredEvent {
  id?: number;
  blockNumber: number;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  timestamp: number;
}

export interface LeaderboardItem {
  address: string;
  given: string;
  received: string;
}

class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  private init() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS fingered_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          blockNumber INTEGER NOT NULL,
          txHash TEXT NOT NULL,
          "from" TEXT NOT NULL,
          "to" TEXT NOT NULL,
          amount TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          UNIQUE(txHash, "from", "to", amount)
        )
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_block_number ON fingered_events(blockNumber);
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_from ON fingered_events("from");
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_to ON fingered_events("to");
      `);
    });
  }

  async insertEvent(event: FingeredEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR IGNORE INTO fingered_events (blockNumber, txHash, "from", "to", amount, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [event.blockNumber, event.txHash, event.from, event.to, event.amount, event.timestamp],
        function(err: Error | null) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getEvents(limit: number = 100, fromBlock?: number, toBlock?: number): Promise<FingeredEvent[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM fingered_events';
      const params: (string | number)[] = [];

      if (fromBlock !== undefined || toBlock !== undefined) {
        query += ' WHERE ';
        const conditions: string[] = [];
        
        if (fromBlock !== undefined) {
          conditions.push('blockNumber >= ?');
          params.push(fromBlock);
        }
        
        if (toBlock !== undefined) {
          conditions.push('blockNumber <= ?');
          params.push(toBlock);
        }
        
        query += conditions.join(' AND ');
      }

      query += ' ORDER BY blockNumber DESC, id DESC LIMIT ?';
      params.push(limit);

      this.db.all(query, params, (err: Error | null, rows: FingeredEvent[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getLeaderboard(limit: number = 50, fromBlock?: number, toBlock?: number): Promise<LeaderboardItem[]> {
    return new Promise((resolve, reject) => {
      let whereClause = '';
      const params: (string | number)[] = [];

      if (fromBlock !== undefined || toBlock !== undefined) {
        whereClause = ' WHERE ';
        const conditions: string[] = [];
        
        if (fromBlock !== undefined) {
          conditions.push('blockNumber >= ?');
          params.push(fromBlock);
        }
        
        if (toBlock !== undefined) {
          conditions.push('blockNumber <= ?');
          params.push(toBlock);
        }
        
        whereClause += conditions.join(' AND ');
      }

      const query = `
        WITH given_totals AS (
          SELECT "from" as address, SUM(CAST(amount AS REAL)) as given
          FROM fingered_events${whereClause}
          GROUP BY "from"
        ),
        received_totals AS (
          SELECT "to" as address, SUM(CAST(amount AS REAL)) as received
          FROM fingered_events${whereClause}
          GROUP BY "to"
        ),
        all_addresses AS (
          SELECT address FROM given_totals
          UNION
          SELECT address FROM received_totals
        )
        SELECT 
          a.address,
          COALESCE(g.given, 0) as given,
          COALESCE(r.received, 0) as received
        FROM all_addresses a
        LEFT JOIN given_totals g ON a.address = g.address
        LEFT JOIN received_totals r ON a.address = r.address
        ORDER BY (COALESCE(g.given, 0) + COALESCE(r.received, 0)) DESC
        LIMIT ?
      `;

      params.push(limit);

      this.db.all(query, params, (err: Error | null, rows: Array<{address: string; given: number; received: number}>) => {
        if (err) reject(err);
        else resolve(rows.map(row => ({
          address: row.address,
          given: row.given.toString(),
          received: row.received.toString()
        })));
      });
    });
  }

  close() {
    this.db.close();
  }
}

let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}