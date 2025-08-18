'use client';

import { useState, useEffect } from 'react';

interface FingeredEvent {
  id?: number;
  blockNumber: number;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  timestamp: number;
}

export default function MonitorPage() {
  const [events, setEvents] = useState<FingeredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialEvents = async () => {
      await fetchEvents();
    };
    loadInitialEvents();

    // Set up polling for new events every 10 seconds
    const interval = setInterval(fetchEvents, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    } else {
      return num.toFixed(6);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    if (timestamp === 0) return 'Unknown';
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Live Event Monitor
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Real-time fingering events from the FIA contract
          </p>
        </div>

        {/* Status */}
        <div className="bg-gray-900 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
              <span className="text-sm font-medium">
                {error ? 'Connection Error' : 'Live Monitor Active'}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Auto-refresh every 10 seconds
            </div>
          </div>
        </div>

        {/* Events */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading events...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">Error: {error}</p>
            <button
              onClick={fetchEvents}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👆</div>
            <p className="text-gray-400 text-lg mb-4">
              No fingering events yet
            </p>
            <p className="text-gray-500">
              Events will appear here once the contract is deployed and used.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <div
                key={`${event.txHash}-${event.from}-${event.to}-${index}`}
                className="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">👆</span>
                      <h3 className="text-lg font-semibold text-white">Fingering Event</h3>
                      <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded-full">
                        Block #{event.blockNumber}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">From:</span>
                        <div className="font-mono">
                          <a
                            href={`https://sepolia.basescan.org/address/${event.from}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300"
                          >
                            {shortenAddress(event.from)}
                          </a>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-400">To:</span>
                        <div className="font-mono">
                          <a
                            href={`https://sepolia.basescan.org/address/${event.to}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300"
                          >
                            {shortenAddress(event.to)}
                          </a>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-400">Amount:</span>
                        <div className="font-semibold text-white">
                          {formatNumber(event.amount)} FIA
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 md:mt-0 md:ml-4 text-right">
                    <div className="text-sm text-gray-400 mb-1">
                      {formatTime(event.timestamp)}
                    </div>
                    <a
                      href={`https://sepolia.basescan.org/tx/${event.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                    >
                      View TX →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}