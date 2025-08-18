'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../../src/hooks/useWallet';
import { useContracts } from '../../src/hooks/useContracts';
import { ethers } from 'ethers';

interface Transaction {
  id: number;
  destination: string;
  value: string;
  data: string;
  executed: boolean;
  confirmationCount: number;
  required: number;
  isConfirmed: boolean;
}

export default function MultisigPage() {
  const { isConnected, connectWallet, getSigner, address } = useWallet();
  const { getMultisigContract } = useContracts();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [required, setRequired] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New transaction form state
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [newTx, setNewTx] = useState({
    destination: '',
    value: '',
    data: ''
  });

  const fetchMultisigData = async () => {
    if (!isConnected || !address) return;

    const contractAddress = process.env.NEXT_PUBLIC_MULTISIG_CONTRACT_ADDRESS;
    if (!contractAddress) {
      setError('Multisig contract address not configured');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getMultisigContract(signer);
      
      // Check if user is an owner and get required confirmations
      const [userIsOwner, requiredConfirmations, txCount] = await Promise.all([
        contract.isOwner(address),
        contract.required(),
        contract.getTransactionCount()
      ]);

      setIsOwner(userIsOwner);
      setRequired(Number(requiredConfirmations));

      // Fetch recent transactions (last 20)
      const txPromises = [];
      const startIndex = Math.max(0, Number(txCount) - 20);
      
      for (let i = startIndex; i < Number(txCount); i++) {
        txPromises.push(
          Promise.all([
            contract.transactions(i),
            contract.getConfirmationCount(i),
            contract.confirmations(i, address)
          ])
        );
      }

      const txResults = await Promise.all(txPromises);
      
      const formattedTxs: Transaction[] = txResults.map(([tx, confirmCount, isConfirmed], index) => ({
        id: startIndex + index,
        destination: tx.destination,
        value: ethers.formatEther(tx.value),
        data: tx.data,
        executed: tx.executed,
        confirmationCount: Number(confirmCount),
        required: Number(requiredConfirmations),
        isConfirmed: isConfirmed
      })).reverse(); // Show newest first

      setTransactions(formattedTxs);

    } catch (err) {
      console.error('Error fetching multisig data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch multisig data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTransaction = async () => {
    if (!isConnected || !newTx.destination.trim()) return;

    try {
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getMultisigContract(signer);
      
      const value = newTx.value ? ethers.parseEther(newTx.value) : 0;
      const data = newTx.data || '0x';

      const tx = await contract.submitTransaction(newTx.destination, value, data);
      await tx.wait();
      
      // Refresh data and close form
      await fetchMultisigData();
      setShowSubmitForm(false);
      setNewTx({ destination: '', value: '', data: '' });
      
    } catch (err) {
      console.error('Error submitting transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit transaction');
    }
  };

  const handleConfirmTransaction = async (txId: number) => {
    if (!isConnected) return;

    try {
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getMultisigContract(signer);
      
      const tx = await contract.confirmTransaction(txId);
      await tx.wait();
      
      // Refresh data
      await fetchMultisigData();
      
    } catch (err) {
      console.error('Error confirming transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm transaction');
    }
  };

  const handleExecuteTransaction = async (txId: number) => {
    if (!isConnected) return;

    try {
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getMultisigContract(signer);
      
      const tx = await contract.executeTransaction(txId);
      await tx.wait();
      
      // Refresh data
      await fetchMultisigData();
      
    } catch (err) {
      console.error('Error executing transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute transaction');
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchMultisigData();
    }
  }, [isConnected, address]);

  const contractAddress = process.env.NEXT_PUBLIC_MULTISIG_CONTRACT_ADDRESS;

  if (!contractAddress) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                Multisig Treasury
              </span>
            </h1>
            <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-6 mt-8">
              <p className="text-yellow-200">
                Multisig contract address not configured. Please set NEXT_PUBLIC_MULTISIG_CONTRACT_ADDRESS in your environment.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Multisig Treasury
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Manage treasury transactions with multi-signature security
          </p>
        </div>

        {!isConnected ? (
          <div className="text-center py-12">
            <div className="bg-gray-900 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-4">Connect Your Wallet</h3>
              <p className="text-gray-400 mb-6">
                Connect your wallet to access the multisig treasury
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
            {/* Multisig Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Your Status</h3>
                <p className={`text-2xl font-bold ${isOwner ? 'text-green-400' : 'text-red-400'}`}>
                  {isOwner ? 'Owner' : 'Not Owner'}
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Required Confirmations</h3>
                <p className="text-2xl font-bold text-blue-400">{required}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Total Transactions</h3>
                <p className="text-2xl font-bold text-purple-400">{transactions.length}</p>
              </div>
            </div>

            {/* Submit Transaction Button */}
            {isOwner && (
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Transactions</h2>
                <button
                  onClick={() => setShowSubmitForm(!showSubmitForm)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  {showSubmitForm ? 'Cancel' : 'Submit Transaction'}
                </button>
              </div>
            )}

            {/* Submit Transaction Form */}
            {showSubmitForm && (
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Submit New Transaction</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Destination Address
                    </label>
                    <input
                      type="text"
                      value={newTx.destination}
                      onChange={(e) => setNewTx(prev => ({ ...prev, destination: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      placeholder="0x..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Value (ETH)
                    </label>
                    <input
                      type="number"
                      value={newTx.value}
                      onChange={(e) => setNewTx(prev => ({ ...prev, value: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      placeholder="0.0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Data (hex)
                    </label>
                    <input
                      type="text"
                      value={newTx.data}
                      onChange={(e) => setNewTx(prev => ({ ...prev, data: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      placeholder="0x (optional)"
                    />
                  </div>
                  <button
                    onClick={handleSubmitTransaction}
                    disabled={!newTx.destination.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Submit Transaction
                  </button>
                </div>
              </div>
            )}

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

            {/* Transactions List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏛️</div>
                <p className="text-gray-400 text-lg mb-4">No transactions yet</p>
                <p className="text-gray-500">
                  {isOwner 
                    ? "Submit the first transaction to get started!" 
                    : "Only multisig owners can submit transactions"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {transactions.map((transaction) => {
                  const canExecute = transaction.confirmationCount >= transaction.required && !transaction.executed;
                  const needsConfirmation = !transaction.isConfirmed && !transaction.executed && isOwner;
                  
                  return (
                    <div key={transaction.id} className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-xl font-semibold">Transaction #{transaction.id}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              transaction.executed 
                                ? 'bg-green-100 text-green-800'
                                : canExecute 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {transaction.executed ? 'Executed' : canExecute ? 'Ready to Execute' : 'Pending'}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm text-gray-300">
                            <p><strong>To:</strong> {transaction.destination}</p>
                            <p><strong>Value:</strong> {parseFloat(transaction.value).toFixed(4)} ETH</p>
                            {transaction.data !== '0x' && (
                              <p><strong>Data:</strong> {transaction.data.slice(0, 42)}...</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Confirmation Status */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-400">Confirmations</span>
                          <span className="text-sm text-gray-400">
                            {transaction.confirmationCount}/{transaction.required}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(transaction.confirmationCount / transaction.required) * 100}%` }}
                          ></div>
                        </div>
                        {transaction.isConfirmed && (
                          <p className="text-green-400 text-sm">✓ You have confirmed this transaction</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        {needsConfirmation && (
                          <button
                            onClick={() => handleConfirmTransaction(transaction.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        {canExecute && (
                          <button
                            onClick={() => handleExecuteTransaction(transaction.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                          >
                            Execute
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}