export enum ERC721Errors {
  AddressZeroIsNotAValidOwner = "ERC721: address zero is not a valid owner",
  ApproveToCaller = "ERC721: approve to caller",
  InvalidTokenId = "ERC721: invalid token ID",
  ApprovalToCurrentOwner = "ERC721: approval to current owner",
  ApproveCallerIsNotOwnerNorApproved = "ERC721: approve caller is not token owner nor approved for all",
  TransferToZeroAddress = "ERC721: transfer to the zero address",
  TransferFromIncorrectOwner = "ERC721: transfer from incorrect owner",
  CallerIsNotTokenOwnerNorApproved = "ERC721: caller is not token owner nor approved",
}

export enum OwnedErrors {
  Unauthorized = "UNAUTHORIZED",
}

export enum ProjectYErrors {
  InvalidEntryId = "INVALID_ENTRY_ID",
  InvalidBidId = "INVALID_BID_ID",
  DownPaymentDone = "DOWN_PAYMENT_DONE",
  InvalidPrice = "INVALID_PRICE",
  ValueNotEqualToDownPayment = "VALUE_NOT_EQUAL_TO_DOWN_PAYMENT",
  BiddingPeriodOver = "BIDDING_PERIOD_OVER",
  CallerNotSeller = "CALLER_NOT_SELLER",
  BiddingPeriodNotOver = "BIDDING_PERIOD_NOT_OVER",
  CannotReselectBid = "CANNOT_RESELECT_BID",
  CallerNotBuyer = "CALLER_NOT_BUYER",
  InvalidInstallmentValue = "INVALID_INSTALLMENT_VALUE",
  BidderShouldNotBeSelected = "BIDDER_SHOULD_NOT_BE_SELECTED",
  NoPaymentAvailable = "NO_PAYMENT_AVAILABLE",
  CannotReclaimPayment = "CANNOT_RECLAIM_PAYMENT",
  InstallmentsComplete = "INSTALLMENTS_COMPLETE",
  InstallmentOnTrack = "INSTALLMENT_ON_TRACK",
  InvalidLiquidationValue = "INVALID_LIQUIDATION_VALUE",
  InvalidBiddingPeriod = "INVALID_BIDDING_PERIOD",
  InvalidGracePeriod = "INVALID_GRACE_PERIOD",
  DueDatePassed = "DUE_DATE_PASSED",
  NoBidIdSelected = "NO_BID_ID_SELECTED",
  PayAfterAppropriateTime = "PAY_AFTER_APPROPRIATE_TIME",
  ClaimAfterAppropriateTime = "CLAIM_AFTER_APPROPRIATE_TIME",
  InvalidCaller = "INVALID_CALLER",
  InvalidInstallmentNumber = "INVALID_INSTALLMENT_NUMBER",
  InvalidAddress = "INVALID_ADDRESS",
  NoInstallmentLeft = "NO_INSTALLMENT_LEFT",
}
