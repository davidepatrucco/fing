'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../../src/hooks/useWallet';
import { useContracts } from '../../src/hooks/useContracts';
import { ethers } from 'ethers';

interface ProtectedTransferProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ProtectedTransfer({ isOpen, onClose, onSuccess }: ProtectedTransferProps) {
  const { isConnected, getSigner, address } = useWallet();
  const { getFiaContract } = useContracts();
  
  const [form, setForm] = useState({
    recipient: '',
    amount: '',
    nonce: ''
  });
  
  const [balance, setBalance] = useState<string>('0');
  const [lastTxBlock, setLastTxBlock] = useState<number>(0);
  const [lastTxTime, setLastTxTime] = useState<number>(0);
  const [suggestedNonce, setSuggestedNonce] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const fetchData = async () => {
    if (!isConnected || !address) return;

    try {
      const signer = getSigner();
      if (!signer) return;
      
      const contract = getFiaContract(signer);
      const provider = signer.provider;
      
      const [userBalance, userLastTxBlock, userLastTxTime, currentBlock] = await Promise.all([
        contract.balanceOf(address),
        contract.lastTxBlock(address),
        contract.lastTxTime(address),
        provider?.getBlockNumber() || Promise.resolve(0)
      ]);

      setBalance(ethers.formatUnits(userBalance, 18));
      setLastTxBlock(Number(userLastTxBlock));
      setLastTxTime(Number(userLastTxTime));

      // Generate suggested nonce based on current block and time
      const nonce = Math.floor(Math.random() * 1000000) + (currentBlock || 0);
      setSuggestedNonce(nonce.toString());
      setForm(prev => ({ ...prev, nonce: nonce.toString() }));

    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !form.recipient || !form.amount || !form.nonce) return;
    if (!ethers.isAddress(form.recipient)) {
      setError('Invalid recipient address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getFiaContract(signer);
      
      const amountWei = ethers.parseUnits(form.amount, 18);
      const nonce = parseInt(form.nonce);

      const tx = await contract.protectedTransfer(form.recipient, amountWei, nonce);
      await tx.wait();
      
      // Reset form and close
      setForm({ recipient: '', amount: '', nonce: '' });
      setConfirmed(false);
      onSuccess?.();
      onClose();
      
    } catch (err) {
      console.error('Error sending protected transfer:', err);
      setError(err instanceof Error ? err.message : 'Failed to send transfer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isConnected) {
      fetchData();
    }
  }, [isOpen, isConnected, address]);

  if (!isOpen) return null;

  const canTransfer = (
    form.recipient && 
    form.amount && 
    form.nonce && 
    parseFloat(form.amount) > 0 && 
    parseFloat(form.amount) <= parseFloat(balance) &&
    ethers.isAddress(form.recipient) &&
    confirmed
  );

  const currentTime = Math.floor(Date.now() / 1000);
  const timeSinceLastTx = currentTime - lastTxTime;
  const blocksSinceLastTx = lastTxBlock > 0 ? 'Unknown' : 'First transaction';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Protected Transfer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Anti-MEV Explanation */}
          <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-400 mb-2">🛡️ Anti-MEV Protection</h3>
            <p className="text-yellow-200 text-sm mb-2">
              Protected transfers prevent MEV attacks by using nonces and timing restrictions.
            </p>
            <ul className="text-yellow-300 text-xs space-y-1">
              <li>• Uses a unique nonce to prevent front-running</li>
              <li>• Same-block protection prevents sandwich attacks</li>
              <li>• Cooldown period between transactions</li>
            </ul>
          </div>

          {/* Transaction Info */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h4 className="font-semibold mb-3">Transaction Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Available Balance:</span>
                <span className="text-white">{parseFloat(balance).toFixed(4)} FIA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Transaction:</span>
                <span className="text-white">
                  {lastTxTime > 0 
                    ? `${Math.floor(timeSinceLastTx / 60)} min ago`
                    : 'None'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Blocks Since Last TX:</span>
                <span className="text-white">{blocksSinceLastTx}</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={form.recipient}
                onChange={(e) => setForm(prev => ({ ...prev, recipient: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                placeholder="0x..."
                required
              />
              {form.recipient && !ethers.isAddress(form.recipient) && (
                <p className="text-red-400 text-xs mt-1">Invalid address format</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-16 text-white"
                  placeholder="0.0"
                  min="0"
                  step="0.01"
                  required
                />
                <span className="absolute right-3 top-2 text-gray-400">FIA</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  Max: {parseFloat(balance).toFixed(4)} FIA
                </span>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, amount: balance }))}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Max
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nonce (Anti-MEV)
              </label>
              <input
                type="number"
                value={form.nonce}
                onChange={(e) => setForm(prev => ({ ...prev, nonce: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                placeholder="Enter nonce"
                required
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  Suggested: {suggestedNonce}
                </span>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, nonce: suggestedNonce }))}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Use Suggested
                </button>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="confirm"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="confirm" className="text-sm text-red-200">
                  <strong>I understand that this is a protected transfer with anti-MEV mechanisms.</strong>
                  <br />
                  I acknowledge that the nonce must be unique and that timing restrictions apply 
                  to prevent front-running and sandwich attacks.
                </label>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canTransfer || loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {loading ? 'Sending...' : 'Send Protected Transfer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}