'use client';

import { useState } from 'react';
import { useWallet } from '../../../src/hooks/useWallet';

// Feature flag check
const isDevToolsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true';

interface Pool {
  name: string;
  apy: string;
  liquidity: string;
  volume: string;
  reserveA: string;
  reserveB: string;
}

export default function MockDEXPage() {
  const { isConnected, connectWallet } = useWallet();
  
  const [pools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock DEX state
  const [selectedTab, setSelectedTab] = useState<'swap' | 'liquidity' | 'pools'>('swap');
  
  // Swap form
  const [swapForm, setSwapForm] = useState({
    fromToken: 'ETH',
    toToken: 'FIA',
    fromAmount: '',
    toAmount: '',
    slippage: '0.5'
  });

  // Liquidity form
  const [liquidityForm, setLiquidityForm] = useState({
    tokenA: 'ETH',
    tokenB: 'FIA',
    amountA: '',
    amountB: '',
    minAmountA: '',
    minAmountB: ''
  });

  if (!isDevToolsEnabled) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                MockDEX Development Tools
              </span>
            </h1>
            <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-8 mt-8">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-xl font-semibold text-yellow-400 mb-2">Development Tools Disabled</h3>
              <p className="text-yellow-200 mb-4">
                MockDEX development tools are only available when <code>NEXT_PUBLIC_ENABLE_DEV_TOOLS=true</code>
              </p>
              <p className="text-yellow-300 text-sm">
                These tools are intended for local development and testing environments.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mockSwap = async () => {
    if (!isConnected || !swapForm.fromAmount) return;

    try {
      setLoading(true);
      setError(null);
      
      // Mock swap calculation
      const mockRate = swapForm.fromToken === 'ETH' ? 1000 : 0.001; // 1 ETH = 1000 FIA
      const calculatedAmount = (parseFloat(swapForm.fromAmount) * mockRate).toString();
      
      setSwapForm(prev => ({ ...prev, toAmount: calculatedAmount }));
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Swap simulated: ${swapForm.fromAmount} ${swapForm.fromToken} → ${calculatedAmount} ${swapForm.toToken}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
    } finally {
      setLoading(false);
    }
  };

  const addLiquidity = async () => {
    if (!isConnected || !liquidityForm.amountA || !liquidityForm.amountB) return;

    try {
      setLoading(true);
      setError(null);
      
      // Mock liquidity calculation
      const lpTokens = Math.sqrt(parseFloat(liquidityForm.amountA) * parseFloat(liquidityForm.amountB));
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Liquidity added: ${liquidityForm.amountA} ${liquidityForm.tokenA} + ${liquidityForm.amountB} ${liquidityForm.tokenB} → ${lpTokens.toFixed(4)} LP tokens`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add liquidity failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              MockDEX Development Tools
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Development-only DEX interface for testing FIACoin V5 features
          </p>
          <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4 mt-4 max-w-2xl mx-auto">
            <p className="text-blue-200 text-sm">
              ⚠️ This is a development tool for testing purposes only. All transactions are simulated.
            </p>
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center py-12">
            <div className="bg-gray-900 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-4">Connect Your Wallet</h3>
              <p className="text-gray-400 mb-6">
                Connect your wallet to access MockDEX development tools
              </p>
              <button
                onClick={connectWallet}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Tab Navigation */}
            <div className="flex justify-center">
              <div className="bg-gray-900 rounded-lg p-1 flex space-x-1">
                {(['swap', 'liquidity', 'pools'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors capitalize ${
                      selectedTab === tab
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4 max-w-2xl mx-auto">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-300 hover:text-red-200 text-sm mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Swap Tab */}
            {selectedTab === 'swap' && (
              <div className="max-w-md mx-auto">
                <div className="bg-gray-900 rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6 text-center">Swap Tokens</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">From</label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={swapForm.fromAmount}
                          onChange={(e) => setSwapForm(prev => ({ ...prev, fromAmount: e.target.value }))}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                          placeholder="0.0"
                        />
                        <select
                          value={swapForm.fromToken}
                          onChange={(e) => setSwapForm(prev => ({ ...prev, fromToken: e.target.value }))}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="ETH">ETH</option>
                          <option value="FIA">FIA</option>
                        </select>
                      </div>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={() => setSwapForm(prev => ({
                          ...prev,
                          fromToken: prev.toToken,
                          toToken: prev.fromToken,
                          fromAmount: prev.toAmount,
                          toAmount: prev.fromAmount
                        }))}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        ⇅ Swap
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">To</label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={swapForm.toAmount}
                          readOnly
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white opacity-50"
                          placeholder="0.0"
                        />
                        <select
                          value={swapForm.toToken}
                          onChange={(e) => setSwapForm(prev => ({ ...prev, toToken: e.target.value }))}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="FIA">FIA</option>
                          <option value="ETH">ETH</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Slippage Tolerance: {swapForm.slippage}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={swapForm.slippage}
                        onChange={(e) => setSwapForm(prev => ({ ...prev, slippage: e.target.value }))}
                        className="w-full"
                      />
                    </div>

                    <button
                      onClick={mockSwap}
                      disabled={!swapForm.fromAmount || loading}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
                    >
                      {loading ? 'Swapping...' : 'Swap Tokens'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Liquidity Tab */}
            {selectedTab === 'liquidity' && (
              <div className="max-w-md mx-auto">
                <div className="bg-gray-900 rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6 text-center">Add Liquidity</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Token A</label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={liquidityForm.amountA}
                          onChange={(e) => setLiquidityForm(prev => ({ ...prev, amountA: e.target.value }))}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                          placeholder="0.0"
                        />
                        <select
                          value={liquidityForm.tokenA}
                          onChange={(e) => setLiquidityForm(prev => ({ ...prev, tokenA: e.target.value }))}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="ETH">ETH</option>
                          <option value="FIA">FIA</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Token B</label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={liquidityForm.amountB}
                          onChange={(e) => setLiquidityForm(prev => ({ ...prev, amountB: e.target.value }))}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                          placeholder="0.0"
                        />
                        <select
                          value={liquidityForm.tokenB}
                          onChange={(e) => setLiquidityForm(prev => ({ ...prev, tokenB: e.target.value }))}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="FIA">FIA</option>
                          <option value="ETH">ETH</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={addLiquidity}
                      disabled={!liquidityForm.amountA || !liquidityForm.amountB || loading}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
                    >
                      {loading ? 'Adding Liquidity...' : 'Add Liquidity'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pools Tab */}
            {selectedTab === 'pools' && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-gray-900 rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6">Liquidity Pools</h2>
                  
                  <div className="space-y-4">
                    {/* Mock pool data */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">ETH/FIA</h3>
                        <span className="text-green-400">24.5% APY</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                          <p>Total Liquidity: $1,234,567</p>
                          <p>24h Volume: $89,123</p>
                        </div>
                        <div>
                          <p>ETH Reserve: 123.45</p>
                          <p>FIA Reserve: 123,456</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">FIA/USDC</h3>
                        <span className="text-green-400">18.2% APY</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                          <p>Total Liquidity: $567,890</p>
                          <p>24h Volume: $23,456</p>
                        </div>
                        <div>
                          <p>FIA Reserve: 567,890</p>
                          <p>USDC Reserve: 567,890</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🏊</div>
                      <p className="text-gray-400">
                        Mock liquidity pools for development and testing
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Development Info */}
            <div className="bg-gray-900 rounded-lg p-6 max-w-4xl mx-auto">
              <h3 className="text-xl font-semibold mb-4">🛠️ Development Tools Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Mock Features</h4>
                  <ul className="text-gray-400 space-y-1">
                    <li>• Simulated token swaps</li>
                    <li>• Mock liquidity provision</li>
                    <li>• Fake pool data</li>
                    <li>• No real transactions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Use Cases</h4>
                  <ul className="text-gray-400 space-y-1">
                    <li>• UI/UX testing</li>
                    <li>• Flow validation</li>
                    <li>• Integration testing</li>
                    <li>• Development workflows</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}