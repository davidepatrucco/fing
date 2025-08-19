const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleMultiSig - owner/requirement guards", function () {
  let SimpleMultiSig, owners, sig, addr1, addr2, addr3;

  beforeEach(async () => {
    [addr1, addr2, addr3] = await ethers.getSigners();
    SimpleMultiSig = await ethers.getContractFactory("SimpleMultiSig");
    // deploy with single owner (addr1) required = 1
  sig = await SimpleMultiSig.deploy([addr1.address], 1);
  await sig.waitForDeployment();
  });

  it("should prevent changeRequirement > owners.length", async () => {
    await expect(sig.changeRequirement(2)).to.be.revertedWith("Required cannot exceed owner count");
  });

  it("should allow adding owner and then increasing requirement", async () => {
    await sig.addOwner(addr2.address);
    expect(await sig.isOwner(addr2.address)).to.equal(true);
    // now owners.length == 2, allow setting required=2
    await sig.changeRequirement(2);
    expect(await sig.required()).to.equal(2);
  });

  it("should prevent removing owner if it would violate required", async () => {
    // add addr2 and set required to 2
    await sig.addOwner(addr2.address);
    await sig.changeRequirement(2);
    // remove addr1 (caller) should revert because owners.length-1 < required
    await expect(sig.removeOwner(addr1.address)).to.be.revertedWith("Remove would violate required confirmations");
  });
});
