'use client';

import { useMemo } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import {
  FIACoinV6__factory,
  MockDEX__factory,
  SimpleMultiSig__factory,
  LPTimelock__factory,
  type FIACoinV6,
  type MockDEX,
  type SimpleMultiSig,
  type LPTimelock,
} from '../types';

// Contract addresses - these should be configurable via environment variables
const CONTRACT_ADDRESSES = {
  FIACoinV6: process.env.NEXT_PUBLIC_FIA_V6_ADDRESS || '',
  MockDEX: process.env.NEXT_PUBLIC_MOCK_DEX_ADDRESS || '',
  SimpleMultiSig: process.env.NEXT_PUBLIC_MULTISIG_ADDRESS || '',
  LPTimelock: process.env.NEXT_PUBLIC_LP_TIMELOCK_ADDRESS || '',
} as const;

export interface ContractInstances {
  fiaContract: FIACoinV6 | null;
  mockDexContract: MockDEX | null;
  multiSigContract: SimpleMultiSig | null;
  lpTimelockContract: LPTimelock | null;
  isReady: boolean;
}

export function useContracts(): ContractInstances {
  const { provider, signer } = useWallet();

  const contracts = useMemo(() => {
    const providerOrSigner = signer || provider;
    
    if (!providerOrSigner) {
      return {
        fiaContract: null,
        mockDexContract: null,
        multiSigContract: null,
        lpTimelockContract: null,
        isReady: false,
      };
    }

    try {
      const fiaContract = CONTRACT_ADDRESSES.FIACoinV6 
        ? FIACoinV6__factory.connect(CONTRACT_ADDRESSES.FIACoinV6, providerOrSigner)
        : null;

      const mockDexContract = CONTRACT_ADDRESSES.MockDEX
        ? MockDEX__factory.connect(CONTRACT_ADDRESSES.MockDEX, providerOrSigner)
        : null;

      const multiSigContract = CONTRACT_ADDRESSES.SimpleMultiSig
        ? SimpleMultiSig__factory.connect(CONTRACT_ADDRESSES.SimpleMultiSig, providerOrSigner)
        : null;

      const lpTimelockContract = CONTRACT_ADDRESSES.LPTimelock
        ? LPTimelock__factory.connect(CONTRACT_ADDRESSES.LPTimelock, providerOrSigner)
        : null;

      return {
        fiaContract,
        mockDexContract,
        multiSigContract,
        lpTimelockContract,
        isReady: true,
      };
    } catch (error) {
      console.error('Error connecting to contracts:', error);
      return {
        fiaContract: null,
        mockDexContract: null,
        multiSigContract: null,
        lpTimelockContract: null,
        isReady: false,
      };
    }
  }, [provider, signer]);

  return contracts;
}

// Utility functions for contract interactions
export const contractUtils = {
  // Format token amounts for display
  formatTokenAmount: (amount: bigint, decimals = 18): string => {
    return ethers.formatUnits(amount, decimals);
  },

  // Parse token amounts for transactions
  parseTokenAmount: (amount: string, decimals = 18): bigint => {
    return ethers.parseUnits(amount, decimals);
  },

  // Check if address has enough balance
  async checkBalance(
    contract: FIACoinV6 | null,
    address: string,
    requiredAmount: bigint
  ): Promise<boolean> {
    if (!contract || !address) return false;
    try {
      const balance = await contract.balanceOf(address);
      return balance >= requiredAmount;
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  },

  // Estimate gas for a transaction
  async estimateGas(
    contract: ethers.BaseContract,
    method: string,
    params: unknown[]
  ): Promise<bigint | null> {
    try {
      return await (contract as unknown as Record<string, { estimateGas: (...args: unknown[]) => Promise<bigint> }>)[method].estimateGas(...params);
    } catch (error) {
      console.error('Error estimating gas:', error);
      return null;
    }
  },
};

// Hook for FIA-specific operations
export function useFiaContract() {
  const { fiaContract } = useContracts();
  const { address } = useWallet();

  const operations = useMemo(() => ({
    // Get user balance
    async getBalance(): Promise<bigint | null> {
      if (!fiaContract || !address) return null;
      try {
        return await fiaContract.balanceOf(address);
      } catch (error) {
        console.error('Error getting balance:', error);
        return null;
      }
    },

    // Get user staking info
    async getStakeInfo(): Promise<{
      amount: bigint;
      lockPeriod: number;
      startTime: bigint;
      claimed: boolean;
    } | null> {
      if (!fiaContract || !address) return null;
      try {
        return await fiaContract.userStakes(address);
      } catch (error) {
        console.error('Error getting stake info:', error);
        return null;
      }
    },

    // Get governance proposal
    async getProposal(proposalId: number): Promise<{
      id: bigint;
      proposer: string;
      proposalType: number;
      description: string;
      data: string;
      votesFor: bigint;
      votesAgainst: bigint;
      startTime: bigint;
      executed: boolean;
    } | null> {
      if (!fiaContract) return null;
      try {
        return await fiaContract.proposals(proposalId);
      } catch (error) {
        console.error('Error getting proposal:', error);
        return null;
      }
    },

    // Get voting power
    async getVotingPower(): Promise<bigint | null> {
      if (!fiaContract || !address) return null;
      try {
        return await fiaContract.getVotingPower(address);
      } catch (error) {
        console.error('Error getting voting power:', error);
        return null;
      }
    },
  }), [fiaContract, address]);

  return { fiaContract, ...operations };
}

// Hook for governance operations
export function useGovernance() {
  const { fiaContract } = useContracts();
  const { address } = useWallet();

  return useMemo(() => ({
    // Create a proposal
    async createProposal(
      proposalType: number,
      description: string,
      data: string = '0x'
    ): Promise<ethers.ContractTransactionResponse | null> {
      if (!fiaContract || !address) return null;
      try {
        return await fiaContract.propose(proposalType, description, data);
      } catch (error) {
        console.error('Error creating proposal:', error);
        throw error;
      }
    },

    // Vote on a proposal
    async vote(
      proposalId: number,
      support: boolean
    ): Promise<ethers.ContractTransactionResponse | null> {
      if (!fiaContract || !address) return null;
      try {
        return await fiaContract.vote(proposalId, support);
      } catch (error) {
        console.error('Error voting:', error);
        throw error;
      }
    },

    // Execute a proposal
    async executeProposal(
      proposalId: number
    ): Promise<ethers.ContractTransactionResponse | null> {
      if (!fiaContract || !address) return null;
      try {
        return await fiaContract.execute(proposalId);
      } catch (error) {
        console.error('Error executing proposal:', error);
        throw error;
      }
    },
  }), [fiaContract, address]);
}

// Hook for staking operations
export function useStaking() {
  const { fiaContract } = useContracts();
  const { address } = useWallet();

  return useMemo(() => ({
    // Stake tokens
    async stake(
      amount: bigint,
      lockPeriod: number
    ): Promise<ethers.ContractTransactionResponse | null> {
      if (!fiaContract || !address) return null;
      try {
        return await fiaContract.stake(amount, lockPeriod);
      } catch (error) {
        console.error('Error staking:', error);
        throw error;
      }
    },

    // Unstake tokens
    async unstake(): Promise<ethers.ContractTransactionResponse | null> {
      if (!fiaContract || !address) return null;
      try {
        return await fiaContract.unstake();
      } catch (error) {
        console.error('Error unstaking:', error);
        throw error;
      }
    },

    // Claim rewards
    async claimRewards(): Promise<ethers.ContractTransactionResponse | null> {
      if (!fiaContract || !address) return null;
      try {
        return await fiaContract.claimRewards();
      } catch (error) {
        console.error('Error claiming rewards:', error);
        throw error;
      }
    },

    // Get staking APY for lock period
    async getStakingAPY(lockPeriod: number): Promise<bigint | null> {
      if (!fiaContract) return null;
      try {
        return await fiaContract.stakingAPY(lockPeriod);
      } catch (error) {
        console.error('Error getting staking APY:', error);
        return null;
      }
    },
  }), [fiaContract, address]);
}