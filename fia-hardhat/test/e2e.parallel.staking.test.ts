import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('E2E: Parallel Staking Operations on Multiple Contracts', function () {
  let fiaFactory: any;
  let deployer: any, treasury: any, founder: any;
  let users: any[];
  
  // Lock periods in seconds
  const LOCK_30_DAYS = 30 * 24 * 60 * 60;
  const LOCK_90_DAYS = 90 * 24 * 60 * 60;
  const LOCK_180_DAYS = 180 * 24 * 60 * 60;
  const LOCK_365_DAYS = 365 * 24 * 60 * 60;
  
  const lockPeriods = [LOCK_30_DAYS, LOCK_90_DAYS, LOCK_180_DAYS, LOCK_365_DAYS];
  
  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [deployer, treasury, founder, ...users] = signers;
    fiaFactory = await ethers.getContractFactory('FIACoinV5');
  });

  async function deployAndSetupContract() {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);
    
    // Add significant reward pool
    await fia.addToRewardPool(ethers.parseUnits('1000000', 18));
    
    return fia;
  }

  async function fundUser(fia: any, user: any, amount: string) {
    await fia.transfer(user.address, ethers.parseUnits(amount, 18));
  }

  describe('Multiple Contract Parallel Operations', function () {
    it('should handle staking operations across 5 contracts simultaneously', async function () {
      this.timeout(60000); // Increase timeout for parallel operations
      
      // Deploy 5 contracts
      const contractPromises = Array(5).fill(null).map(() => deployAndSetupContract());
      const contracts = await Promise.all(contractPromises);
      
      // Use 10 users, 2 per contract
      const usersPerContract = 2;
      const stakeAmount = ethers.parseUnits('10000', 18);
      
      // Fund users for each contract
      const fundingPromises = [];
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const contractUsers = users.slice(contractIndex * usersPerContract, (contractIndex + 1) * usersPerContract);
        
        for (const user of contractUsers) {
          fundingPromises.push(fundUser(contract, user, '20000')); // Extra for multiple stakes
        }
      }
      await Promise.all(fundingPromises);
      
      // Phase 1: All users stake simultaneously across all contracts
      const stakingPromises = [];
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const contractUsers = users.slice(contractIndex * usersPerContract, (contractIndex + 1) * usersPerContract);
        
        for (let userIndex = 0; userIndex < contractUsers.length; userIndex++) {
          const user = contractUsers[userIndex];
          const userContract = contract.connect(user);
          const lockPeriod = lockPeriods[userIndex % lockPeriods.length];
          const autoCompound = userIndex % 2 === 0;
          
          stakingPromises.push(
            userContract.stake(stakeAmount, lockPeriod, autoCompound)
          );
        }
      }
      
      await Promise.all(stakingPromises);
      
      // Verify all stakes were created
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const totalStaked = await contract.totalStaked();
        const expectedTotal = BigInt(stakeAmount.toString()) * BigInt(usersPerContract);
        expect(BigInt(totalStaked.toString())).to.equal(expectedTotal);
      }
      
      // Phase 2: Time advancement and mixed operations
      await ethers.provider.send('evm_increaseTime', [15 * 24 * 60 * 60]); // 15 days
      await ethers.provider.send('evm_mine');
      
      // Mixed operations: some stake more, some claim rewards
      const mixedPromises = [];
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const contractUsers = users.slice(contractIndex * usersPerContract, (contractIndex + 1) * usersPerContract);
        
        // First user stakes again
        const user0Contract = contract.connect(contractUsers[0]);
        mixedPromises.push(
          user0Contract.stake(stakeAmount, LOCK_90_DAYS, true)
        );
        
        // Second user claims rewards
        const user1Contract = contract.connect(contractUsers[1]);
        mixedPromises.push(
          user1Contract.claimRewards(0)
        );
      }
      
      await Promise.all(mixedPromises);
      
      // Verify final state
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const totalStaked = await contract.totalStaked();
        // Should have original stakes plus one additional stake per contract
        const expectedTotal = BigInt(stakeAmount.toString()) * BigInt(usersPerContract + 1);
        expect(BigInt(totalStaked.toString())).to.equal(expectedTotal);
      }
    });

    it('should handle overlapping events across 10 contracts with time-based operations', async function () {
      this.timeout(90000); // Increase timeout for complex operations
      
      // Deploy 10 contracts
      const contractPromises = Array(10).fill(null).map(() => deployAndSetupContract());
      const contracts = await Promise.all(contractPromises);
      
      // Use 1 user per contract for simplicity
      const usersPerContract = 1;
      const stakeAmount = ethers.parseUnits('15000', 18);
      
      // Fund users for each contract
      const fundingPromises = [];
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const user = users[contractIndex];
        fundingPromises.push(fundUser(contract, user, '30000'));
      }
      await Promise.all(fundingPromises);
      
      // Phase 1: Staggered staking with different lock periods
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const user = users[contractIndex];
        const userContract = contract.connect(user);
        const lockPeriod = lockPeriods[contractIndex % lockPeriods.length];
        
        await userContract.stake(stakeAmount, lockPeriod, contractIndex % 2 === 0);
        
        // Small time advancement between stakes to simulate real-world timing
        if (contractIndex < contracts.length - 1) {
          await ethers.provider.send('evm_increaseTime', [3600]); // 1 hour
          await ethers.provider.send('evm_mine');
        }
      }
      
      // Phase 2: Parallel reward claiming after significant time
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]); // 30 days
      await ethers.provider.send('evm_mine');
      
      const claimPromises = [];
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const user = users[contractIndex];
        const userContract = contract.connect(user);
        
        claimPromises.push(userContract.claimRewards(0));
      }
      
      await Promise.all(claimPromises);
      
      // Phase 3: Mixed unstaking operations
      await ethers.provider.send('evm_increaseTime', [5 * 24 * 60 * 60]); // 5 more days
      await ethers.provider.send('evm_mine');
      
      const unstakePromises = [];
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const user = users[contractIndex];
        const userContract = contract.connect(user);
        
        // Check if lock period has passed (30-day locks should be unlocked by now)
        const stakeInfo = await contract.userStakes(user.address, 0);
        const lockPeriod = stakeInfo.lockPeriod;
        
        if (lockPeriod === LOCK_30_DAYS) {
          unstakePromises.push(userContract.unstake(0));
        }
      }
      
      if (unstakePromises.length > 0) {
        await Promise.all(unstakePromises);
      }
      
      // Verify final states
      let totalStakedAcrossAllContracts = 0n;
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const totalStaked = await contract.totalStaked();
        totalStakedAcrossAllContracts += BigInt(totalStaked.toString());
      }
      
      // Should have some tokens still staked (non-30-day locks)
      expect(totalStakedAcrossAllContracts > 0n).to.be.true;
    });

    it('should maintain data integrity across concurrent operations on multiple contracts', async function () {
      this.timeout(60000);
      
      // Deploy 5 contracts
      const contracts = await Promise.all(
        Array(5).fill(null).map(() => deployAndSetupContract())
      );
      
      const usersPerContract = 2;
      const stakeAmount = ethers.parseUnits('8000', 18);
      
      // Fund users
      const fundingPromises = [];
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const contractUsers = users.slice(contractIndex * usersPerContract, (contractIndex + 1) * usersPerContract);
        
        for (const user of contractUsers) {
          fundingPromises.push(fundUser(contract, user, '25000'));
        }
      }
      await Promise.all(fundingPromises);
      
      // Perform multiple rounds of operations
      for (let round = 0; round < 3; round++) {
        const roundPromises = [];
        
        for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
          const contract = contracts[contractIndex];
          const contractUsers = users.slice(contractIndex * usersPerContract, (contractIndex + 1) * usersPerContract);
          
          for (let userIndex = 0; userIndex < contractUsers.length; userIndex++) {
            const user = contractUsers[userIndex];
            const userContract = contract.connect(user);
            
            // Different operations per round
            if (round === 0) {
              // Round 0: Stake
              const lockPeriod = lockPeriods[(contractIndex + userIndex) % lockPeriods.length];
              roundPromises.push(
                userContract.stake(stakeAmount, lockPeriod, round % 2 === 0)
              );
            } else if (round === 1) {
              // Round 1: Claim rewards (after time advancement)
              roundPromises.push(
                userContract.claimRewards(round - 1)
              );
            } else {
              // Round 2: Stake again
              roundPromises.push(
                userContract.stake(stakeAmount, LOCK_30_DAYS, true)
              );
            }
          }
        }
        
        await Promise.all(roundPromises);
        
        // Advance time between rounds
        if (round < 2) {
          await ethers.provider.send('evm_increaseTime', [20 * 24 * 60 * 60]); // 20 days
          await ethers.provider.send('evm_mine');
        }
      }
      
      // Verify data integrity
      for (let contractIndex = 0; contractIndex < contracts.length; contractIndex++) {
        const contract = contracts[contractIndex];
        const contractUsers = users.slice(contractIndex * usersPerContract, (contractIndex + 1) * usersPerContract);
        
        for (let userIndex = 0; userIndex < contractUsers.length; userIndex++) {
          const user = contractUsers[userIndex];
          
          // Each user should have 2 stakes (round 0 and round 2)
          const stake0 = await contract.userStakes(user.address, 0);
          const stake1 = await contract.userStakes(user.address, 1);
          
          // First stake might have auto-compounded rewards, so check it's at least the original amount
          expect(BigInt(stake0.amount.toString()) >= BigInt(stakeAmount.toString())).to.be.true;
          expect(BigInt(stake1.amount.toString()) >= BigInt(stakeAmount.toString())).to.be.true;
        }
        
        // Total staked should be at least the expected minimum (original stakes might have grown due to auto-compound)
        const totalStaked = await contract.totalStaked();
        const expectedMinimum = BigInt(stakeAmount.toString()) * BigInt(usersPerContract * 2); // 2 stakes per user
        expect(BigInt(totalStaked.toString()) >= expectedMinimum).to.be.true;
      }
    });
  });

  describe('Performance and Scalability', function () {
    it('should efficiently handle mass staking operations', async function () {
      this.timeout(120000); // Long timeout for performance test
      
      const contract = await deployAndSetupContract();
      const massUsers = users.slice(0, 20); // Use 20 users
      const stakeAmount = ethers.parseUnits('5000', 18);
      
      // Fund all users
      const fundingPromises = massUsers.map(user => 
        fundUser(contract, user, '10000')
      );
      await Promise.all(fundingPromises);
      
      // Measure time for mass staking
      const startTime = Date.now();
      
      // All users stake simultaneously
      const stakingPromises = massUsers.map((user, index) => {
        const userContract = contract.connect(user);
        const lockPeriod = lockPeriods[index % lockPeriods.length];
        return userContract.stake(stakeAmount, lockPeriod, index % 2 === 0);
      });
      
      await Promise.all(stakingPromises);
      
      const stakingTime = Date.now() - startTime;
      console.log(`Mass staking of ${massUsers.length} users took ${stakingTime}ms`);
      
      // Verify all stakes
      const totalStaked = await contract.totalStaked();
      const expectedTotal = BigInt(stakeAmount.toString()) * BigInt(massUsers.length);
      expect(BigInt(totalStaked.toString())).to.equal(expectedTotal);
      
      // Time advancement and mass claiming
      await ethers.provider.send('evm_increaseTime', [10 * 24 * 60 * 60]); // 10 days
      await ethers.provider.send('evm_mine');
      
      const claimStartTime = Date.now();
      
      const claimPromises = massUsers.map(user => {
        const userContract = contract.connect(user);
        return userContract.claimRewards(0);
      });
      
      await Promise.all(claimPromises);
      
      const claimTime = Date.now() - claimStartTime;
      console.log(`Mass claiming for ${massUsers.length} users took ${claimTime}ms`);
      
      // Verify rewards were processed (check that reward pool decreased)
      const finalRewardPool = await contract.rewardPool();
      const initialRewardPool = ethers.parseUnits('1000000', 18);
      expect(BigInt(finalRewardPool.toString()) < BigInt(initialRewardPool.toString())).to.be.true;
    });
  });
});