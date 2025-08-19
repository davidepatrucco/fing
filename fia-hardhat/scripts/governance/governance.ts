import { ethers } from "hardhat";
import { FIACoinV5 } from "../typechain-types";

// Governance utility functions for FIACoinV5

async function main() {
  const contractAddress = process.env.FIA_V5_ADDRESS;
  if (!contractAddress) {
    throw new Error("Please set FIA_V5_ADDRESS environment variable");
  }

  const [deployer] = await ethers.getSigners();
  const fiaV5 = await ethers.getContractAt("FIACoinV5", contractAddress) as FIACoinV5;

  console.log("FIACoinV5 Governance Dashboard");
  console.log("Contract Address:", contractAddress);
  console.log("=====================================");

  // Display current governance status
  await displayGovernanceStatus(fiaV5);

  // Check if we have command line arguments for actions
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("\nAvailable commands:");
    console.log("- npm run governance:create-proposal <description> <type> <data>");
    console.log("- npm run governance:vote <proposalId> <support>");
    console.log("- npm run governance:execute <proposalId>");
    console.log("- npm run governance:status");
    return;
  }

  const command = args[0];

  switch (command) {
    case "create-proposal":
      await createProposal(fiaV5, args[1], parseInt(args[2]), args[3]);
      break;
    case "vote":
      await voteOnProposal(fiaV5, parseInt(args[1]), args[2] === "true");
      break;
    case "execute":
      await executeProposal(fiaV5, parseInt(args[1]));
      break;
    case "status":
      await displayGovernanceStatus(fiaV5);
      break;
    default:
      console.log("Unknown command:", command);
  }
}

async function displayGovernanceStatus(fiaV5: FIACoinV5) {
  console.log("\n=== Governance Status ===");
  
  const proposalCount = await fiaV5.proposalCount();
  console.log("Total Proposals:", proposalCount.toString());

  const [deployer] = await ethers.getSigners();
  const votingPower = await fiaV5.getVotingPower(deployer.address);
  console.log("Your Voting Power:", ethers.formatUnits(votingPower, 18), "FIA");

  const proposalThreshold = await fiaV5.PROPOSAL_THRESHOLD();
  console.log("Proposal Threshold:", ethers.formatUnits(proposalThreshold, 18), "FIA");

  const canCreateProposal = votingPower >= proposalThreshold;
  console.log("Can Create Proposal:", canCreateProposal ? "Yes" : "No");

  // Display recent proposals
  if (proposalCount > 0n) {
    console.log("\n=== Recent Proposals ===");
    const startIndex = proposalCount > 5n ? proposalCount - 5n : 0n;
    
    for (let i = startIndex; i < proposalCount; i++) {
      const proposal = await fiaV5.proposals(i);
      console.log(`\nProposal ${i}:`);
      console.log("  Description:", proposal.description);
      console.log("  Proposer:", proposal.proposer);
      console.log("  For Votes:", ethers.formatUnits(proposal.forVotes, 18));
      console.log("  Against Votes:", ethers.formatUnits(proposal.againstVotes, 18));
      console.log("  Start Time:", new Date(Number(proposal.startTime) * 1000).toLocaleString());
      console.log("  End Time:", new Date(Number(proposal.endTime) * 1000).toLocaleString());
      console.log("  Executed:", proposal.executed);
      
      const now = Math.floor(Date.now() / 1000);
      const isActive = now >= Number(proposal.startTime) && now <= Number(proposal.endTime);
      const canExecute = now > Number(proposal.endTime) && !proposal.executed;
      
      console.log("  Status:", 
        proposal.executed ? "Executed" :
        isActive ? "Active (Voting)" :
        canExecute ? "Ready for Execution" :
        "Pending");
    }
  }

  console.log("\n=== Governance Constants ===");
  console.log("Voting Period:", (await fiaV5.VOTING_PERIOD()).toString(), "seconds");
  console.log("Quorum Percentage:", (await fiaV5.QUORUM_PERCENTAGE()).toString(), "%");
  console.log("Execution Delay:", (await fiaV5.EXECUTION_DELAY()).toString(), "seconds");
}

async function createProposal(fiaV5: FIACoinV5, description: string, proposalType: number, data: string) {
  console.log("\n=== Creating Proposal ===");
  console.log("Description:", description);
  console.log("Type:", proposalType);
  console.log("Data:", data);

  const [deployer] = await ethers.getSigners();
  const votingPower = await fiaV5.getVotingPower(deployer.address);
  const proposalThreshold = await fiaV5.PROPOSAL_THRESHOLD();

  if (votingPower < proposalThreshold) {
    console.log("Error: Insufficient voting power to create proposal");
    console.log("Required:", ethers.formatUnits(proposalThreshold, 18), "FIA");
    console.log("You have:", ethers.formatUnits(votingPower, 18), "FIA");
    return;
  }

  // Encode the data based on proposal type
  let encodedData = "0x";
  if (proposalType === 0) { // FEE_CHANGE
    encodedData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [parseInt(data)]);
  } else if (proposalType === 1) { // TREASURY_SPEND
    const parts = data.split(",");
    encodedData = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [parts[0], ethers.parseUnits(parts[1], 18)]);
  }

  try {
    const tx = await fiaV5.propose(description, proposalType, encodedData);
    const receipt = await tx.wait();
    
    console.log("Proposal created successfully!");
    console.log("Transaction hash:", tx.hash);
    console.log("Gas used:", receipt?.gasUsed.toString());
    
    // Get the proposal ID from events
    const events = receipt?.logs.map(log => {
      try {
        return fiaV5.interface.parseLog(log as any);
      } catch {
        return null;
      }
    }).filter(event => event?.name === 'ProposalCreated');
    
    if (events && events.length > 0) {
      console.log("Proposal ID:", events[0]?.args[0].toString());
    }
  } catch (error) {
    console.error("Failed to create proposal:", error);
  }
}

async function voteOnProposal(fiaV5: FIACoinV5, proposalId: number, support: boolean) {
  console.log("\n=== Voting on Proposal ===");
  console.log("Proposal ID:", proposalId);
  console.log("Support:", support ? "Yes" : "No");

  try {
    const proposal = await fiaV5.proposals(proposalId);
    const now = Math.floor(Date.now() / 1000);
    
    if (now > Number(proposal.endTime)) {
      console.log("Error: Voting period has ended");
      return;
    }

    const [deployer] = await ethers.getSigners();
    const hasVoted = await fiaV5.hasVoted(proposalId, deployer.address);
    
    if (hasVoted) {
      console.log("Error: You have already voted on this proposal");
      return;
    }

    const votingPower = await fiaV5.getVotingPower(deployer.address);
    console.log("Your voting power:", ethers.formatUnits(votingPower, 18), "FIA");

    const tx = await fiaV5.vote(proposalId, support);
    const receipt = await tx.wait();
    
    console.log("Vote cast successfully!");
    console.log("Transaction hash:", tx.hash);
    console.log("Gas used:", receipt?.gasUsed.toString());
  } catch (error) {
    console.error("Failed to vote:", error);
  }
}

async function executeProposal(fiaV5: FIACoinV5, proposalId: number) {
  console.log("\n=== Executing Proposal ===");
  console.log("Proposal ID:", proposalId);

  try {
    const proposal = await fiaV5.proposals(proposalId);
    const now = Math.floor(Date.now() / 1000);
    
    if (proposal.executed) {
      console.log("Error: Proposal already executed");
      return;
    }

    if (now <= Number(proposal.endTime)) {
      console.log("Error: Voting period still active");
      return;
    }

    const executionDelay = await fiaV5.EXECUTION_DELAY();
    if (now <= Number(proposal.endTime) + Number(executionDelay)) {
      console.log("Error: Execution delay not met");
      console.log("Can execute after:", new Date((Number(proposal.endTime) + Number(executionDelay)) * 1000).toLocaleString());
      return;
    }

    const totalVotes = proposal.forVotes + proposal.againstVotes;
    const totalSupply = await fiaV5.totalSupply();
    const quorumPercentage = await fiaV5.QUORUM_PERCENTAGE();
    const requiredQuorum = (totalSupply * quorumPercentage) / 100n;

    console.log("Total votes:", ethers.formatUnits(totalVotes, 18), "FIA");
    console.log("Required quorum:", ethers.formatUnits(requiredQuorum, 18), "FIA");
    console.log("For votes:", ethers.formatUnits(proposal.forVotes, 18), "FIA");
    console.log("Against votes:", ethers.formatUnits(proposal.againstVotes, 18), "FIA");

    if (totalVotes < requiredQuorum) {
      console.log("Error: Quorum not met");
      return;
    }

    if (proposal.forVotes <= proposal.againstVotes) {
      console.log("Error: Proposal rejected by voters");
      return;
    }

    const tx = await fiaV5.execute(proposalId);
    const receipt = await tx.wait();
    
    console.log("Proposal executed successfully!");
    console.log("Transaction hash:", tx.hash);
    console.log("Gas used:", receipt?.gasUsed.toString());
  } catch (error) {
    console.error("Failed to execute proposal:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });