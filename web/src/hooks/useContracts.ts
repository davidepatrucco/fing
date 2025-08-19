'use client';

import { useCallback } from 'react';
import { ethers } from 'ethers';
import { blockchainService } from '../../lib/blockchain';

export function useContracts() {
  const getFiaContract = useCallback((
    providerOrSigner: ethers.Provider | ethers.Signer,
    address?: string
  ): ethers.Contract => {
    const contractAddress = address || 
      process.env.NEXT_PUBLIC_FIA_V5_CONTRACT_ADDRESS || 
      process.env.NEXT_PUBLIC_FIA_CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      throw new Error('FIA contract address not configured');
    }
    
    return blockchainService.getFiaV5Contract(contractAddress, providerOrSigner);
  }, []);

  const getMultisigContract = useCallback((
    providerOrSigner: ethers.Provider | ethers.Signer,
    address?: string
  ): ethers.Contract => {
    const contractAddress = address || process.env.NEXT_PUBLIC_MULTISIG_CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      throw new Error('Multisig contract address not configured');
    }
    
    return blockchainService.getMultisigContract(contractAddress, providerOrSigner);
  }, []);

  return {
    getFiaContract,
    getMultisigContract,
  };
}