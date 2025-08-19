import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('FIACoinV6 - Advanced Transfer Features', function () {
  async function deploy() {
    const [deployer, treasury, founder, alice, bob, charlie, dave] = await ethers.getSigners();
    
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();
    
    // Make treasury and deployer fee-exempt for clean testing
    await fia.setFeeExempt(treasury.address, true);
    await fia.setFeeExempt(deployer.address, true);
    
    // Give deployer some balance just in case
    await (fia.connect(treasury)).transfer(deployer.address, ethers.parseUnits('50000', 18));
    
    // Seed users
    await (fia.connect(treasury)).transfer(alice.address, ethers.parseUnits('10000', 18));
    await (fia.connect(treasury)).transfer(bob.address, ethers.parseUnits('5000', 18));
    await (fia.connect(treasury)).transfer(charlie.address, ethers.parseUnits('3000', 18));
    
    return { fia, deployer, treasury, founder, alice, bob, charlie, dave };
  }

  describe('ProtectedTransfer Function', function () {
    it('should prevent replay attacks with nonce tracking', async function () {
      const { fia, alice, bob } = await deploy();
      
      const amount = ethers.parseUnits('100', 18);
      const nonce = 42;
      
      // First transfer should succeed
      await expect((fia.connect(alice)).protectedTransfer(bob.address, amount, nonce))
        .to.emit(fia, 'Transfer')
        .withArgs(alice.address, bob.address, amount);
      
      // Second transfer with same nonce should fail
      await expect((fia.connect(alice)).protectedTransfer(bob.address, amount, nonce))
        .to.be.revertedWith('Nonce used');
    });

    it('should allow same nonce for different users', async function () {
      const { fia, alice, bob, charlie } = await deploy();
      
      const amount = ethers.parseUnits('100', 18);
      const nonce = 123;
      
      // Alice uses nonce 123
      await (fia.connect(alice)).protectedTransfer(bob.address, amount, nonce);
      
      // Charlie can use the same nonce 123
      await (fia.connect(charlie)).protectedTransfer(bob.address, amount, nonce);
    });

    it('should respect transaction limits for non-exempt users', async function () {
      const { fia, alice, bob } = await deploy();
      
      const limits: any = await fia.txLimits();
      const excessiveAmount = limits.maxTxAmount + 1n;
      const nonce = 456;
      
      await expect((fia.connect(alice)).protectedTransfer(bob.address, excessiveAmount, nonce))
        .to.be.revertedWith('Transaction amount exceeds limit');
    });

    it('should bypass limits for exempt users', async function () {
      const { fia, treasury, alice, bob } = await deploy();
      
      // Make alice exempt
      await fia.setFeeExempt(alice.address, true);
      
      const limits: any = await fia.txLimits();
      const largeAmount = limits.maxTxAmount + ethers.parseUnits('1000', 18);
      const nonce = 789;
      
      // Give alice enough balance
      await (fia.connect(treasury)).transfer(alice.address, largeAmount);
      
      // Should work for exempt user
      await (fia.connect(alice)).protectedTransfer(bob.address, largeAmount, nonce);
    });

    it('should increment nonce usage counter', async function () {
      const { fia, alice, bob } = await deploy();
      
      const amount = ethers.parseUnits('100', 18);
      
      // Use sequential nonces
      for (let i = 1; i <= 5; i++) {
        await (fia.connect(alice)).protectedTransfer(bob.address, amount, i);
      }
      
      // All nonces should be used
      for (let i = 1; i <= 5; i++) {
        await expect((fia.connect(alice)).protectedTransfer(bob.address, amount, i))
          .to.be.revertedWith('Nonce used');
      }
    });
  });

  describe('BatchTransfer Function', function () {
    it('should transfer to multiple recipients successfully', async function () {
      const { fia, alice, bob, charlie, dave } = await deploy();
      
      const recipients = [bob.address, charlie.address, dave.address];
      const amounts = [
        ethers.parseUnits('100', 18),
        ethers.parseUnits('200', 18),
        ethers.parseUnits('300', 18)
      ];
      
      const initialBalances = await Promise.all(
        recipients.map(addr => fia.balanceOf(addr))
      );
      
      await (fia.connect(alice)).batchTransfer(recipients, amounts);
      
      const finalBalances = await Promise.all(
        recipients.map(addr => fia.balanceOf(addr))
      );
      
      for (let i = 0; i < recipients.length; i++) {
        const expectedIncrease = amounts[i] - (amounts[i] * BigInt(await fia.totalFeeBP()) / 10000n);
        expect(finalBalances[i] - initialBalances[i]).to.be.closeTo(expectedIncrease, ethers.parseUnits('10', 18));
      }
    });

    it('should handle large batch sizes', async function () {
      const { fia, treasury, alice } = await deploy();
      
      // Create many recipients
      const recipients = [];
      const amounts = [];
      const batchSize = 20;
      
      for (let i = 0; i < batchSize; i++) {
        const wallet = ethers.Wallet.createRandom();
        recipients.push(wallet.address);
        amounts.push(ethers.parseUnits('10', 18));
      }
      
      // Give alice enough balance
      await (fia.connect(treasury)).transfer(alice.address, ethers.parseUnits('1000', 18));
      
      await (fia.connect(alice)).batchTransfer(recipients, amounts);
      
      // Verify all recipients received tokens
      for (const recipient of recipients) {
        const balance = await fia.balanceOf(recipient);
        expect(balance).to.be.greaterThan(0);
      }
    });

    it('should respect individual transaction limits per transfer', async function () {
      const { fia, alice, bob, charlie } = await deploy();
      
      const limits: any = await fia.txLimits();
      const maxAmount = limits.maxTxAmount;
      
      const recipients = [bob.address, charlie.address];
      const amounts = [maxAmount, maxAmount + 1n]; // Second exceeds limit
      
      await expect((fia.connect(alice)).batchTransfer(recipients, amounts))
        .to.be.revertedWith('Transaction amount exceeds limit');
    });

    it('should emit Transfer events for each recipient', async function () {
      const { fia, alice, bob, charlie } = await deploy();
      
      const recipients = [bob.address, charlie.address];
      const amounts = [
        ethers.parseUnits('100', 18),
        ethers.parseUnits('200', 18)
      ];
      
      const tx = await (fia.connect(alice)).batchTransfer(recipients, amounts);
      const receipt = await tx.wait();
      
      // Should have multiple Transfer events
      const transferEvents = receipt?.logs.filter((log: any) => {
        try {
          const parsed = fia.interface.parseLog(log as any);
          return parsed?.name === 'Transfer' && parsed.args[0] === alice.address;
        } catch {
          return false;
        }
      });
      
      expect(transferEvents?.length).to.be.greaterThanOrEqual(2);
    });

    it('should fail with insufficient balance for total amount', async function () {
      const { fia, alice, bob, charlie } = await deploy();
      
      const balance = await fia.balanceOf(alice.address);
      const totalRequired = balance + ethers.parseUnits('1', 18);
      
      const recipients = [bob.address, charlie.address];
      const amounts = [totalRequired / 2n, totalRequired / 2n];
      
      await expect((fia.connect(alice)).batchTransfer(recipients, amounts))
        .to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });
  });

  describe('TransferWithData Function', function () {
    it('should emit TransferWithData event', async function () {
      const { fia, alice, bob } = await deploy();
      
      const amount = ethers.parseUnits('100', 18);
      const data = ethers.hexlify(ethers.toUtf8Bytes('Test data'));
      
      await expect((fia.connect(alice)).transferWithData(bob.address, amount, data))
        .to.emit(fia, 'TransferWithData')
        .withArgs(alice.address, bob.address, amount, data);
    });

    it('should handle empty data', async function () {
      const { fia, alice, bob } = await deploy();
      
      const amount = ethers.parseUnits('100', 18);
      const emptyData = '0x';
      
      await (fia.connect(alice)).transferWithData(bob.address, amount, emptyData);
    });

    it('should handle various data formats', async function () {
      const { fia, alice, bob } = await deploy();
      
      const amount = ethers.parseUnits('100', 18);
      
      // Test different data types
      const testCases = [
        ethers.hexlify(ethers.toUtf8Bytes('Simple string')),
        '0x1234567890abcdef',
        ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify({id: 123, memo: "payment"}))),
        '0x' + '00'.repeat(100) // 100 bytes of zeros
      ];
      
      for (const data of testCases) {
        await (fia.connect(alice)).transferWithData(bob.address, amount, data);
      }
    });

    it('should still apply fees and limits', async function () {
      const { fia, alice, bob } = await deploy();
      
      const amount = ethers.parseUnits('100', 18);
      const data = ethers.hexlify(ethers.toUtf8Bytes('Fee test'));
      
      const initialBalanceBob = await fia.balanceOf(bob.address);
      
      await (fia.connect(alice)).transferWithData(bob.address, amount, data);
      
      const finalBalanceBob = await fia.balanceOf(bob.address);
      const received = finalBalanceBob - initialBalanceBob;
      
      // Should receive less than sent due to fees
      expect(received).to.be.lessThan(amount);
    });

    it('should integrate with analytics tracking', async function () {
      const { fia, alice, bob } = await deploy();
      
      const amount = ethers.parseUnits('100', 18);
      const data = ethers.hexlify(ethers.toUtf8Bytes('Analytics test'));
      
      const initialStats = await fia.tokenStats();
      
      await (fia.connect(alice)).transferWithData(bob.address, amount, data);
      
      const finalStats = await fia.tokenStats();
      expect(finalStats.transactionCount).to.be.greaterThan(initialStats.transactionCount);
    });
  });

  describe('Complex Transfer Scenarios', function () {
    it('should handle mixed transfer types in sequence', async function () {
      const { fia, alice, bob, charlie, dave } = await deploy();
      
      const amount = ethers.parseUnits('100', 18);
      
      // Regular transfer
      await (fia.connect(alice)).transfer(bob.address, amount);
      
      // Protected transfer
      await (fia.connect(alice)).protectedTransfer(charlie.address, amount, 1);
      
      // Transfer with data
      const data = ethers.hexlify(ethers.toUtf8Bytes('Mixed sequence'));
      await (fia.connect(alice)).transferWithData(dave.address, amount, data);
      
      // Batch transfer
      await (fia.connect(alice)).batchTransfer(
        [bob.address, charlie.address],
        [amount, amount]
      );
      
      // Verify all recipients have received tokens
      for (const recipient of [bob.address, charlie.address, dave.address]) {
        const balance = await fia.balanceOf(recipient);
        expect(balance).to.be.greaterThan(0);
      }
    });

    it('should maintain consistent analytics across transfer types', async function () {
      const { fia, alice, bob, charlie } = await deploy();
      
      const amount = ethers.parseUnits('100', 18);
      const initialStats = await fia.tokenStats();
      
      // Different transfer types
      await (fia.connect(alice)).transfer(bob.address, amount);
      await (fia.connect(alice)).protectedTransfer(charlie.address, amount, 1);
      await (fia.connect(alice)).transferWithData(bob.address, amount, '0x1234');
      
      const finalStats = await fia.tokenStats();
      expect(finalStats.transactionCount - initialStats.transactionCount).to.equal(3);
    });

    it('should handle transfers with fee exemptions correctly', async function () {
      const { fia, alice, bob, charlie } = await deploy();
      
      // Make charlie exempt
      await fia.setFeeExempt(charlie.address, true);
      
      const amount = ethers.parseUnits('100', 18);
      
      // Transfer to non-exempt user (fees apply)
      const bobInitial = await fia.balanceOf(bob.address);
      await (fia.connect(alice)).transfer(bob.address, amount);
      const bobFinal = await fia.balanceOf(bob.address);
      const bobReceived = bobFinal - bobInitial;
      
      // Transfer to exempt user (no fees)
      const charlieInitial = await fia.balanceOf(charlie.address);
      await (fia.connect(alice)).transfer(charlie.address, amount);
      const charlieFinal = await fia.balanceOf(charlie.address);
      const charlieReceived = charlieFinal - charlieInitial;
      
      // Exempt user should receive full amount
      expect(charlieReceived).to.equal(amount);
      expect(bobReceived).to.be.lessThan(amount);
    });
  });
}).timeout(120000);
