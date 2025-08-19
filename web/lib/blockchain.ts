import { ethers } from 'ethers';

// Legacy FIA Contract ABI - minimal version with Fingered event
const FIA_ABI = [
  // Standard ERC20 functions
  "function name() view returns (string)",
  "function symbol() view returns (string)", 
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  
  // FIA specific functions
  "function treasury() view returns (address)",
  "function founderWallet() view returns (address)",
  "function totalFeeBP() view returns (uint256)",
  "function isFeeExempt(address account) view returns (bool)",
  "function burn(uint256 amount)",
  
  // Events
  "event Fingered(address indexed from, address indexed to, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

export interface ContractInfo {
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

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contract?: ethers.Contract;

  constructor() {
    const rpcUrl = process.env.RPC_BASE_SEPOLIA || process.env.NEXT_PUBLIC_RPC_URL || process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA || 'https://sepolia.base.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  // Get basic contract instances for V5 features (using generic ethers.Contract for now)
  getFiaV5Contract(address: string, signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
    // Extended ABI for FIACoinV5 features
    const FIACOIN_V5_ABI = [
      ...FIA_ABI,
      // Governance functions
      "function proposalCount() view returns (uint256)",
      "function proposals(uint256) view returns (tuple(address proposer, string description, uint256 startTime, uint256 endTime, uint256 forVotes, uint256 againstVotes, bool executed, uint8 proposalType, bytes proposalData))",
      "function getVotingPower(address account) view returns (uint256)",
      "function createProposal(string description, uint8 proposalType, bytes proposalData)",
      "function vote(uint256 proposalId, bool support)",
      "function executeProposal(uint256 proposalId)",
      "function PROPOSAL_THRESHOLD() view returns (uint256)",
      
      // Staking functions
      "function stake(uint256 amount, uint256 lockPeriod, bool autoCompound)",
      "function unstake(uint256 index)",
      "function claimStakingRewards()",
      "function getStakingRewards(address account) view returns (uint256)",
      "function getStakingLeaderboard() view returns (address[] memory addresses, uint256[] memory amounts)",
      
      // Protected transfer functions
      "function protectedTransfer(address to, uint256 amount, uint256 nonce)",
      "function lastTxBlock(address account) view returns (uint256)",
      "function lastTxTime(address account) view returns (uint256)",
      
      // Events
      "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description)",
      "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight)",
      "event ProposalExecuted(uint256 indexed proposalId)",
      "event Staked(address indexed user, uint256 amount, uint256 lockPeriod)",
      "event Unstaked(address indexed user, uint256 amount)",
      "event RewardClaimed(address indexed user, uint256 amount)"
    ];
    
    return new ethers.Contract(address, FIACOIN_V5_ABI, signerOrProvider || this.provider);
  }

  getMultisigContract(address: string, signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
    const MULTISIG_ABI = [
      "function submitTransaction(address destination, uint256 value, bytes data) returns (uint256)",
      "function confirmTransaction(uint256 transactionId)",
      "function executeTransaction(uint256 transactionId)",
      "function getTransactionCount() view returns (uint256)",
      "function transactions(uint256) view returns (tuple(address destination, uint256 value, bytes data, bool executed))",
      "function confirmations(uint256, address) view returns (bool)",
      "function getConfirmationCount(uint256) view returns (uint256)",
      "function required() view returns (uint256)",
      "function owners(uint256) view returns (address)",
      "function isOwner(address) view returns (bool)",
      "event Submission(uint256 indexed transactionId)",
      "event Confirmation(address indexed sender, uint256 indexed transactionId)",
      "event Execution(uint256 indexed transactionId)",
      "event ExecutionFailure(uint256 indexed transactionId)"
    ];
    
    return new ethers.Contract(address, MULTISIG_ABI, signerOrProvider || this.provider);
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  async getContractInfo(contractAddress: string): Promise<ContractInfo> {
    if (!contractAddress) {
      throw new Error('Contract address not configured');
    }

    const contract = new ethers.Contract(contractAddress, FIA_ABI, this.provider);
    
    try {
      const [name, symbol, decimals, totalSupply, treasury, founder] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
        contract.treasury(),
        contract.founderWallet()
      ]);

      return {
        address: contractAddress,
        network: 'baseSepolia',
        verified: true, // We'll assume it's verified for now
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
        treasury,
        founder
      };
    } catch (error) {
      console.error('Error fetching contract info:', error);
      return {
        address: contractAddress,
        network: 'baseSepolia',
        verified: false
      };
    }
  }

  async getFingeredEvents(contractAddress: string, fromBlock: number = 0, toBlock: number | string = 'latest'): Promise<Array<{
    blockNumber: number;
    txHash: string;
    from: string;
    to: string;
    amount: string;
    timestamp: number;
  }>> {
    if (!contractAddress) {
      return [];
    }

    const contract = new ethers.Contract(contractAddress, FIA_ABI, this.provider);
    
    try {
      const filter = contract.filters.Fingered();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);
      
      return events.map(event => {
        const eventLog = event as ethers.EventLog;
        return {
          blockNumber: eventLog.blockNumber,
          txHash: eventLog.transactionHash,
          from: eventLog.args?.[0] || '',
          to: eventLog.args?.[1] || '',
          amount: eventLog.args?.[2]?.toString() || '0',
          timestamp: 0 // We'll need to fetch this separately if needed
        };
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  async getBlockTimestamp(blockNumber: number): Promise<number> {
    try {
      const block = await this.provider.getBlock(blockNumber);
      return block?.timestamp || 0;
    } catch (error) {
      console.error('Error fetching block timestamp:', error);
      return Date.now() / 1000;
    }
  }

  async getCurrentBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch {
      console.error('Error fetching current block number');
      return 0;
    }
  }

  // Utility function to format token amounts
  static formatTokenAmount(amount: string, decimals: number = 18): string {
    try {
      const formatted = ethers.formatUnits(amount, decimals);
      const num = parseFloat(formatted);
      
      if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
      } else {
        return num.toFixed(6);
      }
    } catch {
      return '0';
    }
  }

  // Utility function to validate Ethereum address
  static isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
}

export const blockchainService = new BlockchainService();