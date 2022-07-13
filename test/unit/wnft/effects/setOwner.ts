import { Owned__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

export default function shouldBehaveLikeSetOwner(): void {
  context("when non-owner sets owner", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.wnft
          .connect(this.signers.accounts[0])
          .setOwner(this.signers.accounts[1].address)
      ).to.be.revertedWith(Owned__Errors.Unauthorized);
    });
  });

  context("when owner sets owner", function () {
    it("retrieves new owner", async function () {
      await expect(
        this.contracts.wnft.connect(this.signers.owner).setOwner(this.signers.accounts[0].address)
      )
        .to.emit(this.contracts.wnft, "OwnerUpdated")
        .withArgs(this.signers.owner.address, this.signers.accounts[0].address);

      expect(await this.contracts.wnft.owner()).to.equal(this.signers.accounts[0].address);
    });
  });
}
