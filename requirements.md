# NFTs on Installment

### Goals:

- [ ] complete requirements
- [ ] write fixtures
- [ ] write sol tests
- [ ] refactor for more gas efficient code

### Imp points to note:

1. NFT lock for:

- 1 time ( 100% )
- 3 months ( 34 + (2 \* 33) = 100% )
- 6 months ( 17.5 + (5 \* 16.5) = 100% )
- 9 months ( 12 + (8 \* 11) = 100%)

2. All dealings in matic
3. only erc721 standard supported
4. bidding period: 7 days

### Steps/Notes:

- seller locks his NFT
  - preffered selling price -> != 0
  - preffered installment period -> valid
  - contract address -> valid
  - token id -> valid
- sari locked nfts bidding k liay available hongi
  - 1 time ( 100% )
  - 3 months ( 34 + (2 \* 33) = 100% )
  - 6 months ( 17.5 + (5 \* 16.5) = 100% )
  - 9 months ( 12 + (8 \* 11) = 100%)
- buyers aa k bid krskty hain:
  - installment plan
  - price
  - down payment
- seller aa kr bid select kryga aur baki sari bids k paisy unlock hojaingy jisy respective bidders a k claim krskyga
- jiski bid select hogai he uske paisy contract me lock hojaingy
- incentivisation mechanism:
  - if a user is unable to pay their installment, their position is liquidated and a new buyer will be selected by the previous buyer.
  - new buyer wo khud aa kr position khareedlyga 5% less pe (95% pay kryga)

### Scenario:

seller: 100 eth

buyer: 90 eth

- 3 month installment
- down payment: 90\*34% = 30.6 eth
- remaining: 59.4 eth (29.7 eth each month)
- if 2nd is not done and new buyer comes in: // (90\*5% = 4.5 eth) (90-4.5 = 85.5 eth)
  - 30.6 \* 5% = 1.53 eth
  - 30.6 - 1.53 = 29.07 eth (new buyer will send to old buyer) (old buyer ka talluq khtm)
  - 2nd payment bhi bharyga
- if 3rd is not done and new buyer comes in:
  - ab tk jitni payment hogai he uska 95% new buyer dyga old buyer ko aur baki ki installment exactly puri bharyga
