# NFTs on Installment

### Goals:

- [ ] complete requirements
- [ ] write fixtures
- [ ] write sol tests
- [ ] refactor for more gas efficient code

### Imp points to note:

1. NFT lock for 3 months
2. All dealings in matic
3. only erc721 standard supported
4. factory pattern for wrapped version

### Steps/Notes:

- seller locks his NFT
  - kitny ki bechni he -> != 0
  - contract address -> valid
  - token id -> valid
- sari locked nfts bidding k liay available hongi
  - three Installment (34% + 33% + 33%)
- buyers aa k bid krskty hain aur 34% of their bid lock krwaingy
- seller aa kr bid select kryga aur baki sari bids k paisy unlock hojaingy jisy respective bidders a k claim krskyga
- jiski bid select hogai he uske paisy contract me lock hojaingy aur NFT ka wrapped version usy mint hojayga jo transferrable nhi hoga
- slashing logic

(1&2 -> nft refund to seller; all 3 -> installment waly matic 1 month baad unlock and wrapped version burn)

1. agr buyer doosri installment nhi depata to pehli wali installment slash ho k seller ko chalijaygi
2. agr buyer teesri installment nhi depata to ek pehli wali seller ko aur doosri wali buyer ko chalijaygi
3. teeno installment k baad nft buyer ko transfer hojaygi aur wrapped burn hojaygi
