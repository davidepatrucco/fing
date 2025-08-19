'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const checkConnection = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await browserProvider.listAccounts();
        
        if (accounts.length > 0) {
          const network = await browserProvider.getNetwork();
          const walletSigner = await browserProvider.getSigner();
          
          setState({
            address: accounts[0].address,
            chainId: Number(network.chainId),
            isConnected: true,
            isConnecting: false,
            error: null,
          });
          
          setProvider(browserProvider);
          setSigner(walletSigner);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setState(prev => ({
        ...prev,
        error: 'MetaMask not detected. Please install MetaMask.',
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      await browserProvider.send('eth_requestAccounts', []);
      
      const walletSigner = await browserProvider.getSigner();
      const address = await walletSigner.getAddress();
      const network = await browserProvider.getNetwork();

      setState({
        address,
        chainId: Number(network.chainId),
        isConnected: true,
        isConnecting: false,
        error: null,
      });

      setProvider(browserProvider);
      setSigner(walletSigner);
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
    setProvider(null);
    setSigner(null);
  }, []);

  const getProvider = useCallback(() => {
    return provider;
  }, [provider]);

  const getSigner = useCallback(() => {
    return signer;
  }, [signer]);

  // Check for existing connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accountArray = accounts as string[];
        if (accountArray.length === 0) {
          disconnect();
        } else {
          checkConnection();
        }
      };

      const handleChainChanged = () => {
        checkConnection();
      };

      window.ethereum?.on?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.on?.('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, [checkConnection, disconnect]);

  return {
    ...state,
    connectWallet,
    disconnect,
    getProvider,
    getSigner,
  };
}