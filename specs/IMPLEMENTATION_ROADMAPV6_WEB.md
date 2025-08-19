# 🚀 FIACoin V6 Web Integration: Complete Analysis & Implementation Roadmap

## 📋 Critical Status Overview

**Priority**: URGENT  
**Epic**: V6 Integration & Full-Featured DeFi Platform  
**Estimated Effort**: 50-70 developer hours  
**Current Status**: ⚠️ **Major Misalignment - Frontend Using V5 Functions on V6 Contract**

## 🔍 Current State Analysis - DETAILED

### ✅ Smart Contract V6 Status (COMPLETE)
The FIACoinV6 contract is **fully implemented and feature-complete** with:

- **✅ Advanced Staking System**: 4 lock periods (30/90/180/365 days), APY rates (3%/5%/7%/9%), auto-compound
- **✅ Full DAO Governance**: External executor pattern (Gnosis Safe), proposal types, voting with quorum/majority
- **✅ Anti-MEV Protection**: protectedTransfer with nonce/cooldown system  
- **✅ Rich Analytics**: On-chain tokenStats and userStats tracking
- **✅ Transaction Limits**: maxTx/maxWallet/cooldown with exemption system
- **✅ Advanced Transfer Types**: transferWithData, batchTransfer with metadata
- **✅ Emergency Controls**: Pause/unpause, fee rate limiting, reward pool management

### ❌ Frontend Integration Status (CRITICAL GAPS)

#### 1. **Contract Integration - BROKEN**
```typescript
// ❌ PROBLEM: Current web app calls V5 functions that don't exist in V6
getFiaV5Contract() // Calling non-existent V5 methods on V6 contract
contract.getStakingRewards(address) // ❌ Does NOT exist in V6
contract.getStakingLeaderboard() // ❌ Does NOT exist in V6  
contract.createProposal() // ❌ Different interface in V6
```

#### 2. **Missing V6 Function Support**
```typescript
// ✅ V6 ACTUALLY HAS these functions but web app doesn't use them:
contract.stake(amount, lockPeriod, autoCompound) // V6 full staking
contract.unstake(stakeIndex) // V6 staking  
contract.claimRewards(stakeIndex) // V6 rewards
contract.propose(description, proposalType, data) // V6 governance
contract.vote(proposalId, support) // V6 voting
contract.execute(proposalId) // V6 execution
contract.protectedTransfer(to, amount, nonce) // V6 anti-MEV
contract.transferWithData(to, amount, data) // V6 metadata transfers
contract.batchTransfer(recipients, amounts) // V6 batch operations
```

#### 3. **Missing Core Features (0% Implementation)**
- **Staking UI**: No lock period selection, no APY display, wrong function calls
- **Governance UI**: Calls wrong proposal functions, missing execution interface  
- **Anti-MEV Transfers**: protectedTransfer feature completely missing
- **Analytics Dashboard**: V6 tracks rich analytics but no UI to display them
- **Batch Operations**: transferWithData, batchTransfer not exposed
- **Admin Controls**: Emergency pause, fee configuration not accessible

#### 4. **Environment Configuration - OUTDATED**
```bash
# ❌ PROBLEM: Environment still references V5
NEXT_PUBLIC_FIA_V5_CONTRACT_ADDRESS= # Should be V6
FIACOIN_V5_CONTRACT_ADDRESS= # Should be V6

# ❌ MISSING: V6-specific configuration  
NEXT_PUBLIC_FIA_V6_CONTRACT_ADDRESS= # MISSING
NEXT_PUBLIC_EXECUTOR_ADDRESS= # MISSING - Gnosis Safe Address
NEXT_PUBLIC_ENABLE_V6_STAKING= # MISSING
NEXT_PUBLIC_ENABLE_V6_GOVERNANCE= # MISSING
```

## 🎯 Implementation Requirements - COMPREHENSIVE

### 1. **URGENT: Contract Integration Fix**

#### 1.1 Create V6 Contract Service
**File**: `lib/blockchain.ts` (UPDATE EXISTING)

```typescript
// ✅ ADD: Complete V6 ABI with all implemented functions
const FIACOIN_V6_ABI = [
  // ===== STAKING SYSTEM (V6 COMPLETE) =====
  "function stake(uint256 amount, uint256 lockPeriod, bool autoCompound)",
  "function unstake(uint256 stakeIndex)", 
  "function claimRewards(uint256 stakeIndex)",
  "function userStakes(address user, uint256 index) view returns (tuple(uint256 amount, uint256 stakingTime, uint256 lastRewardClaim, uint256 lockPeriod, bool autoCompound))",
  "function getStakeCount(address user) view returns (uint256)",
  "function calculateRewards(address user, uint256 stakeIndex) view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function rewardPool() view returns (uint256)",
  "function stakingAPY(uint256 lockPeriod) view returns (uint256)",
  
  // ===== GOVERNANCE SYSTEM (V6 COMPLETE) =====
  "function propose(string description, uint8 proposalType, bytes data) returns (uint256)",
  "function vote(uint256 proposalId, bool support)",
  "function execute(uint256 proposalId)",
  "function proposals(uint256 id) view returns (tuple(uint256 id, address proposer, string description, uint256 forVotes, uint256 againstVotes, uint256 startTime, uint256 endTime, bool executed, uint8 proposalType, bytes proposalData))",
  "function proposalCount() view returns (uint256)",
  "function hasVoted(uint256 proposalId, address voter) view returns (bool)",
  "function votingPower(uint256 proposalId, address voter) view returns (uint256)",
  "function getVotingPower(address account) view returns (uint256)",
  "function executor() view returns (address)",
  "function PROPOSAL_THRESHOLD() view returns (uint256)",
  "function VOTING_PERIOD() view returns (uint256)",
  "function QUORUM_PERCENTAGE() view returns (uint256)",
  "function EXECUTION_DELAY() view returns (uint256)",
  
  // ===== ANTI-MEV & ADVANCED TRANSFERS (V6 COMPLETE) =====
  "function protectedTransfer(address to, uint256 amount, uint256 nonce) returns (bool)",
  "function transferWithData(address to, uint256 amount, bytes data) returns (bool)",
  "function batchTransfer(address[] recipients, uint256[] amounts) returns (bool)",
  "function lastTxBlock(address user) view returns (uint256)",
  "function lastTxTime(address user) view returns (uint256)", 
  "function usedNonces(bytes32 nonceHash) view returns (bool)",
  "function txLimits() view returns (tuple(uint256 maxTxAmount, uint256 maxWalletAmount, uint256 txCooldown, bool limitsActive))",
  
  // ===== ANALYTICS SYSTEM (V6 COMPLETE) =====
  "function tokenStats() view returns (tuple(uint256 totalFeeCollected, uint256 totalBurned, uint256 totalStaked, uint256 uniqueHolders, uint256 transactionCount))",
  "function userStats(address user) view returns (tuple(uint256 totalFeesPaid, uint256 totalStakingRewards, uint256 transactionCount, uint256 firstTransactionTime))",
  
  // ===== ADMIN & EMERGENCY (V6 COMPLETE) =====
  "function setTotalFeeBP(uint256 _totalFeeBP)",
  "function setFeeDistribution(uint256 _treasury, uint256 _founder, uint256 _burn)",
  "function setFeeExempt(address account, bool exempt)",
  "function emergencyPause()",
  "function emergencyUnpause()",
  "function addToRewardPool(uint256 amount)",
  "function setExecutor(address _executor)",
  "function burn(uint256 amount)",
  
  // ===== CONSTANTS (V6) =====
  "function LOCK_30_DAYS() view returns (uint256)",
  "function LOCK_90_DAYS() view returns (uint256)", 
  "function LOCK_180_DAYS() view returns (uint256)",
  "function LOCK_365_DAYS() view returns (uint256)",
  "function MAX_TOTAL_FEE_BP() view returns (uint256)",
  "function FEE_CHANGE_DELAY() view returns (uint256)",
  
  // ===== EVENTS (V6 COMPLETE) =====
  "event Staked(address indexed user, uint256 amount, uint256 lockPeriod, uint256 stakeIndex)",
  "event Unstaked(address indexed user, uint256 amount, uint256 stakeIndex)",
  "event RewardClaimed(address indexed user, uint256 reward, uint256 stakeIndex)",
  "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votingPower)",
  "event ProposalExecuted(uint256 indexed proposalId)",
  "event TransferWithDataLite(address indexed from, address indexed to, uint256 amount, bytes32 memoHash)",
  "event BatchTransfer(address indexed from, uint256 totalAmount, uint256 recipientCount)",
  "event Fingered(address indexed from, address indexed to, uint256 amount)"
];

export class BlockchainService {
  // ✅ ADD: V6 Contract Getter
  getFiaV6Contract(address: string, signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
    return new ethers.Contract(address, FIACOIN_V6_ABI, signerOrProvider || this.provider);
  }
  
  // ✅ UPDATE: Remove V5 contract getter - replace with V6
  getFiaContract = this.getFiaV6Contract; // Alias for compatibility
}
```

#### 1.2 Update Contract Hook  
**File**: `src/hooks/useContracts.ts` (UPDATE EXISTING)

```typescript
export function useContracts() {
  const getFiaContract = useCallback((
    providerOrSigner: ethers.Provider | ethers.Signer,
    address?: string
  ): ethers.Contract => {
    const contractAddress = address || 
      process.env.NEXT_PUBLIC_FIA_V6_CONTRACT_ADDRESS || // ✅ V6 primary
      process.env.NEXT_PUBLIC_FIA_CONTRACT_ADDRESS;     // ✅ fallback
    
    if (!contractAddress) {
      throw new Error('FIA V6 contract address not configured');
    }
    
    // ✅ FIXED: Use V6 contract instead of V5
    return blockchainService.getFiaV6Contract(contractAddress, providerOrSigner);
  }, []);

  // ✅ ADD: Explicit V6 getter
  const getFiaV6Contract = useCallback((
    providerOrSigner: ethers.Provider | ethers.Signer,
    address?: string
  ): ethers.Contract => {
    const contractAddress = address || process.env.NEXT_PUBLIC_FIA_V6_CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      throw new Error('FIA V6 contract address not configured');
    }
    
    return blockchainService.getFiaV6Contract(contractAddress, providerOrSigner);
  }, []);

  return {
    getFiaContract,      // ✅ Now points to V6
    getFiaV6Contract,    // ✅ Explicit V6
    // ❌ REMOVED: getMultisigContract - V6 uses external Gnosis Safe
  };
}
```

### 🏛️ **IMPORTANT: V6 Governance Architecture Changes**

#### **V6 Governance Flow (No Internal Multisig)**
```typescript
// ✅ V6 GOVERNANCE PATTERN (External Executor)
interface V6GovernanceFlow {
  // 1. PROPOSAL CREATION (Anyone with 1M+ FIA)
  propose(description: string, proposalType: ProposalType, data: bytes) → proposalId
  
  // 2. VOTING PERIOD (7 days, community votes)  
  vote(proposalId: number, support: boolean) → voting with FIA balance
  
  // 3. EXECUTION (Only Gnosis Safe can execute)
  // ❌ NO: Internal multisig owners
  // ✅ YES: External Gnosis Safe (executor address)
  execute(proposalId: number) → only callable by executor OR owner (fallback)
}

// ✅ V6 Contract Configuration
interface V6ExecutorSetup {
  executor: address;                    // Gnosis Safe address
  PROPOSAL_THRESHOLD: 1_000_000e18;     // 1M FIA to propose
  VOTING_PERIOD: 7 days;               // Voting duration
  QUORUM_PERCENTAGE: 10;               // 10% quorum needed
  EXECUTION_DELAY: 48 hours;           // Delay after voting ends
}
```

#### **Key Differences from V5:**
- ❌ **Removed**: Internal multisig with signatures/confirmations
- ✅ **Added**: External executor (Gnosis Safe) for proposal execution
- ✅ **Simplified**: Direct DAO voting → Safe execution pattern
- ✅ **Flexible**: Can update executor address if needed

### 🔑 **Admin Functions → Gnosis Safe Ownership Strategy**

#### **Current V6 Admin Functions (onlyOwner):**
```solidity
// ✅ All these functions can be transferred to Gnosis Safe ownership
function setTotalFeeBP(uint256 _totalFeeBP) external onlyOwner;           // Fee rate changes
function setFeeDistribution(uint256 _treasury, uint256 _founder, uint256 _burn) external onlyOwner; // Fee distribution
function setFeeExempt(address account, bool exempt) external onlyOwner;   // Fee exemptions
function emergencyPause() external onlyOwner;                            // Emergency pause
function emergencyUnpause() external onlyOwner;                          // Emergency unpause  
function addToRewardPool(uint256 amount) external onlyOwner;              // Reward pool funding
function setExecutor(address _executor) external onlyOwner;               // Change executor
function regularMint(address to, uint256 amount) external onlyOwner;      // Token minting
function transferOwnership(address newOwner) external onlyOwner;          // Ownership transfer
```

#### **Recommended Ownership Strategy:**
```typescript
// 🎯 PHASE 1: Hybrid Control (Deploy & Test Phase)
interface HybridControlPhase {
  owner: "EOA_DEPLOYER";           // Initial deployer for setup/testing
  executor: "GNOSIS_SAFE_ADDRESS"; // DAO proposals → Safe execution
  governance: "COMMUNITY_VOTING";   // Community votes on proposals
}

// 🎯 PHASE 2: Full Decentralization (Production Phase)  
interface FullDecentralizationPhase {
  owner: "GNOSIS_SAFE_ADDRESS";    // ALL admin functions → Safe
  executor: "GNOSIS_SAFE_ADDRESS"; // Same Safe for everything
  governance: "COMMUNITY_VOTING";   // Community votes on ALL changes
}

// 🎯 PHASE 3: Ultimate Decentralization (Optional)
interface UltimateDecentralizationPhase {
  owner: "TIMELOCK_CONTRACT";      // Timelock with Gnosis Safe as proposer
  executor: "GNOSIS_SAFE_ADDRESS"; // DAO proposals → Safe
  governance: "COMMUNITY_VOTING";   // All changes go through timelock delay
}
```

#### **Migration Path:**
```bash
# Step 1: Deploy V6 with EOA owner (for testing)
INITIAL_OWNER=0xYourEOA
EXECUTOR=0xGnosisSafeAddress

# Step 2: Test all functions work correctly

# Step 3: Transfer ownership to Gnosis Safe  
contract.transferOwnership(GNOSIS_SAFE_ADDRESS)

# Result: All admin functions now require Gnosis Safe multisig approval
```

### 2. **CRITICAL: Staking Interface - Complete Rewrite**

#### 2.1 V6 Staking Page  
**File**: `app/staking/page.tsx` (REPLACE EXISTING)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../../src/hooks/useWallet';
import { useContracts } from '../../src/hooks/useContracts';
import { ethers } from 'ethers';

// ✅ V6 Staking Interface
interface V6StakeInfo {
  index: number;
  amount: string;
  stakingTime: number;
  lastRewardClaim: number;
  lockPeriod: number;
  autoCompound: boolean;
  pendingRewards?: string;
  canUnstake: boolean;
}

interface V6LockPeriod {
  period: number;
  label: string;
  apy: string;
  apyBP: number;
}

export default function V6StakingPage() {
  const { isConnected, connectWallet, getSigner, address } = useWallet();
  const { getFiaV6Contract } = useContracts();
  
  const [stakes, setStakes] = useState<V6StakeInfo[]>([]);
  const [totalStaked, setTotalStaked] = useState<string>('0');
  const [rewardPool, setRewardPool] = useState<string>('0');
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ V6 Lock Periods with Constants
  const [lockPeriods, setLockPeriods] = useState<V6LockPeriod[]>([]);
  const [selectedLockPeriod, setSelectedLockPeriod] = useState<number>(0);

  // Staking form state
  const [stakeForm, setStakeForm] = useState({
    amount: '',
    autoCompound: false
  });

  // ✅ V6 Data Fetching
  const fetchV6StakingData = async () => {
    if (!isConnected || !address) return;

    try {
      setLoading(true);
      setError(null);
      
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getFiaV6Contract(signer);
      
      // ✅ Fetch V6 lock periods and APY rates
      const [
        lock30Days, lock90Days, lock180Days, lock365Days,
        apy30, apy90, apy180, apy365,
        userBalance, globalTotalStaked, globalRewardPool
      ] = await Promise.all([
        contract.LOCK_30_DAYS(),
        contract.LOCK_90_DAYS(), 
        contract.LOCK_180_DAYS(),
        contract.LOCK_365_DAYS(),
        contract.stakingAPY(await contract.LOCK_30_DAYS()),
        contract.stakingAPY(await contract.LOCK_90_DAYS()),
        contract.stakingAPY(await contract.LOCK_180_DAYS()),
        contract.stakingAPY(await contract.LOCK_365_DAYS()),
        contract.balanceOf(address),
        contract.totalStaked(),
        contract.rewardPool()
      ]);

      // ✅ Set lock periods with APY data
      const periods: V6LockPeriod[] = [
        { period: Number(lock30Days), label: '30 Days', apy: '3%', apyBP: Number(apy30) },
        { period: Number(lock90Days), label: '90 Days', apy: '5%', apyBP: Number(apy90) },
        { period: Number(lock180Days), label: '180 Days', apy: '7%', apyBP: Number(apy180) },
        { period: Number(lock365Days), label: '365 Days', apy: '9%', apyBP: Number(apy365) }
      ];
      
      setLockPeriods(periods);
      setSelectedLockPeriod(Number(lock30Days)); // Default to 30 days
      
      // ✅ Fetch user stakes from V6
      const stakeCount = await contract.getStakeCount(address);
      const userStakes: V6StakeInfo[] = [];
      
      for (let i = 0; i < Number(stakeCount); i++) {
        const stakeInfo = await contract.userStakes(address, i);
        const pendingRewards = await contract.calculateRewards(address, i);
        const now = Math.floor(Date.now() / 1000);
        const canUnstake = now >= (Number(stakeInfo.stakingTime) + Number(stakeInfo.lockPeriod));
        
        userStakes.push({
          index: i,
          amount: ethers.formatEther(stakeInfo.amount),
          stakingTime: Number(stakeInfo.stakingTime),
          lastRewardClaim: Number(stakeInfo.lastRewardClaim),
          lockPeriod: Number(stakeInfo.lockPeriod),
          autoCompound: stakeInfo.autoCompound,
          pendingRewards: ethers.formatEther(pendingRewards),
          canUnstake
        });
      }
      
      setStakes(userStakes);
      setBalance(ethers.formatEther(userBalance));
      setTotalStaked(ethers.formatEther(globalTotalStaked));
      setRewardPool(ethers.formatEther(globalRewardPool));

    } catch (err: any) {
      console.error('Error fetching V6 staking data:', err);
      setError(err.message || 'Failed to fetch staking data');
    } finally {
      setLoading(false);
    }
  };

  // ✅ V6 Stake Function
  const handleV6Stake = async () => {
    if (!isConnected || !selectedLockPeriod) return;

    try {
      setLoading(true);
      setError(null);

      const signer = getSigner();
      if (!signer) throw new Error('No signer available');

      const contract = getFiaV6Contract(signer);
      const amount = ethers.parseEther(stakeForm.amount);

      // ✅ Use V6 stake function
      const tx = await contract.stake(amount, selectedLockPeriod, stakeForm.autoCompound);
      await tx.wait();

      // Refresh data
      await fetchV6StakingData();
      
      // Reset form
      setStakeForm({ amount: '', autoCompound: false });

    } catch (err: any) {
      console.error('Error staking:', err);
      setError(err.message || 'Failed to stake');
    } finally {
      setLoading(false);
    }
  };

  // ✅ V6 Unstake Function
  const handleV6Unstake = async (stakeIndex: number) => {
    if (!isConnected) return;

    try {
      setLoading(true);
      setError(null);

      const signer = getSigner();
      if (!signer) throw new Error('No signer available');

      const contract = getFiaV6Contract(signer);

      // ✅ Use V6 unstake function
      const tx = await contract.unstake(stakeIndex);
      await tx.wait();

      // Refresh data
      await fetchV6StakingData();

    } catch (err: any) {
      console.error('Error unstaking:', err);
      setError(err.message || 'Failed to unstake');
    } finally {
      setLoading(false);
    }
  };

  // ✅ V6 Claim Rewards Function
  const handleV6ClaimRewards = async (stakeIndex: number) => {
    if (!isConnected) return;

    try {
      setLoading(true);
      setError(null);

      const signer = getSigner();
      if (!signer) throw new Error('No signer available');

      const contract = getFiaV6Contract(signer);

      // ✅ Use V6 claimRewards function
      const tx = await contract.claimRewards(stakeIndex);
      await tx.wait();

      // Refresh data
      await fetchV6StakingData();

    } catch (err: any) {
      console.error('Error claiming rewards:', err);
      setError(err.message || 'Failed to claim rewards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchV6StakingData();
    }
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">FIA V6 Staking</h1>
          <p className="text-gray-600 mb-8">Connect your wallet to start staking FIA tokens</p>
          <button
            onClick={connectWallet}
            className="btn btn-primary"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-4xl font-bold text-center">FIA V6 Staking</h1>
      
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* ✅ V6 Staking Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat bg-base-200">
          <div className="stat-title">Total Staked</div>
          <div className="stat-value text-primary">{parseFloat(totalStaked).toLocaleString()} FIA</div>
          <div className="stat-desc">Across all lock periods</div>
        </div>
        <div className="stat bg-base-200">
          <div className="stat-title">Reward Pool</div>
          <div className="stat-value text-secondary">{parseFloat(rewardPool).toLocaleString()} FIA</div>
          <div className="stat-desc">Available for rewards</div>
        </div>
        <div className="stat bg-base-200">
          <div className="stat-title">Your Balance</div>
          <div className="stat-value">{parseFloat(balance).toLocaleString()} FIA</div>
          <div className="stat-desc">Available to stake</div>
        </div>
      </div>

      {/* ✅ V6 Lock Period Selector */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Select Lock Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {lockPeriods.map((period) => (
              <div
                key={period.period}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedLockPeriod === period.period
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 hover:border-primary/50'
                }`}
                onClick={() => setSelectedLockPeriod(period.period)}
              >
                <div className="text-center">
                  <div className="font-bold text-lg">{period.label}</div>
                  <div className="text-2xl font-bold text-primary">{period.apy}</div>
                  <div className="text-sm opacity-70">APY</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ V6 Stake Form */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Stake FIA Tokens</h2>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount to stake</span>
              <span className="label-text-alt">Balance: {parseFloat(balance).toLocaleString()} FIA</span>
            </label>
            <input
              type="number"
              placeholder="Enter amount"
              className="input input-bordered"
              value={stakeForm.amount}
              onChange={(e) => setStakeForm({...stakeForm, amount: e.target.value})}
              disabled={loading}
            />
          </div>

          <div className="form-control">
            <label className="cursor-pointer label">
              <span className="label-text">Auto-compound rewards</span>
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={stakeForm.autoCompound}
                onChange={(e) => setStakeForm({...stakeForm, autoCompound: e.target.checked})}
                disabled={loading}
              />
            </label>
          </div>

          <div className="card-actions justify-end">
            <button
              className={`btn btn-primary ${loading ? 'loading' : ''}`}
              onClick={handleV6Stake}
              disabled={loading || !stakeForm.amount || !selectedLockPeriod}
            >
              {loading ? 'Staking...' : 'Stake FIA'}
            </button>
          </div>
        </div>
      </div>

      {/* ✅ V6 User Stakes */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Your Stakes</h2>
          
          {stakes.length === 0 ? (
            <p className="text-gray-500">No active stakes found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Lock Period</th>
                    <th>APY</th>
                    <th>Pending Rewards</th>
                    <th>Auto-Compound</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stakes.map((stake) => {
                    const lockPeriod = lockPeriods.find(p => p.period === stake.lockPeriod);
                    const unlockDate = new Date((stake.stakingTime + stake.lockPeriod) * 1000);
                    
                    return (
                      <tr key={stake.index}>
                        <td>{parseFloat(stake.amount).toLocaleString()} FIA</td>
                        <td>{lockPeriod?.label || `${stake.lockPeriod}s`}</td>
                        <td>{lockPeriod?.apy || 'Unknown'}</td>
                        <td>{parseFloat(stake.pendingRewards || '0').toFixed(4)} FIA</td>
                        <td>{stake.autoCompound ? '✅' : '❌'}</td>
                        <td>
                          {stake.canUnstake ? (
                            <span className="badge badge-success">Unlocked</span>
                          ) : (
                            <span className="badge badge-warning">
                              Locked until {unlockDate.toLocaleDateString()}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="space-x-2">
                            <button
                              className={`btn btn-sm btn-secondary ${loading ? 'loading' : ''}`}
                              onClick={() => handleV6ClaimRewards(stake.index)}
                              disabled={loading || parseFloat(stake.pendingRewards || '0') === 0}
                            >
                              Claim
                            </button>
                            <button
                              className={`btn btn-sm btn-error ${loading ? 'loading' : ''}`}
                              onClick={() => handleV6Unstake(stake.index)}
                              disabled={loading || !stake.canUnstake}
                            >
                              Unstake
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3. **CRITICAL: Governance Interface - Complete Rewrite**

#### 3.1 V6 Governance Page  
**File**: `app/governance/page.tsx` (REPLACE EXISTING)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../../src/hooks/useWallet';
import { useContracts } from '../../src/hooks/useContracts';
import { ethers } from 'ethers';

// ✅ V6 Proposal Interface
interface V6Proposal {
  id: number;
  proposer: string;
  description: string;
  forVotes: string;
  againstVotes: string;
  startTime: number;
  endTime: number;
  executed: boolean;
  proposalType: number;
  proposalData: string;
  state: 'Active' | 'Succeeded' | 'Defeated' | 'Executed' | 'Expired';
  canExecute: boolean;
  timeRemaining: string;
}

// ✅ V6 Proposal Types
enum ProposalType {
  FeeChange = 0,
  TreasuryTransfer = 1,
  ParameterChange = 2,
  Emergency = 3,
  General = 4
}

export default function V6GovernancePage() {
  const { isConnected, connectWallet, getSigner, address } = useWallet();
  const { getFiaV6Contract } = useContracts();
  
  const [proposals, setProposals] = useState<V6Proposal[]>([]);
  const [governanceStats, setGovernanceStats] = useState({
    proposalThreshold: '0',
    votingPeriod: '0',
    quorumPercentage: '0',
    executionDelay: '0',
    executor: '',
    myVotingPower: '0'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create proposal form state
  const [proposalForm, setProposalForm] = useState({
    description: '',
    proposalType: ProposalType.General,
    proposalData: '0x'
  });

  // ✅ V6 Governance Data Fetching
  const fetchV6GovernanceData = async () => {
    if (!isConnected || !address) return;

    try {
      setLoading(true);
      setError(null);
      
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getFiaV6Contract(signer);
      
      // ✅ Fetch V6 governance parameters
      const [
        proposalThreshold, votingPeriod, quorumPercentage, executionDelay,
        executor, proposalCount, myVotingPower
      ] = await Promise.all([
        contract.PROPOSAL_THRESHOLD(),
        contract.VOTING_PERIOD(),
        contract.QUORUM_PERCENTAGE(),
        contract.EXECUTION_DELAY(),
        contract.executor(),
        contract.proposalCount(),
        contract.getVotingPower(address)
      ]);

      setGovernanceStats({
        proposalThreshold: ethers.formatEther(proposalThreshold),
        votingPeriod: (Number(votingPeriod) / 86400).toString(), // Convert to days
        quorumPercentage: quorumPercentage.toString(),
        executionDelay: (Number(executionDelay) / 3600).toString(), // Convert to hours
        executor,
        myVotingPower: ethers.formatEther(myVotingPower)
      });

      // ✅ Fetch all V6 proposals
      const proposalsList: V6Proposal[] = [];
      const now = Math.floor(Date.now() / 1000);

      for (let i = 1; i <= Number(proposalCount); i++) {
        const proposal = await contract.proposals(i);
        
        // Calculate proposal state
        let state: V6Proposal['state'] = 'Active';
        let canExecute = false;
        let timeRemaining = '';

        if (now > Number(proposal.endTime)) {
          const totalVotes = Number(ethers.formatEther(proposal.forVotes)) + Number(ethers.formatEther(proposal.againstVotes));
          const quorumMet = totalVotes >= (Number(ethers.formatEther(proposalThreshold)) * Number(quorumPercentage) / 100);
          const majority = Number(ethers.formatEther(proposal.forVotes)) > Number(ethers.formatEther(proposal.againstVotes));
          
          if (proposal.executed) {
            state = 'Executed';
          } else if (quorumMet && majority) {
            state = 'Succeeded';
            canExecute = now >= (Number(proposal.endTime) + Number(executionDelay));
          } else {
            state = 'Defeated';
          }
        } else {
          const remainingSeconds = Number(proposal.endTime) - now;
          const days = Math.floor(remainingSeconds / 86400);
          const hours = Math.floor((remainingSeconds % 86400) / 3600);
          timeRemaining = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
        }

        proposalsList.push({
          id: Number(proposal.id),
          proposer: proposal.proposer,
          description: proposal.description,
          forVotes: ethers.formatEther(proposal.forVotes),
          againstVotes: ethers.formatEther(proposal.againstVotes),
          startTime: Number(proposal.startTime),
          endTime: Number(proposal.endTime),
          executed: proposal.executed,
          proposalType: Number(proposal.proposalType),
          proposalData: proposal.proposalData,
          state,
          canExecute,
          timeRemaining
        });
      }

      setProposals(proposalsList.reverse()); // Show newest first

    } catch (err: any) {
      console.error('Error fetching V6 governance data:', err);
      setError(err.message || 'Failed to fetch governance data');
    } finally {
      setLoading(false);
    }
  };

  // ✅ V6 Create Proposal Function
  const handleV6CreateProposal = async () => {
    if (!isConnected) return;

    try {
      setLoading(true);
      setError(null);

      const signer = getSigner();
      if (!signer) throw new Error('No signer available');

      const contract = getFiaV6Contract(signer);

      // ✅ Use V6 propose function
      const tx = await contract.propose(
        proposalForm.description,
        proposalForm.proposalType,
        proposalForm.proposalData || '0x'
      );
      await tx.wait();

      // Refresh data
      await fetchV6GovernanceData();
      
      // Reset form
      setProposalForm({
        description: '',
        proposalType: ProposalType.General,
        proposalData: '0x'
      });

    } catch (err: any) {
      console.error('Error creating proposal:', err);
      setError(err.message || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  // ✅ V6 Vote Function
  const handleV6Vote = async (proposalId: number, support: boolean) => {
    if (!isConnected) return;

    try {
      setLoading(true);
      setError(null);

      const signer = getSigner();
      if (!signer) throw new Error('No signer available');

      const contract = getFiaV6Contract(signer);

      // Check if already voted
      const hasVoted = await contract.hasVoted(proposalId, address);
      if (hasVoted) {
        throw new Error('You have already voted on this proposal');
      }

      // ✅ Use V6 vote function
      const tx = await contract.vote(proposalId, support);
      await tx.wait();

      // Refresh data
      await fetchV6GovernanceData();

    } catch (err: any) {
      console.error('Error voting:', err);
      setError(err.message || 'Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  // ✅ V6 Execute Proposal Function
  const handleV6Execute = async (proposalId: number) => {
    if (!isConnected) return;

    try {
      setLoading(true);
      setError(null);

      const signer = getSigner();
      if (!signer) throw new Error('No signer available');

      const contract = getFiaV6Contract(signer);

      // ✅ Use V6 execute function
      const tx = await contract.execute(proposalId);
      await tx.wait();

      // Refresh data
      await fetchV6GovernanceData();

    } catch (err: any) {
      console.error('Error executing proposal:', err);
      setError(err.message || 'Failed to execute proposal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchV6GovernanceData();
    }
  }, [isConnected, address]);

  const getProposalTypeLabel = (type: number): string => {
    switch (type) {
      case ProposalType.FeeChange: return 'Fee Change';
      case ProposalType.TreasuryTransfer: return 'Treasury Transfer';
      case ProposalType.ParameterChange: return 'Parameter Change';
      case ProposalType.Emergency: return 'Emergency';
      case ProposalType.General: return 'General';
      default: return 'Unknown';
    }
  };

  const getStateColor = (state: string): string => {
    switch (state) {
      case 'Active': return 'badge-primary';
      case 'Succeeded': return 'badge-success';
      case 'Defeated': return 'badge-error';
      case 'Executed': return 'badge-info';
      case 'Expired': return 'badge-warning';
      default: return 'badge-neutral';
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">FIA V6 Governance</h1>
          <p className="text-gray-600 mb-8">Connect your wallet to participate in governance</p>
          <button
            onClick={connectWallet}
            className="btn btn-primary"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-4xl font-bold text-center">FIA V6 Governance</h1>
      
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* ✅ V6 Governance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat bg-base-200">
          <div className="stat-title">Your Voting Power</div>
          <div className="stat-value text-primary">{parseFloat(governanceStats.myVotingPower).toLocaleString()}</div>
          <div className="stat-desc">FIA tokens</div>
        </div>
        <div className="stat bg-base-200">
          <div className="stat-title">Proposal Threshold</div>
          <div className="stat-value text-secondary">{parseFloat(governanceStats.proposalThreshold).toLocaleString()}</div>
          <div className="stat-desc">FIA required</div>
        </div>
        <div className="stat bg-base-200">
          <div className="stat-title">Voting Period</div>
          <div className="stat-value">{governanceStats.votingPeriod} days</div>
          <div className="stat-desc">Duration</div>
        </div>
        <div className="stat bg-base-200">
          <div className="stat-title">Quorum</div>
          <div className="stat-value">{governanceStats.quorumPercentage}%</div>
          <div className="stat-desc">Required participation</div>
        </div>
      </div>

      {/* ✅ V6 Create Proposal Form */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Create New Proposal</h2>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Proposal Type</span>
            </label>
            <select
              className="select select-bordered"
              value={proposalForm.proposalType}
              onChange={(e) => setProposalForm({...proposalForm, proposalType: parseInt(e.target.value)})}
              disabled={loading}
            >
              <option value={ProposalType.General}>General Proposal</option>
              <option value={ProposalType.FeeChange}>Fee Change</option>
              <option value={ProposalType.TreasuryTransfer}>Treasury Transfer</option>
              <option value={ProposalType.ParameterChange}>Parameter Change</option>
              <option value={ProposalType.Emergency}>Emergency Proposal</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="Describe your proposal..."
              value={proposalForm.description}
              onChange={(e) => setProposalForm({...proposalForm, description: e.target.value})}
              disabled={loading}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Proposal Data (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="0x (for parameter changes)"
              className="input input-bordered"
              value={proposalForm.proposalData}
              onChange={(e) => setProposalForm({...proposalForm, proposalData: e.target.value})}
              disabled={loading}
            />
          </div>

          <div className="card-actions justify-end">
            <button
              className={`btn btn-primary ${loading ? 'loading' : ''}`}
              onClick={handleV6CreateProposal}
              disabled={loading || !proposalForm.description || parseFloat(governanceStats.myVotingPower) < parseFloat(governanceStats.proposalThreshold)}
            >
              {loading ? 'Creating...' : 'Create Proposal'}
            </button>
          </div>
          
          {parseFloat(governanceStats.myVotingPower) < parseFloat(governanceStats.proposalThreshold) && (
            <div className="alert alert-warning">
              <span>You need at least {parseFloat(governanceStats.proposalThreshold).toLocaleString()} FIA to create proposals</span>
            </div>
          )}
        </div>
      </div>

      {/* ✅ V6 Proposals List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Active Proposals</h2>
          
          {proposals.length === 0 ? (
            <p className="text-gray-500">No proposals found.</p>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">#{proposal.id}: {proposal.description}</h3>
                      <p className="text-sm text-gray-500">
                        Proposed by: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`badge ${getStateColor(proposal.state)} mb-2`}>
                        {proposal.state}
                      </span>
                      <div className="text-sm text-gray-500">
                        <div>Type: {getProposalTypeLabel(proposal.proposalType)}</div>
                        {proposal.timeRemaining && <div>Ends in: {proposal.timeRemaining}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm font-medium text-green-600">For Votes</div>
                      <div className="text-lg">{parseFloat(proposal.forVotes).toLocaleString()} FIA</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-red-600">Against Votes</div>
                      <div className="text-lg">{parseFloat(proposal.againstVotes).toLocaleString()} FIA</div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {proposal.state === 'Active' && (
                      <>
                        <button
                          className={`btn btn-sm btn-success ${loading ? 'loading' : ''}`}
                          onClick={() => handleV6Vote(proposal.id, true)}
                          disabled={loading}
                        >
                          Vote For
                        </button>
                        <button
                          className={`btn btn-sm btn-error ${loading ? 'loading' : ''}`}
                          onClick={() => handleV6Vote(proposal.id, false)}
                          disabled={loading}
                        >
                          Vote Against
                        </button>
                      </>
                    )}
                    
                    {proposal.canExecute && (
                      <button
                        className={`btn btn-sm btn-primary ${loading ? 'loading' : ''}`}
                        onClick={() => handleV6Execute(proposal.id)}
                        disabled={loading}
                      >
                        Execute
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 4. **URGENT: Analytics Dashboard - New Implementation**

#### 4.1 Analytics Dashboard  
**File**: `app/analytics/page.tsx` (NEW - V6 Analytics Display)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../../src/hooks/useWallet';
import { useContracts } from '../../src/hooks/useContracts';
import { ethers } from 'ethers';

// ✅ V6 Analytics Interfaces
interface V6TokenStats {
  totalFeeCollected: string;
  totalBurned: string;
  totalStaked: string;
  uniqueHolders: string;
  transactionCount: string;
}

interface V6UserStats {
  totalFeesPaid: string;
  totalStakingRewards: string;
  transactionCount: string;
  firstTransactionTime: number;
}

export default function V6AnalyticsPage() {
  const { isConnected, connectWallet, getSigner, address } = useWallet();
  const { getFiaV6Contract } = useContracts();
  
  const [tokenStats, setTokenStats] = useState<V6TokenStats>({
    totalFeeCollected: '0',
    totalBurned: '0',
    totalStaked: '0',
    uniqueHolders: '0',
    transactionCount: '0'
  });
  const [userStats, setUserStats] = useState<V6UserStats>({
    totalFeesPaid: '0',
    totalStakingRewards: '0',
    transactionCount: '0',
    firstTransactionTime: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ V6 Analytics Data Fetching
  const fetchV6Analytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const signer = getSigner();
      if (!signer) throw new Error('No signer available');
      
      const contract = getFiaV6Contract(signer);
      
      // ✅ Fetch V6 token analytics (on-chain)
      const globalTokenStats = await contract.tokenStats();
      
      setTokenStats({
        totalFeeCollected: ethers.formatEther(globalTokenStats.totalFeeCollected),
        totalBurned: ethers.formatEther(globalTokenStats.totalBurned),
        totalStaked: ethers.formatEther(globalTokenStats.totalStaked),
        uniqueHolders: globalTokenStats.uniqueHolders.toString(),
        transactionCount: globalTokenStats.transactionCount.toString()
      });

      // ✅ Fetch V6 user analytics (if connected)
      if (isConnected && address) {
        const globalUserStats = await contract.userStats(address);
        
        setUserStats({
          totalFeesPaid: ethers.formatEther(globalUserStats.totalFeesPaid),
          totalStakingRewards: ethers.formatEther(globalUserStats.totalStakingRewards),
          transactionCount: globalUserStats.transactionCount.toString(),
          firstTransactionTime: Number(globalUserStats.firstTransactionTime)
        });
      }

    } catch (err: any) {
      console.error('Error fetching V6 analytics:', err);
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchV6Analytics();
  }, [isConnected, address]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-4xl font-bold text-center">FIA V6 Analytics</h1>
      
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* ✅ V6 Global Token Statistics */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Global Token Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="stat bg-base-200">
              <div className="stat-title">Total Fees Collected</div>
              <div className="stat-value text-primary">{parseFloat(tokenStats.totalFeeCollected).toLocaleString()}</div>
              <div className="stat-desc">FIA</div>
            </div>
            <div className="stat bg-base-200">
              <div className="stat-title">Total Burned</div>
              <div className="stat-value text-secondary">{parseFloat(tokenStats.totalBurned).toLocaleString()}</div>
              <div className="stat-desc">FIA</div>
            </div>
            <div className="stat bg-base-200">
              <div className="stat-title">Total Staked</div>
              <div className="stat-value text-accent">{parseFloat(tokenStats.totalStaked).toLocaleString()}</div>
              <div className="stat-desc">FIA</div>
            </div>
            <div className="stat bg-base-200">
              <div className="stat-title">Unique Holders</div>
              <div className="stat-value">{parseInt(tokenStats.uniqueHolders).toLocaleString()}</div>
              <div className="stat-desc">Addresses</div>
            </div>
            <div className="stat bg-base-200">
              <div className="stat-title">Total Transactions</div>
              <div className="stat-value">{parseInt(tokenStats.transactionCount).toLocaleString()}</div>
              <div className="stat-desc">Count</div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ V6 User Statistics (if connected) */}
      {isConnected && address && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Your Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat bg-base-200">
                <div className="stat-title">Total Fees Paid</div>
                <div className="stat-value text-primary">{parseFloat(userStats.totalFeesPaid).toFixed(4)}</div>
                <div className="stat-desc">FIA</div>
              </div>
              <div className="stat bg-base-200">
                <div className="stat-title">Staking Rewards</div>
                <div className="stat-value text-secondary">{parseFloat(userStats.totalStakingRewards).toFixed(4)}</div>
                <div className="stat-desc">FIA earned</div>
              </div>
              <div className="stat bg-base-200">
                <div className="stat-title">Your Transactions</div>
                <div className="stat-value">{parseInt(userStats.transactionCount).toLocaleString()}</div>
                <div className="stat-desc">Count</div>
              </div>
              <div className="stat bg-base-200">
                <div className="stat-title">First Transaction</div>
                <div className="stat-value text-sm">{userStats.firstTransactionTime > 0 ? new Date(userStats.firstTransactionTime * 1000).toLocaleDateString() : 'Never'}</div>
                <div className="stat-desc">Date</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">Connect Wallet for Personal Analytics</h2>
            <p className="text-gray-600 mb-4">See your personal FIA transaction history and rewards</p>
            <button
              onClick={connectWallet}
              className="btn btn-primary"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}
    </div>
  );
}
```

### 5. **NEW: Anti-MEV Protected Transfer Interface**

#### 5.1 Protected Transfer Component  
**File**: `src/components/ProtectedTransfer.tsx` (NEW)

```tsx
'use client';

import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContracts } from '../hooks/useContracts';
import { ethers } from 'ethers';

export default function ProtectedTransfer() {
  const { isConnected, getSigner, address } = useWallet();
  const { getFiaV6Contract } = useContracts();
  
  const [transferForm, setTransferForm] = useState({
    to: '',
    amount: '',
    nonce: Math.floor(Math.random() * 1000000).toString()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ V6 Protected Transfer Function
  const handleProtectedTransfer = async () => {
    if (!isConnected) return;

    try {
      setLoading(true);
      setError(null);

      const signer = getSigner();
      if (!signer) throw new Error('No signer available');

      const contract = getFiaV6Contract(signer);
      const amount = ethers.parseEther(transferForm.amount);
      const nonce = parseInt(transferForm.nonce);

      // ✅ Use V6 protectedTransfer function
      const tx = await contract.protectedTransfer(transferForm.to, amount, nonce);
      await tx.wait();

      // Reset form
      setTransferForm({
        to: '',
        amount: '',
        nonce: Math.floor(Math.random() * 1000000).toString()
      });

    } catch (err: any) {
      console.error('Error with protected transfer:', err);
      setError(err.message || 'Failed to send protected transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">🛡️ Anti-MEV Protected Transfer</h2>
        <p className="text-sm text-gray-600">Send FIA with protection against MEV attacks</p>
        
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <div className="form-control">
          <label className="label">
            <span className="label-text">Recipient Address</span>
          </label>
          <input
            type="text"
            placeholder="0x..."
            className="input input-bordered"
            value={transferForm.to}
            onChange={(e) => setTransferForm({...transferForm, to: e.target.value})}
            disabled={loading}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Amount (FIA)</span>
          </label>
          <input
            type="number"
            placeholder="0.0"
            className="input input-bordered"
            value={transferForm.amount}
            onChange={(e) => setTransferForm({...transferForm, amount: e.target.value})}
            disabled={loading}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Nonce (Random Number)</span>
          </label>
          <input
            type="number"
            className="input input-bordered"
            value={transferForm.nonce}
            onChange={(e) => setTransferForm({...transferForm, nonce: e.target.value})}
            disabled={loading}
          />
          <label className="label">
            <span className="label-text-alt">Used to prevent replay attacks</span>
          </label>
        </div>

        <div className="card-actions justify-end">
          <button
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            onClick={handleProtectedTransfer}
            disabled={loading || !transferForm.to || !transferForm.amount || !isConnected}
          >
            {loading ? 'Sending...' : 'Send Protected Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6. **URGENT: Environment Configuration**

#### 6.1 Update Environment Variables  
**File**: `.env.local.example` (UPDATE)

```bash
# ❌ REMOVE V5 References
# NEXT_PUBLIC_FIA_V5_CONTRACT_ADDRESS=
# FIACOIN_V5_CONTRACT_ADDRESS=

# ✅ ADD V6 Configuration
NEXT_PUBLIC_FIA_V6_CONTRACT_ADDRESS=0x...  # V6 contract address
NEXT_PUBLIC_FIA_CONTRACT_ADDRESS=0x...     # Alias pointing to V6
FIACOIN_V6_CONTRACT_ADDRESS=0x...          # Backend V6 address

# ✅ V6 Governance Configuration
NEXT_PUBLIC_EXECUTOR_ADDRESS=0x...         # Gnosis Safe executor
NEXT_PUBLIC_PROPOSAL_THRESHOLD=1000000     # 1M FIA required for proposals
NEXT_PUBLIC_VOTING_PERIOD=604800           # 7 days in seconds
NEXT_PUBLIC_QUORUM_PERCENTAGE=10           # 10% quorum required

# ✅ V6 Feature Flags
NEXT_PUBLIC_ENABLE_V6_STAKING=true
NEXT_PUBLIC_ENABLE_V6_GOVERNANCE=true
NEXT_PUBLIC_ENABLE_V6_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PROTECTED_TRANSFERS=true
NEXT_PUBLIC_ENABLE_BATCH_TRANSFERS=true

# ✅ V6 Staking Configuration
NEXT_PUBLIC_STAKING_APY_30=300             # 3% APY for 30 days
NEXT_PUBLIC_STAKING_APY_90=500             # 5% APY for 90 days
NEXT_PUBLIC_STAKING_APY_180=700            # 7% APY for 180 days
NEXT_PUBLIC_STAKING_APY_365=900            # 9% APY for 365 days

# Analytics & Indexing
INDEXER_START_BLOCK=0                      # Block to start indexing from
ANALYTICS_REFRESH_INTERVAL=300             # 5 minutes
LEADERBOARD_UPDATE_INTERVAL=3600           # 1 hour
```

---

## 🎯 **PRIORITY IMPLEMENTATION ORDER**

### **Phase 1: CRITICAL FIXES (Days 1-3)**
1. **Contract Integration Fix** - Update blockchain.ts and useContracts.ts to use V6 ABI
2. **Environment Configuration** - Update all V5 references to V6
3. **Staking Interface** - Complete rewrite with V6 functions
4. **Governance Interface** - Complete rewrite with V6 proposals/voting

### **Phase 2: FEATURE COMPLETION (Days 4-7)**
5. **Analytics Dashboard** - Display V6 on-chain analytics
6. **Protected Transfer UI** - Anti-MEV transfer interface
7. **Batch Transfer UI** - Multiple recipient transfers
8. **Admin Interface** - Emergency controls, fee configuration

### **Phase 3: ENHANCEMENT (Days 8-14)**
9. **Real-time Updates** - WebSocket integration for live data
10. **Advanced Charts** - Historical analytics visualization
11. **Milestone NFTs** - Leaderboard reward system
12. **Mobile Optimization** - Responsive design improvements

---

## ⚠️ **CRITICAL ISSUES TO ADDRESS IMMEDIATELY**

1. **BROKEN CONTRACT CALLS**: Web app calling V5 functions on V6 contract
2. **MISSING V6 FEATURES**: 90% of V6 functionality not exposed in UI
3. **INCORRECT CONFIGURATION**: Environment still references V5 addresses
4. **NO GOVERNANCE UI**: Complete DAO system exists but no interface
5. **NO ANALYTICS UI**: Rich on-chain data available but not displayed
6. **SECURITY FEATURES MISSING**: Anti-MEV protection not accessible

The V6 contract is **feature-complete and tested**. The critical path is **frontend integration** to expose these features to users.

---

## 📊 **SUCCESS METRICS**

- ✅ All V6 functions accessible through web interface
- ✅ Staking interface with lock periods and APY display
- ✅ Governance interface with proposal creation and voting
- ✅ Analytics dashboard showing V6 on-chain metrics
- ✅ Protected transfer interface for anti-MEV protection
- ✅ Real-time data updates and event indexing
- ✅ Mobile-responsive design across all pages

```tsx
// Updated for V6 staking system
export default function StakingPage() {
    const [stakes, setStakes] = useState<V6StakeInfo[]>([]);
    const [rewardPool, setRewardPool] = useState('0');
    const [selectedLockPeriod, setSelectedLockPeriod] = useState(LOCK_30_DAYS);
    const [stakingAPYs, setStakingAPYs] = useState({});
    
    // V6-specific lock periods and APYs
    const lockPeriods = [
        { period: LOCK_30_DAYS, label: '30 Days', apy: '3%' },
        { period: LOCK_90_DAYS, label: '90 Days', apy: '5%' },
        { period: LOCK_180_DAYS, label: '180 Days', apy: '7%' },
        { period: LOCK_365_DAYS, label: '365 Days', apy: '9%' }
    ];
    
    const fetchV6StakingData = async () => {
        const contract = getFiaV6Contract(signer);
        
        // Get user stakes from V6
        const userStakesCount = await contract.userStakes(address).length;
        const stakes = [];
        for (let i = 0; i < userStakesCount; i++) {
            const stake = await contract.userStakes(address, i);
            const rewards = await contract._calculateRewards(address, i);
            stakes.push({ ...stake, index: i, pendingRewards: rewards });
        }
        
        // Get APY rates from V6
        const apyRates = {};
        for (const period of lockPeriods) {
            apyRates[period.period] = await contract.stakingAPY(period.period);
        }
        
        setStakes(stakes);
        setStakingAPYs(apyRates);
    };
    
    return (
        <div className="space-y-8">
            {/* V6 Staking Statistics */}
            <V6StakingStats 
                totalStaked={await contract.totalStaked()}
                rewardPool={await contract.rewardPool()}
                apyRates={stakingAPYs}
            />
            
            {/* Lock Period Selector */}
            <LockPeriodSelector 
                periods={lockPeriods}
                selected={selectedLockPeriod}
                onSelect={setSelectedLockPeriod}
            />
            
            {/* V6 Stake Form */}
            <V6StakeForm 
                lockPeriod={selectedLockPeriod}
                onStake={handleV6Stake}
                apy={stakingAPYs[selectedLockPeriod]}
            />
            
            {/* Active Stakes with V6 data */}
            <V6UserStakes 
                stakes={stakes} 
                onUnstake={handleV6Unstake}
                onClaimRewards={handleV6ClaimRewards}
            />
        </div>
    );
}
```

#### 3.2 Governance Interface (`app/governance/page.tsx`) - V6 Integration

**Current Issues**: Mock proposals, no real V6 governance integration  
**Required Changes**:

```tsx
// Updated for V6 governance system
export default function GovernancePage() {
    const [proposals, setProposals] = useState<V6Proposal[]>([]);
    const [votingPower, setVotingPower] = useState('0');
    const [proposalThreshold, setProposalThreshold] = useState('0');
    
    const fetchV6GovernanceData = async () => {
        const contract = getFiaV6Contract(signer);
        
        // Get proposals from V6
        const proposalCount = await contract.proposalCount();
        const proposals = [];
        for (let i = 0; i < proposalCount; i++) {
            const proposal = await contract.proposals(i);
            proposals.push({
                ...proposal,
                id: i,
                hasUserVoted: await contract.hasVoted(i, address),
                userVotingPower: await contract.votingPower(i, address)
            });
        }
        
        // Get user voting power (balance) and threshold
        const userPower = await contract.getVotingPower(address);
        const threshold = await contract.PROPOSAL_THRESHOLD();
        
        setProposals(proposals);
        setVotingPower(userPower);
        setProposalThreshold(threshold);
    };
    
    const handleV6Vote = async (proposalId: number, support: boolean) => {
        const contract = getFiaV6Contract(signer);
        const tx = await contract.vote(proposalId, support);
        await tx.wait();
        // Refresh data
        fetchV6GovernanceData();
    };
    
    return (
        <div className="space-y-8">
            {/* V6 Governance Overview */}
            <V6GovernanceStats 
                totalProposals={proposals.length}
                activeProposals={proposals.filter(p => !p.executed && block.timestamp <= p.endTime).length}
                userVotingPower={votingPower}
                proposalThreshold={proposalThreshold}
            />
            
            {/* Create Proposal (if eligible) */}
            {BigInt(votingPower) >= BigInt(proposalThreshold) && (
                <V6CreateProposalForm onSubmit={handleV6CreateProposal} />
            )}
            
            {/* V6 Proposals List */}
            <V6ProposalsList 
                proposals={proposals} 
                onVote={handleV6Vote}
                currentBlock={blockNumber}
                userAddress={address}
            />
            
            {/* Execution Queue (for executor) */}
            <V6ExecutionQueue 
                proposals={proposals.filter(p => canExecute(p))}
                onExecute={handleV6Execute}
                isExecutor={address === executorAddress}
            />
        </div>
    );
}
```

#### 3.3 Enhanced Leaderboard (`app/leaderboard/page.tsx`)

**Current Issues**: Static ranking, no milestone tracking  
**Required Changes**:

```tsx
export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [milestoneNFTs, setMilestoneNFTs] = useState<NFTInfo[]>([]);
    
    return (
        <div className="space-y-8">
            {/* User Position & Stats */}
            <UserLeaderboardCard userStats={userStats} />
            
            {/* Milestone NFT Gallery */}
            <MilestoneNFTShowcase nfts={milestoneNFTs} />
            
            {/* Filtering & Search */}
            <LeaderboardFilters 
                onFilterChange={handleFilterChange}
                onSearch={handleSearch}
            />
            
            {/* Rankings Table */}
            <LeaderboardTable 
                entries={leaderboard}
                currentUser={address}
                onViewProfile={handleViewProfile}
            />
            
            {/* Real-time Updates */}
            <LiveActivityFeed />
        </div>
    );
}
```

#### 3.4 New Advanced Features

##### Protected Transfer Interface - V6 Anti-MEV
**File**: `app/tools/protected-transfer/page.tsx` (new)

```tsx
// V6 protectedTransfer with nonce and anti-MEV protection
export default function ProtectedTransferPage() {
    const [txLimits, setTxLimits] = useState<TransactionLimits>();
    const [lastTxTime, setLastTxTime] = useState<number>(0);
    const [usedNonces, setUsedNonces] = useState<Set<string>>(new Set());
    
    const fetchV6Limits = async () => {
        const contract = getFiaV6Contract(provider);
        const limits = await contract.txLimits();
        const userLastTx = await contract.lastTxTime(address);
        setTxLimits(limits);
        setLastTxTime(userLastTx);
    };
    
    const handleV6ProtectedTransfer = async (to: string, amount: string, nonce: string) => {
        const contract = getFiaV6Contract(signer);
        
        // Check cooldown
        const now = Math.floor(Date.now() / 1000);
        const cooldownRemaining = lastTxTime + txLimits.txCooldown - now;
        if (cooldownRemaining > 0) {
            throw new Error(`Cooldown: ${cooldownRemaining}s remaining`);
        }
        
        // Check nonce uniqueness
        const nonceKey = `${address}-${nonce}`;
        if (usedNonces.has(nonceKey)) {
            throw new Error('Nonce already used');
        }
        
        const tx = await contract.protectedTransfer(to, parseEther(amount), nonce);
        await tx.wait();
        
        setUsedNonces(prev => new Set([...prev, nonceKey]));
        fetchV6Limits(); // Refresh limits
    };
    
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <V6ProtectedTransferForm 
                onTransfer={handleV6ProtectedTransfer}
                txLimits={txLimits}
                lastTxTime={lastTxTime}
                usedNonces={usedNonces}
            />
            <V6TransactionLimitsDisplay limits={txLimits} />
            <V6AntiMEVExplanation />
        </div>
    );
}
```

##### Analytics Dashboard - V6 On-chain Metrics
**File**: `app/analytics/page.tsx` (new)

```tsx
// V6 provides rich on-chain analytics - display them beautifully
export default function AnalyticsPage() {
    const [tokenStats, setTokenStats] = useState<TokenAnalytics>();
    const [userStats, setUserStats] = useState<UserAnalytics>();
    const [stakingMetrics, setStakingMetrics] = useState<StakingMetrics>();
    
    const fetchV6Analytics = async () => {
        const contract = getFiaV6Contract(provider);
        
        // V6 tracks comprehensive on-chain analytics
        const tokenAnalytics = await contract.tokenStats();
        const userAnalytics = address ? await contract.userStats(address) : null;
        
        // Staking analytics
        const totalStaked = await contract.totalStaked();
        const rewardPool = await contract.rewardPool();
        
        setTokenStats(tokenAnalytics);
        setUserStats(userAnalytics);
        setStakingMetrics({ totalStaked, rewardPool });
    };
    
    return (
        <div className="space-y-8">
            {/* V6 Token Metrics */}
            <V6TokenMetrics 
                totalFeeCollected={tokenStats?.totalFeeCollected}
                totalBurned={tokenStats?.totalBurned}
                uniqueHolders={tokenStats?.uniqueHolders}
                transactionCount={tokenStats?.transactionCount}
            />
            
            {/* User Personal Analytics */}
            {userStats && (
                <V6UserAnalytics 
                    totalFeesPaid={userStats.totalFeesPaid}
                    totalStakingRewards={userStats.totalStakingRewards}
                    transactionCount={userStats.transactionCount}
                    firstTransactionTime={userStats.firstTransactionTime}
                />
            )}
            
            {/* V6 Staking Pool Metrics */}
            <V6StakingAnalytics 
                totalStaked={stakingMetrics?.totalStaked}
                rewardPool={stakingMetrics?.rewardPool}
                stakingAPYs={stakingAPYs}
            />
            
            {/* Fee Distribution Breakdown */}
            <V6FeeAnalytics 
                treasuryBP={await contract.feeToTreasuryBP()}
                founderBP={await contract.feeToFounderBP()}
                burnBP={await contract.feeToBurnBP()}
                totalFeeBP={await contract.totalFeeBP()}
            />
        </div>
    );
}
```

### 4. UX/UI Enhancements

#### 4.1 Real-time Updates System
```typescript
// WebSocket connection for live data
class LiveDataService {
    connect() {
        this.ws = new WebSocket(WS_ENDPOINT);
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.updateStore(data);
        };
    }
    
    subscribeToLeaderboard(callback: Function) {
        // Real-time leaderboard updates
    }
    
    subscribeToStaking(address: string, callback: Function) {
        // Real-time staking rewards
    }
}
```

#### 4.2 Transaction Status System
```tsx
// Enhanced transaction feedback
const TransactionToast = ({ tx }: { tx: Transaction }) => (
    <div className="toast toast-info">
        <div className="flex items-center space-x-3">
            <Spinner />
            <div>
                <p className="font-semibold">Transaction Pending</p>
                <p className="text-sm">
                    {tx.type}: {tx.description}
                </p>
                <a href={getExplorerUrl(tx.hash)} target="_blank" className="text-blue-400">
                    View on Explorer ↗
                </a>
            </div>
        </div>
    </div>
);
```

#### 4.3 Progressive Web App Features
```typescript
// Add PWA capabilities
const PWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    
    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            setDeferredPrompt(e);
        });
    }, []);
    
    return deferredPrompt && (
        <button onClick={handleInstall} className="btn btn-primary">
            Install FIA App
        </button>
    );
};
```

### 5. Performance & Security

#### 5.1 Caching Strategy
```typescript
// Implement multi-layer caching
class CacheService {
    // In-memory cache for frequently accessed data
    private memoryCache = new Map();
    
    // Local storage for user preferences
    private localStorage: Storage;
    
    // Redis cache for server-side data
    private redisCache: Redis;
    
    async get(key: string): Promise<any> {
        // Check memory -> localStorage -> Redis -> blockchain
    }
}
```

#### 5.2 Security Enhancements
```typescript
// Input validation and sanitization
const validateStakeAmount = (amount: string): ValidationResult => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        return { valid: false, error: 'Invalid amount' };
    }
    if (numAmount > MAX_STAKE_AMOUNT) {
        return { valid: false, error: 'Amount exceeds maximum' };
    }
    return { valid: true };
};

// Rate limiting for API calls
const useRateLimiter = (limit: number, window: number) => {
    const [requests, setRequests] = useState<number[]>([]);
    
    const canMakeRequest = (): boolean => {
        const now = Date.now();
        const recentRequests = requests.filter(time => now - time < window);
        return recentRequests.length < limit;
    };
    
    return { canMakeRequest };
};
```

---

## 🎯 **Admin Functions & Gnosis Safe Integration Strategy**

### **Current V6 Admin Functions Available:**
```solidity
// ✅ All these can be transferred to Gnosis Safe ownership
setTotalFeeBP(uint256)           // Fee rate changes (max 2%)
setFeeDistribution(...)          // Treasury/founder/burn split
setFeeExempt(address, bool)      // Fee exemption management
emergencyPause()                 // Emergency contract pause
emergencyUnpause()               // Resume contract operations
addToRewardPool(uint256)         // Fund staking rewards
setExecutor(address)             // Change DAO executor
transferOwnership(address)       // Transfer to Gnosis Safe
```

### **Recommended Migration Strategy:**

#### **Phase 1: Hybrid Control (Launch & Test)**
- **Owner**: EOA deployer (immediate admin control)
- **Executor**: Gnosis Safe (DAO proposal execution)
- **Benefits**: Fast admin response, Safe DAO execution

#### **Phase 2: Full Decentralization (Production)**  
- **Owner**: Gnosis Safe (ALL admin functions)
- **Executor**: Same Gnosis Safe
- **Benefits**: Complete multisig control, full decentralization

#### **Phase 3: Timelock Governance (Ultimate)**
- **Owner**: Timelock contract 
- **Executor**: Gnosis Safe
- **Benefits**: Time-delayed admin changes, maximum security

### **Implementation:**
```bash
# Transfer ownership to Gnosis Safe
contract.transferOwnership(GNOSIS_SAFE_ADDRESS)

# Result: All onlyOwner functions now require Safe multisig approval
```

---

## 📦 Deliverables

### Phase 1: Contract Integration & NFT Deploy
- [ ] Deploy MilestoneNFT contract
- [ ] Update web app contract addresses to use V6 
- [ ] Verify V6 contract ABIs are correctly imported
- [ ] Test V6 staking functions in dev environment
- [ ] Test V6 governance functions with test proposals

### Phase 2: Backend Infrastructure 
- [ ] Enhanced event indexer with real-time processing
- [ ] Leaderboard calculation engine
- [ ] WebSocket service for live updates
- [ ] Caching layer implementation
- [ ] API rate limiting

### Phase 3: Frontend Implementation 
- [ ] Complete staking interface with real functionality
- [ ] Full governance UI with proposal creation/voting
- [ ] Enhanced leaderboard with milestone tracking
- [ ] Protected transfer interface
- [ ] Analytics dashboard
- [ ] Real-time updates across all pages

### Phase 4: UX & Polish 
- [ ] PWA implementation
- [ ] Advanced transaction status system
- [ ] Performance optimizations
- [ ] Mobile responsiveness improvements
- [ ] Accessibility compliance (WCAG 2.1)

### Phase 5: Security & Deployment 
- [ ] Security audit of smart contracts
- [ ] Frontend security review
- [ ] Load testing
- [ ] Production deployment
- [ ] Documentation updates

---

## 🔧 Technical Implementation Notes

### Environment Variables Required
```env
# V6 Smart Contracts
NEXT_PUBLIC_FIA_V6_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_MILESTONE_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_EXECUTOR_ADDRESS=0x...  # Gnosis Safe or timelock

# V6 Features
NEXT_PUBLIC_ENABLE_V6_STAKING=true
NEXT_PUBLIC_ENABLE_V6_GOVERNANCE=true
NEXT_PUBLIC_ENABLE_V6_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PROTECTED_TRANSFERS=true

# API Endpoints
NEXT_PUBLIC_WS_ENDPOINT=wss://...
NEXT_PUBLIC_API_BASE_URL=https://...
```

### Database Schema Extensions
```sql
-- V6 staking data (mapping from contract state)
CREATE TABLE v6_user_stakes (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    stake_index INTEGER NOT NULL,
    amount DECIMAL(78,0) NOT NULL,
    staking_time TIMESTAMP NOT NULL,
    last_reward_claim TIMESTAMP NOT NULL,
    lock_period INTEGER NOT NULL, -- seconds
    auto_compound BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_address, stake_index)
);

-- V6 governance proposals (synced from events)
CREATE TABLE v6_proposals (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER NOT NULL UNIQUE,
    proposer VARCHAR(42) NOT NULL,
    description TEXT NOT NULL,
    proposal_type INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    for_votes DECIMAL(78,0) DEFAULT 0,
    against_votes DECIMAL(78,0) DEFAULT 0,
    executed BOOLEAN DEFAULT FALSE,
    proposal_data BYTEA
);

-- V6 analytics (cached from contract)
CREATE TABLE v6_analytics_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_time TIMESTAMP DEFAULT NOW(),
    total_fee_collected DECIMAL(78,0),
    total_burned DECIMAL(78,0),
    total_staked DECIMAL(78,0),
    unique_holders INTEGER,
    transaction_count BIGINT,
    reward_pool DECIMAL(78,0)
);

-- V6 user analytics (cached from contract)
CREATE TABLE v6_user_analytics (
    user_address VARCHAR(42) PRIMARY KEY,
    total_fees_paid DECIMAL(78,0) DEFAULT 0,
    total_staking_rewards DECIMAL(78,0) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    first_transaction_time TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Success Metrics

### Technical Metrics
- [ ] 100% contract function coverage in UI
- [ ] < 3s page load times
- [ ] 99.9% uptime for real-time features
- [ ] < 2s transaction confirmation feedback

### User Experience Metrics
- [ ] Staking participation rate > 30%
- [ ] Governance proposal participation > 20%
- [ ] Mobile usability score > 90
- [ ] User retention rate > 60%

### Security Metrics
- [ ] Zero critical vulnerabilities
- [ ] Rate limiting effectiveness > 99%
- [ ] Input validation coverage 100%

