'use client';

import { useState, useEffect } from 'react';
import ProtectedTransfer from '../../src/components/ProtectedTransfer';

interface ContractInfo {
  address: string;
  network: string;
  verified: boolean;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
  treasury?: string;
  founder?: string;
}

export default function TokenPage() {
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProtectedTransfer, setShowProtectedTransfer] = useState(false);

  useEffect(() => {
    fetchContractInfo();
  }, []);

  const fetchContractInfo = async () => {
    try {
      const response = await fetch('/api/contract');
      if (!response.ok) {
        throw new Error('Failed to fetch contract info');
      }
      const data = await response.json();
      setContractInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const addToMetaMask = async () => {
    if (!contractInfo || typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask not detected');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: [{
          type: 'ERC20',
          options: {
            address: contractInfo.address,
            symbol: contractInfo.symbol || 'FIA',
            decimals: contractInfo.decimals || 18,
          },
        }],
      });
    } catch (error) {
      console.error('Error adding token to MetaMask:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading contract information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={fetchContractInfo}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              FIA Token Details
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Complete information about the Finger In Ass Coin contract
          </p>
        </div>

        {contractInfo ? (
          <div className="space-y-8">
            {/* Contract Status */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Contract Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Contract Address
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-800 px-3 py-2 rounded text-sm font-mono break-all">
                      {contractInfo.address}
                    </code>
                    <button
                      onClick={() => copyToClipboard(contractInfo.address)}
                      className="text-purple-400 hover:text-purple-300"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Verification Status
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      contractInfo.verified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {contractInfo.verified ? '✅ Verified' : '⏳ Pending'}
                    </span>
                    <a
                      href={`https://sepolia.basescan.org/address/${contractInfo.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      View on BaseScan →
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Information */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Token Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Name
                  </label>
                  <p className="text-lg font-semibold">{contractInfo.name || 'Finger In Ass'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Symbol
                  </label>
                  <p className="text-lg font-semibold">{contractInfo.symbol || 'FIA'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Decimals
                  </label>
                  <p className="text-lg font-semibold">{contractInfo.decimals || 18}</p>
                </div>
              </div>
            </div>

            {/* Tokenomics */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Tokenomics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Supply Distribution</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Supply:</span>
                      <span className="font-semibold">1,000,000,000 FIA</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Founder (10%):</span>
                      <span className="font-semibold">100,000,000 FIA</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Treasury (10%):</span>
                      <span className="font-semibold">100,000,000 FIA</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Airdrop (30%):</span>
                      <span className="font-semibold">300,000,000 FIA</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Liquidity Pool (50%):</span>
                      <span className="font-semibold">500,000,000 FIA</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Transaction Fees</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Fee:</span>
                      <span className="font-semibold">1.0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>To Treasury:</span>
                      <span className="font-semibold">0.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>To Founder:</span>
                      <span className="font-semibold">0.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Burned:</span>
                      <span className="font-semibold">0.3%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Actions</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={addToMetaMask}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Add to MetaMask
                </button>
                <button
                  onClick={() => setShowProtectedTransfer(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  🛡️ Protected Transfer
                </button>
                <a
                  href={`https://sepolia.basescan.org/address/${contractInfo.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors text-center"
                >
                  View on BaseScan
                </a>
                <a
                  href={`https://sepolia.basescan.org/token/${contractInfo.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors text-center"
                >
                  Token Holders
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">Contract not yet deployed</p>
          </div>
        )}

        {/* Protected Transfer Modal */}
        <ProtectedTransfer
          isOpen={showProtectedTransfer}
          onClose={() => setShowProtectedTransfer(false)}
          onSuccess={() => {
            // Optionally refresh contract info or show success message
            console.log('Protected transfer successful');
          }}
        />
      </div>
    </div>
  );
}