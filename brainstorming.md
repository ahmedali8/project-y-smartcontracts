# phase 1: buyer is selected and first installment is paid (WNFT minted to buyer)

block.timestamp >= BuyerInfo.timestamp
&&
block.timestamp < BuyerInfo.timestamp + ONE_MONTH
&&
BuyerInfo.isSelected

# phase 2:

send firstpayment(34% of bidPrice) to seller
slash -> if second installment is not done then also send NFT back to seller and burn WNFT

block.timestamp >= BuyerInfo.timestamp + ONE_MONTH
&&
block.timestamp < BuyerInfo.timestamp + (2 \* ONE_MONTH)

if: -> send 34% to seller
pricePaid == (bidPrice \* 34) / 100
&&
msg.value == (bidPrice \* 33) / 100
else: -> slash
pricePaid == (bidPrice \* 34) / 100
&&
msg.value != (bidPrice \* 33) / 100

# phase 3:

normal -> if third installment is done then release second payment to seller and send NFT to buyer
and burn WNFT
slash -> if third installment is not done then slash firstpayment(34% of bidPrice) and
NFT goes to seller and second(33%) goes to buyer (WNFT burned)

block.timestamp >= BuyerInfo.timestamp + (2 \* ONE_MONTH)
&&
block.timestamp < BuyerInfo.timestamp + (3 \* ONE_MONTH)

if: -> normal
pricePaid == (bidPrice \* 67) / 100 (34%+33%)
&&
msg.value == (bidPrice \* 33) / 100
else: -> slash
pricePaid == (bidPrice \* 67) / 100 (34%+33%)
&&
msg.value != (bidPrice \* 33) / 100

# phase 4:

release third payment to seller
block.timestamp >= BuyerInfo.timestamp + (3 \* ONE_MONTH)

# Todo

have phases like: one, two, three and four
have sub-phases like: complete, incomplete
