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

export enum ERC721Enumerable__Errors {
  OwnerIndexOutOfBounds = "ERC721Enumerable: owner index out of bounds",
  GlobalIndexOutOfBounds = "ERC721Enumerable: global index out of bounds",
}

export enum ERC4907__Errors {
  InvalidExpires = "ERC4907: Invalid expires",
}

export enum WNFT__Errors {
  NotAllowedToTransferToken = "WNFT: Not allowed to transfer token",
  CannotBurnBeforeExpires = "WNFT: Cannot burn before expires",
}

export enum Owned__Errors {
  Unauthorized = "UNAUTHORIZED",
}

export enum ProjectY__Errors {
  InvalidPrice = "ProjectY: Invalid Price",
  InvalidEntryId = "ProjectY: Invalid entryId",
  InvalidBidId = "ProjectY: Invalid bidId",
}
