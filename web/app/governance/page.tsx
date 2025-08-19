'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../../src/hooks/useWallet';
import { useContracts, useGovernance } from '../../src/hooks/useContracts';
import { ethers } from 'ethers';

interface Proposal {
  id: number;
  proposer: string;
  description: string;
  startTime: number;
  endTime: number;
  forVotes: string;
  againstVotes: string;
  executed: boolean;
  proposalType: number;
  proposalData: string;
}

export default function GovernancePage() {
  const { isConnected, connectWallet, getSigner, address } = useWallet();
  const { fiaContract } = useContracts();
  const { createProposal, vote, executeProposal } = useGovernance();
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votingPower, setVotingPower] = useState<string>('0');
  const [proposalThreshold, setProposalThreshold] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New proposal form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProposal, setNewProposal] = useState({
    description: '',
    proposalType: 0,
    proposalData: ''
  });

  const fetchGovernanceData = async () => {
    if (!isConnected || !fiaContract) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch proposal count and threshold
      const [proposalCount, threshold] = await Promise.all([
        fiaContract.proposalCount(),
        fiaContract.PROPOSAL_THRESHOLD()
      ]);

      // Fetch voting power if user is connected
      let userVotingPower = '0';
      if (address) {
        const votingPower = await fiaContract.getVotingPower(address);
        userVotingPower = ethers.formatUnits(votingPower, 18);
      }

      // Fetch recent proposals (last 10)
      const proposalPromises = [];
      const startIndex = Math.max(0, Number(proposalCount) - 10);
      
      for (let i = startIndex; i < Number(proposalCount); i++) {
        proposalPromises.push(fiaContract.proposals(i));
      }

      const proposalResults = await Promise.all(proposalPromises);
      
      const formattedProposals: Proposal[] = proposalResults.map((proposal, index) => ({
        id: startIndex + index,
        proposer: proposal.proposer,
        description: proposal.description,
        startTime: Number(proposal.startTime),
        endTime: Number(proposal.startTime) + 7 * 24 * 60 * 60, // 7 days voting period
        forVotes: ethers.formatUnits(proposal.forVotes, 18),
        againstVotes: ethers.formatUnits(proposal.againstVotes, 18),
        executed: proposal.executed,
        proposalType: Number(proposal.proposalType),
        proposalData: proposal.proposalData
      })).reverse(); // Show newest first

      setProposals(formattedProposals);
      setVotingPower(userVotingPower);
      setProposalThreshold(ethers.formatUnits(threshold, 18));

    } catch (err) {
      console.error('Error fetching governance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch governance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!isConnected || !newProposal.description.trim()) return;

    try {
      setLoading(true);
      
      // Encode proposal data based on type
      let encodedData = '0x';
      if (newProposal.proposalData.trim()) {
        // For now, just pass the data as bytes
        encodedData = ethers.hexlify(ethers.toUtf8Bytes(newProposal.proposalData));
      }

      const tx = await createProposal(
        newProposal.proposalType,
        newProposal.description,
        encodedData
      );

      if (tx) {
        await tx.wait();
        
        // Refresh data and close form
        await fetchGovernanceData();
        setShowCreateForm(false);
        setNewProposal({ description: '', proposalType: 0, proposalData: '' });
      }
      
    } catch (err) {
      console.error('Error creating proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: number, support: boolean) => {
    if (!isConnected) return;

    try {
      setLoading(true);
      
      const tx = await vote(proposalId, support);
      
      if (tx) {
        await tx.wait();
        
        // Refresh data
        await fetchGovernanceData();
      }
      
    } catch (err) {
      console.error('Error voting:', err);
      setError(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteProposal = async (proposalId: number) => {
    if (!isConnected) return;

    try {
      setLoading(true);
      
      const tx = await executeProposal(proposalId);
      
      if (tx) {
        await tx.wait();
        
        // Refresh data
        await fetchGovernanceData();
      }
      
    } catch (err) {
      console.error('Error executing proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute proposal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchGovernanceData();
    }
  }, [isConnected, address]);

  const canCreateProposal = parseFloat(votingPower) >= parseFloat(proposalThreshold);
  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              FIA Governance
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Participate in FIACoin governance by creating and voting on proposals
          </p>
        </div>

        {!isConnected ? (
          <div className="text-center py-12">
            <div className="bg-gray-900 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-4">Connect Your Wallet</h3>
              <p className="text-gray-400 mb-6">
                Connect your wallet to participate in governance
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
            {/* Governance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Your Voting Power</h3>
                <p className="text-2xl font-bold text-purple-400">{parseFloat(votingPower).toFixed(2)} FIA</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Proposal Threshold</h3>
                <p className="text-2xl font-bold text-blue-400">{parseFloat(proposalThreshold).toFixed(2)} FIA</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Total Proposals</h3>
                <p className="text-2xl font-bold text-green-400">{proposals.length}</p>
              </div>
            </div>

            {/* Create Proposal Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Proposals</h2>
              {canCreateProposal && (
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  {showCreateForm ? 'Cancel' : 'Create Proposal'}
                </button>
              )}
            </div>

            {/* Create Proposal Form */}
            {showCreateForm && (
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Create New Proposal</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newProposal.description}
                      onChange={(e) => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      rows={4}
                      placeholder="Describe your proposal..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Proposal Type
                    </label>
                    <select
                      value={newProposal.proposalType}
                      onChange={(e) => setNewProposal(prev => ({ ...prev, proposalType: parseInt(e.target.value) }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value={0}>General</option>
                      <option value={1}>Fee Change</option>
                      <option value={2}>Treasury Spend</option>
                      <option value={3}>Emergency Action</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Proposal Data (optional)
                    </label>
                    <input
                      type="text"
                      value={newProposal.proposalData}
                      onChange={(e) => setNewProposal(prev => ({ ...prev, proposalData: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      placeholder="Additional data for the proposal"
                    />
                  </div>
                  <button
                    onClick={handleCreateProposal}
                    disabled={!newProposal.description.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Submit Proposal
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

            {/* Proposals List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading proposals...</p>
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🗳️</div>
                <p className="text-gray-400 text-lg mb-4">No proposals yet</p>
                <p className="text-gray-500">
                  {canCreateProposal 
                    ? "Be the first to create a proposal!" 
                    : `You need ${proposalThreshold} FIA to create proposals`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {proposals.map((proposal) => {
                  const isActive = now >= proposal.startTime && now <= proposal.endTime;
                  const canExecute = now > proposal.endTime && !proposal.executed;
                  const totalVotes = parseFloat(proposal.forVotes) + parseFloat(proposal.againstVotes);
                  const forPercentage = totalVotes > 0 ? (parseFloat(proposal.forVotes) / totalVotes) * 100 : 0;
                  
                  return (
                    <div key={proposal.id} className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-xl font-semibold">Proposal #{proposal.id}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              proposal.executed 
                                ? 'bg-green-100 text-green-800'
                                : isActive 
                                  ? 'bg-blue-100 text-blue-800'
                                  : canExecute
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                              {proposal.executed ? 'Executed' : isActive ? 'Active' : canExecute ? 'Ready to Execute' : 'Ended'}
                            </span>
                          </div>
                          <p className="text-gray-300 mb-4">{proposal.description}</p>
                          <div className="text-sm text-gray-400 space-y-1">
                            <p>Proposer: {proposal.proposer}</p>
                            <p>End Time: {new Date(proposal.endTime * 1000).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Voting Results */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-400">Voting Results</span>
                          <span className="text-sm text-gray-400">
                            {totalVotes.toFixed(2)} FIA total votes
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                          <div
                            className="bg-green-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${forPercentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">
                            For: {parseFloat(proposal.forVotes).toFixed(2)} FIA ({forPercentage.toFixed(1)}%)
                          </span>
                          <span className="text-red-400">
                            Against: {parseFloat(proposal.againstVotes).toFixed(2)} FIA ({(100 - forPercentage).toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        {isActive && !proposal.executed && (
                          <>
                            <button
                              onClick={() => handleVote(proposal.id, true)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                            >
                              Vote For
                            </button>
                            <button
                              onClick={() => handleVote(proposal.id, false)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                            >
                              Vote Against
                            </button>
                          </>
                        )}
                        {canExecute && forPercentage > 50 && (
                          <button
                            onClick={() => handleExecuteProposal(proposal.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                          >
                            Execute Proposal
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