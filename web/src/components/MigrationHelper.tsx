'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContracts } from '../hooks/useContracts';
import { ethers } from 'ethers';

interface MigrationStatus {
  migrationEnabled: boolean;
  hasMigrated: boolean;
  v6Balance: string;
  v6StakeCount: number;
  v7Balance: string;
  estimatedGasCost: string;
}

export default function MigrationHelper() {
  const { isConnected, getSigner, address } = useWallet();
  const { getFiaV6Contract } = useContracts();
  
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    migrationEnabled: false,
    hasMigrated: false,
    v6Balance: '0',
    v6StakeCount: 0,
    v7Balance: '0',
    estimatedGasCost: '0'
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0: check, 1: confirm, 2: executing, 3: complete

  // ✅ Check if migration is needed and available
  const checkMigrationStatus = async () => {
    if (!isConnected || !address) return;

    try {
      setLoading(true);
      
      const signer = getSigner();
      if (!signer) return;

      // Get migration contract (assuming it's deployed)
      const migrationContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MIGRATION_CONTRACT_ADDRESS!,
        MIGRATION_ABI,
        signer
      );

      const v6Contract = getFiaV6Contract(signer);

      const [
        migrationData,
        v6Balance,
        v6StakeCount,
        gasEstimate
      ] = await Promise.all([
        migrationContract.getMigrationStatus(address),
        v6Contract.balanceOf(address),
        v6Contract.getStakeCount(address),
        migrationContract.estimateGas.migrate().catch(() => BigInt(300000)) // fallback
      ]);

      setMigrationStatus({
        migrationEnabled: migrationData.eligible,
        hasMigrated: migrationData.completed,
        v6Balance: ethers.formatEther(v6Balance),
        v6StakeCount: Number(v6StakeCount),
        v7Balance: migrationData.completed ? ethers.formatEther(v6Balance) : '0',
        estimatedGasCost: ethers.formatEther(gasEstimate * BigInt(20000000000)) // 20 gwei
      });

    } catch (err) {
      console.error('Error checking migration status:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Execute migration with user-friendly steps
  const executeMigration = async () => {
    if (!isConnected) return;

    try {
      setStep(2); // executing
      setLoading(true);

      const signer = getSigner();
      if (!signer) throw new Error('No signer available');

      const migrationContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MIGRATION_CONTRACT_ADDRESS!,
        MIGRATION_ABI,
        signer
      );

      // Step 1: Execute migration
      const tx = await migrationContract.migrate();
      
      // Step 2: Wait for confirmation
      const receipt = await tx.wait();
      
      // Step 3: Verify migration completed
      await checkMigrationStatus();
      
      setStep(3); // complete

    } catch (err: any) {
      console.error('Migration failed:', err);
      alert(`Migration failed: ${err.message}`);
      setStep(1); // back to confirm
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      checkMigrationStatus();
    }
  }, [isConnected, address]);

  // 🚨 Show migration banner if needed
  if (!migrationStatus.migrationEnabled) {
    return null; // No migration needed
  }

  if (migrationStatus.hasMigrated) {
    return (
      <div className="alert alert-success">
        <span>✅ You have successfully migrated to FIACoin V7!</span>
      </div>
    );
  }

  return (
    <div className="card bg-error text-error-content shadow-xl mb-8">
      <div className="card-body">
        <h2 className="card-title">
          🚨 Migration Required - Action Needed
        </h2>
        
        {step === 0 && (
          <div>
            <p className="mb-4">
              A critical issue was discovered in FIACoin V6. Your funds are safe, but you need to migrate to V7.
            </p>
            
            <div className="stats stats-vertical lg:stats-horizontal bg-error-content text-error">
              <div className="stat">
                <div className="stat-title text-error">V6 Balance</div>
                <div className="stat-value text-error">{parseFloat(migrationStatus.v6Balance).toLocaleString()} FIA</div>
              </div>
              <div className="stat">
                <div className="stat-title text-error">V6 Stakes</div>
                <div className="stat-value text-error">{migrationStatus.v6StakeCount}</div>
              </div>
              <div className="stat">
                <div className="stat-title text-error">Est. Gas Cost</div>
                <div className="stat-value text-error">{parseFloat(migrationStatus.estimatedGasCost).toFixed(4)} ETH</div>
              </div>
            </div>

            <div className="card-actions justify-end mt-4">
              <button 
                className="btn btn-warning"
                onClick={() => setStep(1)}
              >
                Start Migration
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="text-lg font-bold mb-4">⚠️ Migration Confirmation</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>V6 Balance to migrate:</span>
                <span className="font-bold">{parseFloat(migrationStatus.v6Balance).toLocaleString()} FIA</span>
              </div>
              <div className="flex justify-between">
                <span>V6 Stakes to migrate:</span>
                <span className="font-bold">{migrationStatus.v6StakeCount} stakes</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated gas cost:</span>
                <span className="font-bold">{parseFloat(migrationStatus.estimatedGasCost).toFixed(4)} ETH</span>
              </div>
            </div>

            <div className="alert alert-warning mb-4">
              <span>
                ⚠️ After migration, your V6 balance will be 0 and all funds will be in V7.
                This action cannot be undone.
              </span>
            </div>

            <div className="card-actions justify-between">
              <button 
                className="btn btn-ghost"
                onClick={() => setStep(0)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-warning"
                onClick={executeMigration}
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm Migration'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <span className="loading loading-spinner loading-lg"></span>
            <h3 className="text-lg font-bold mt-4">Migration in Progress</h3>
            <p>Please wait while your tokens and stakes are migrated to V7...</p>
            <p className="text-sm opacity-70">Do not close this window or refresh the page.</p>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <h3 className="text-lg font-bold text-success">✅ Migration Complete!</h3>
            <p>Your tokens and stakes have been successfully migrated to FIACoin V7.</p>
            
            <div className="card-actions justify-center mt-4">
              <button 
                className="btn btn-success"
                onClick={() => window.location.reload()}
              >
                Continue to V7 Interface
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ABI for migration contract
const MIGRATION_ABI = [
  "function migrate() external",
  "function getMigrationStatus(address user) external view returns (bool eligible, bool completed, uint256 balance, uint256 stakeCount)",
  "function hasMigrated(address user) external view returns (bool)"
];
