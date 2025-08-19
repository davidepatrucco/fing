import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { FIACoinV6Upgradeable, FIACoinV7Upgradeable } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("FIACoin Proxy Pattern", function () {
    let fiaV6: FIACoinV6Upgradeable;
    let fiaV7: FIACoinV7Upgradeable;
    let owner: HardhatEthersSigner;
    let treasury: HardhatEthersSigner;
    let founder: HardhatEthersSigner;
    let executor: HardhatEthersSigner;
    let user1: HardhatEthersSigner;
    let user2: HardhatEthersSigner;
    let proxyAddress: string;

    const TOTAL_SUPPLY = ethers.parseEther("1000000000000000"); // 1000T tokens

    beforeEach(async function () {
        [owner, treasury, founder, executor, user1, user2] = await ethers.getSigners();

        // Deploy V6 with proxy
        const FIACoinV6Factory = await ethers.getContractFactory("FIACoinV6Upgradeable");
        fiaV6 = await upgrades.deployProxy(
            FIACoinV6Factory,
            [treasury.address, founder.address, executor.address],
            { initializer: 'initialize', kind: 'uups' }
        ) as unknown as FIACoinV6Upgradeable;

        proxyAddress = await fiaV6.getAddress();
    });

    describe("Initial Deployment", function () {
        it("Should deploy proxy with correct initial values", async function () {
            expect(await fiaV6.name()).to.equal("FIA");
            expect(await fiaV6.symbol()).to.equal("FIA");
            expect(await fiaV6.totalSupply()).to.equal(TOTAL_SUPPLY);
            expect(await fiaV6.owner()).to.equal(owner.address);
            expect(await fiaV6.treasury()).to.equal(treasury.address);
            expect(await fiaV6.founderWallet()).to.equal(founder.address);
            expect(await fiaV6.executor()).to.equal(executor.address);
            expect(await fiaV6.version()).to.equal("6.0.0");
        });

        it("Should have correct fee configuration", async function () {
            expect(await fiaV6.totalFeeBP()).to.equal(100); // 1%
            expect(await fiaV6.feeToTreasuryBP()).to.equal(50); // 0.5%
            expect(await fiaV6.feeToFounderBP()).to.equal(20); // 0.2%
            expect(await fiaV6.feeToBurnBP()).to.equal(30); // 0.3%
        });

        it("Should have owner balance equal to total supply", async function () {
            expect(await fiaV6.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
        });
    });

    describe("V6 Functionality", function () {
        beforeEach(async function () {
            // Give user1 some tokens for testing
            await fiaV6.transfer(user1.address, ethers.parseEther("1000"));
        });

        it("Should allow staking", async function () {
            const stakeAmount = ethers.parseEther("100");
            const lockPeriod = await fiaV6.LOCK_30_DAYS();

            await fiaV6.connect(user1).stake(stakeAmount, lockPeriod, false);

            expect(await fiaV6.getStakeCount(user1.address)).to.equal(1);
            expect(await fiaV6.totalStaked()).to.equal(stakeAmount);

            const stake = await fiaV6.userStakes(user1.address, 0);
            expect(stake.amount).to.equal(stakeAmount);
            expect(stake.lockPeriod).to.equal(lockPeriod);
            expect(stake.autoCompound).to.equal(false);
        });

        it("Should calculate rewards correctly", async function () {
            const stakeAmount = ethers.parseEther("100");
            const lockPeriod = await fiaV6.LOCK_30_DAYS();

            await fiaV6.connect(user1).stake(stakeAmount, lockPeriod, false);

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine", []);

            const rewards = await fiaV6.calculateRewards(user1.address, 0);
            expect(rewards).to.be.gt(0);
        });

        it("Should allow governance operations", async function () {
            // Give user1 enough tokens for proposal threshold
            await fiaV6.transfer(user1.address, ethers.parseEther("1000000"));

            const description = "Test proposal";
            const proposalType = 0; // FEE_CHANGE
            const proposalData = "0x";

            await fiaV6.connect(user1).propose(description, proposalType, proposalData);

            expect(await fiaV6.proposalCount()).to.equal(1);

            const proposal = await fiaV6.proposals(1);
            expect(proposal.description).to.equal(description);
            expect(proposal.proposer).to.equal(user1.address);
        });
    });

    describe("Upgrade to V7", function () {
        beforeEach(async function () {
            // Setup some state in V6
            await fiaV6.transfer(user1.address, ethers.parseEther("1000"));
            await fiaV6.transfer(user2.address, ethers.parseEther("500"));

            // User1 stakes some tokens
            const stakeAmount = ethers.parseEther("100");
            const lockPeriod = await fiaV6.LOCK_90_DAYS();
            await fiaV6.connect(user1).stake(stakeAmount, lockPeriod, true);

            // Add some rewards to pool
            await fiaV6.addToRewardPool(ethers.parseEther("1000"));
        });

        it("Should upgrade to V7 preserving all state", async function () {
            // Record state before upgrade
            const balanceUser1Before = await fiaV6.balanceOf(user1.address);
            const balanceUser2Before = await fiaV6.balanceOf(user2.address);
            const totalSupplyBefore = await fiaV6.totalSupply();
            const totalStakedBefore = await fiaV6.totalStaked();
            const rewardPoolBefore = await fiaV6.rewardPool();
            const stakeCountBefore = await fiaV6.getStakeCount(user1.address);

            // Upgrade to V7
            const FIACoinV7Factory = await ethers.getContractFactory("FIACoinV7Upgradeable");
            fiaV7 = await upgrades.upgradeProxy(proxyAddress, FIACoinV7Factory) as unknown as FIACoinV7Upgradeable;

            // Verify the proxy address didn't change
            expect(await fiaV7.getAddress()).to.equal(proxyAddress);

            // Verify version changed
            expect(await fiaV7.version()).to.equal("7.0.0");

            // Verify all state is preserved
            expect(await fiaV7.balanceOf(user1.address)).to.equal(balanceUser1Before);
            expect(await fiaV7.balanceOf(user2.address)).to.equal(balanceUser2Before);
            expect(await fiaV7.totalSupply()).to.equal(totalSupplyBefore);
            expect(await fiaV7.totalStaked()).to.equal(totalStakedBefore);
            expect(await fiaV7.rewardPool()).to.equal(rewardPoolBefore);
            expect(await fiaV7.getStakeCount(user1.address)).to.equal(stakeCountBefore);

            // Verify stake details are preserved
            const stake = await fiaV7.userStakes(user1.address, 0);
            expect(stake.amount).to.equal(ethers.parseEther("100"));
            expect(stake.autoCompound).to.equal(true);
        });

        it("Should initialize V7 features", async function () {
            // Upgrade to V7
            const FIACoinV7Factory = await ethers.getContractFactory("FIACoinV7Upgradeable");
            fiaV7 = await upgrades.upgradeProxy(proxyAddress, FIACoinV7Factory) as unknown as FIACoinV7Upgradeable;

            // Initialize V7 features
            await fiaV7.initializeV7();

            expect(await fiaV7.dynamicAPYEnabled()).to.equal(true);
            expect(await fiaV7.baseAPYMultiplier()).to.equal(10000);
            expect(await fiaV7.bugFixVersion()).to.equal(1);
        });

        it("Should have improved reward calculation in V7", async function () {
            // Upgrade to V7
            const FIACoinV7Factory = await ethers.getContractFactory("FIACoinV7Upgradeable");
            fiaV7 = await upgrades.upgradeProxy(proxyAddress, FIACoinV7Factory) as unknown as FIACoinV7Upgradeable;

            await fiaV7.initializeV7();

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine", []);

            // V7 should calculate rewards differently (with dynamic APY)
            const rewardsV7 = await fiaV7.calculateRewards(user1.address, 0);
            expect(rewardsV7).to.be.gt(0);

            // Check effective APY is different from base APY due to dynamic bonus
            const lockPeriod = await fiaV7.LOCK_90_DAYS();
            const baseAPY = await fiaV7.stakingAPY(lockPeriod);
            const effectiveAPY = await fiaV7.getEffectiveAPY(lockPeriod);
            
            // Effective APY should be higher due to staking bonus
            expect(effectiveAPY).to.be.gte(baseAPY);
        });

        it("Should support new V7 features", async function () {
            // Upgrade to V7
            const FIACoinV7Factory = await ethers.getContractFactory("FIACoinV7Upgradeable");
            fiaV7 = await upgrades.upgradeProxy(proxyAddress, FIACoinV7Factory) as unknown as FIACoinV7Upgradeable;

            await fiaV7.initializeV7();

            // Test emergency withdrawal feature
            await fiaV7.connect(user1).setEmergencyWithdrawal(true);
            expect(await fiaV7.emergencyWithdrawalEnabled(user1.address)).to.equal(true);

            // Test batch staking
            const amounts = [ethers.parseEther("50"), ethers.parseEther("30")];
            const lockPeriods = [await fiaV7.LOCK_30_DAYS(), await fiaV7.LOCK_90_DAYS()];
            const autoCompounds = [false, true];

            await fiaV7.connect(user1).batchStake(amounts, lockPeriods, autoCompounds);

            expect(await fiaV7.getStakeCount(user1.address)).to.equal(3); // 1 from before + 2 new

            // Test user staking info
            const stakingInfo = await fiaV7.getUserStakingInfo(user1.address);
            expect(stakingInfo.activeStakes).to.equal(3);
            expect(stakingInfo.totalUserStaked).to.equal(ethers.parseEther("180")); // 100 + 50 + 30
        });

        it("Should allow emergency unstaking in V7", async function () {
            // Upgrade to V7
            const FIACoinV7Factory = await ethers.getContractFactory("FIACoinV7Upgradeable");
            fiaV7 = await upgrades.upgradeProxy(proxyAddress, FIACoinV7Factory) as unknown as FIACoinV7Upgradeable;

            await fiaV7.initializeV7();

            // Enable emergency withdrawal
            await fiaV7.connect(user1).setEmergencyWithdrawal(true);

            const balanceBefore = await fiaV7.balanceOf(user1.address);

            // Emergency unstake (should apply penalty)
            await fiaV7.connect(user1).unstake(0);

            const balanceAfter = await fiaV7.balanceOf(user1.address);
            const balanceIncrease = balanceAfter - balanceBefore;

            // Should receive less than full amount due to 10% penalty
            expect(balanceIncrease).to.be.lt(ethers.parseEther("100"));
            expect(balanceIncrease).to.equal(ethers.parseEther("90")); // 100 - 10% penalty
        });
    });

    describe("Proxy Security", function () {
        it("Should only allow owner to upgrade", async function () {
            const FIACoinV7Factory = await ethers.getContractFactory("FIACoinV7Upgradeable");

            // Non-owner should not be able to upgrade
            await expect(
                upgrades.upgradeProxy(proxyAddress, FIACoinV7Factory.connect(user1))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should transfer ownership and upgrade with new owner", async function () {
            // Transfer ownership to user1
            await fiaV6.transferOwnership(user1.address);

            // Now user1 should be able to upgrade
            const FIACoinV7Factory = await ethers.getContractFactory("FIACoinV7Upgradeable");
            fiaV7 = await upgrades.upgradeProxy(
                proxyAddress, 
                FIACoinV7Factory.connect(user1)
            ) as unknown as FIACoinV7Upgradeable;

            expect(await fiaV7.version()).to.equal("7.0.0");
            expect(await fiaV7.owner()).to.equal(user1.address);
        });
    });

    describe("Seamless User Experience", function () {
        it("Should demonstrate zero-friction upgrade for users", async function () {
            // User interaction before upgrade
            await fiaV6.transfer(user1.address, ethers.parseEther("1000"));
            
            const contractAddress = await fiaV6.getAddress();
            const balanceBefore = await fiaV6.balanceOf(user1.address);

            // Admin upgrades (user doesn't know/care)
            const FIACoinV7Factory = await ethers.getContractFactory("FIACoinV7Upgradeable");
            fiaV7 = await upgrades.upgradeProxy(proxyAddress, FIACoinV7Factory) as unknown as FIACoinV7Upgradeable;

            // User continues using same address
            expect(await fiaV7.getAddress()).to.equal(contractAddress);
            expect(await fiaV7.balanceOf(user1.address)).to.equal(balanceBefore);

            // User can still transfer (same interface)
            await fiaV7.connect(user1).transfer(user2.address, ethers.parseEther("100"));
            expect(await fiaV7.balanceOf(user1.address)).to.equal(ethers.parseEther("900"));

            // But now has access to new V7 features
            await fiaV7.initializeV7();
            await fiaV7.connect(user1).setEmergencyWithdrawal(true);
            expect(await fiaV7.emergencyWithdrawalEnabled(user1.address)).to.equal(true);
        });
    });
});
