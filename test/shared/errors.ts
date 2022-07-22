export enum ERC721__Errors {
  AddressZeroIsNotAValidOwner = "ERC721: address zero is not a valid owner",
  ApproveToCaller = "ERC721: approve to caller",
  InvalidTokenId = "ERC721: invalid token ID",
  ApprovalToCurrentOwner = "ERC721: approval to current owner",
  ApproveCallerIsNotOwnerNorApproved = "ERC721: approve caller is not token owner nor approved for all",
  TransferToZeroAddress = "ERC721: transfer to the zero address",
  TransferFromIncorrectOwner = "ERC721: transfer from incorrect owner",
  CallerIsNotTokenOwnerNorApproved = "ERC721: caller is not token owner nor approved",
}

export enum Owned__Errors {
  Unauthorized = "UNAUTHORIZED",
}

export enum ProjectY__Errors {
  InvalidPrice = "ProjectY: Invalid Price",
  InvalidEntryId = "ProjectY: Invalid entryId",
  InvalidBidId = "ProjectY: Invalid bidId",
  ValueMustBe34PercentOfBidPrice = "ProjectY: value must be 34% of BidPrice",
  BiddingPeriodOver = "ProjectY: Bidding period over",
  BiddingPeriodNotOver = "ProjectY: Bidding period not over",
  CallerMustBeSeller = "ProjectY: Caller must be seller",
}
