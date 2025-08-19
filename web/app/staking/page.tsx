'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../../src/hooks/useWallet';
import { useContracts } from '../../src/hooks/useContracts';
import { ethers } from 'ethers';

interface StakeInfo {
  index: number;
  amount: string;
  lockPeriod: number;
  autoCompound: boolean;
  startTime: number;
  canUnstake: boolean;
}

export default function StakingPage() {
  const { isConnected, connectWallet, getSigner, address } = useWallet();
  const { getFiaContract } = useContracts();
  
  const [stakes, setStakes] = useState<StakeInfo[]>([]);
  const [rewards, setRewards] = useState<string>('0');
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Staking form state
  const [stakeForm, setStakeForm] = useState({
    amount: '',
    lockPeriod: 30, // days
    autoCompound: false
  });

  const fetchStakingData = async () => {
    if (!isConnected || !address) return;

    try {
      setLoading(true);
      setError(null);
      
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getFiaContract(signer);
      
      // Fetch user balance and rewards
      const [userBalance, userRewards] = await Promise.all([
        contract.balanceOf(address),
        contract.getStakingRewards(address)
      ]);

      setBalance(ethers.formatUnits(userBalance, 18));
      setRewards(ethers.formatUnits(userRewards, 18));

      // TODO: Fetch user stakes (this would require additional contract functions)
      // For now, we'll use a placeholder
      setStakes([]);

    } catch (err) {
      console.error('Error fetching staking data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch staking data');
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    if (!isConnected || !stakeForm.amount || parseFloat(stakeForm.amount) <= 0) return;

    try {
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getFiaContract(signer);
      
      const amountWei = ethers.parseUnits(stakeForm.amount, 18);
      const lockPeriodSeconds = stakeForm.lockPeriod * 24 * 60 * 60; // Convert days to seconds

      const tx = await contract.stake(amountWei, lockPeriodSeconds, stakeForm.autoCompound);
      await tx.wait();
      
      // Refresh data and reset form
      await fetchStakingData();
      setStakeForm({ amount: '', lockPeriod: 30, autoCompound: false });
      
    } catch (err) {
      console.error('Error staking:', err);
      setError(err instanceof Error ? err.message : 'Failed to stake tokens');
    }
  };

  const handleUnstake = async (index: number) => {
    if (!isConnected) return;

    try {
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getFiaContract(signer);
      
      const tx = await contract.unstake(index);
      await tx.wait();
      
      // Refresh data
      await fetchStakingData();
      
    } catch (err) {
      console.error('Error unstaking:', err);
      setError(err instanceof Error ? err.message : 'Failed to unstake tokens');
    }
  };

  const handleClaimRewards = async () => {
    if (!isConnected) return;

    try {
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getFiaContract(signer);
      
      const tx = await contract.claimStakingRewards();
      await tx.wait();
      
      // Refresh data
      await fetchStakingData();
      
    } catch (err) {
      console.error('Error claiming rewards:', err);
      setError(err instanceof Error ? err.message : 'Failed to claim rewards');
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchStakingData();
    }
  }, [isConnected, address]);

  const canStake = parseFloat(stakeForm.amount) > 0 && parseFloat(stakeForm.amount) <= parseFloat(balance);
  const hasRewards = parseFloat(rewards) > 0;

  // Calculate APY based on lock period (example calculation)
  const calculateAPY = (lockPeriod: number) => {
    const baseAPY = 10; // 10% base APY
    const bonusAPY = Math.min(lockPeriod / 30 * 5, 50); // Up to 50% bonus for longer locks
    return baseAPY + bonusAPY;
  };

  const estimatedAPY = calculateAPY(stakeForm.lockPeriod);

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              FIA Staking
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Stake your FIA tokens to earn rewards and participate in governance
          </p>
        </div>

        {!isConnected ? (
          <div className="text-center py-12">
            <div className="bg-gray-900 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-4">Connect Your Wallet</h3>
              <p className="text-gray-400 mb-6">
                Connect your wallet to start staking FIA tokens
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
            {/* Staking Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Available Balance</h3>
                <p className="text-2xl font-bold text-blue-400">{parseFloat(balance).toFixed(4)} FIA</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Pending Rewards</h3>
                <p className="text-2xl font-bold text-green-400">{parseFloat(rewards).toFixed(4)} FIA</p>
                {hasRewards && (
                  <button
                    onClick={handleClaimRewards}
                    className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                  >
                    Claim Rewards
                  </button>
                )}
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Total Staked</h3>
                <p className="text-2xl font-bold text-purple-400">
                  {stakes.reduce((total, stake) => total + parseFloat(stake.amount), 0).toFixed(4)} FIA
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Stake Form */}
              <div className="bg-gray-900 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Stake Tokens</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Amount to Stake
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={stakeForm.amount}
                        onChange={(e) => setStakeForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-16 text-white"
                        placeholder="0.0"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute right-3 top-2 text-gray-400">FIA</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-sm text-gray-400">
                        Balance: {parseFloat(balance).toFixed(4)} FIA
                      </span>
                      <button
                        onClick={() => setStakeForm(prev => ({ ...prev, amount: balance }))}
                        className="text-sm text-purple-400 hover:text-purple-300"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Lock Period: {stakeForm.lockPeriod} days
                    </label>
                    <input
                      type="range"
                      min="7"
                      max="365"
                      value={stakeForm.lockPeriod}
                      onChange={(e) => setStakeForm(prev => ({ ...prev, lockPeriod: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-sm text-gray-400 mt-1">
                      <span>7 days</span>
                      <span>365 days</span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoCompound"
                      checked={stakeForm.autoCompound}
                      onChange={(e) => setStakeForm(prev => ({ ...prev, autoCompound: e.target.checked }))}
                      className="mr-2"
                    />
                    <label htmlFor="autoCompound" className="text-sm text-gray-300">
                      Auto-compound rewards
                    </label>
                  </div>

                  {/* APY Estimate */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Estimated APY</span>
                      <span className="text-lg font-bold text-green-400">{estimatedAPY.toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on current lock period. Longer locks earn higher rewards.
                    </p>
                  </div>

                  <button
                    onClick={handleStake}
                    disabled={!canStake || loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    {loading ? 'Staking...' : 'Stake Tokens'}
                  </button>
                </div>
              </div>

              {/* Staking Positions */}
              <div className="bg-gray-900 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Your Stakes</h2>
                
                {stakes.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">💎</div>
                    <p className="text-gray-400">No active stakes</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Stake tokens to start earning rewards
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stakes.map((stake) => (
                      <div key={stake.index} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{parseFloat(stake.amount).toFixed(4)} FIA</p>
                            <p className="text-sm text-gray-400">
                              Lock: {stake.lockPeriod / (24 * 60 * 60)} days
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">
                              {stake.autoCompound ? 'Auto-compound' : 'Manual claim'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Started: {new Date(stake.startTime * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        {stake.canUnstake && (
                          <button
                            onClick={() => handleUnstake(stake.index)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-semibold transition-colors"
                          >
                            Unstake
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-300 hover:text-red-200 text-sm mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Staking Information */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">How Staking Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">🔒 Lock Periods</h4>
                  <p className="text-gray-400 text-sm">
                    Choose lock periods from 7 days to 1 year. Longer locks earn higher APY rates.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">📈 Rewards</h4>
                  <p className="text-gray-400 text-sm">
                    Earn rewards in FIA tokens. Choose auto-compound for maximum returns.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🗳️ Governance</h4>
                  <p className="text-gray-400 text-sm">
                    Staked tokens count as voting power for governance proposals.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">⚡ Unstaking</h4>
                  <p className="text-gray-400 text-sm">
                    Unstake after lock period ends. Early unstaking may incur penalties.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}