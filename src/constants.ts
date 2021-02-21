import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export const ADDRESS_ZERO = Address.fromString('0x0000000000000000000000000000000000000000')

export const BIG_DECIMAL_1E6 = BigDecimal.fromString('1e6')

export const BIG_DECIMAL_1E12 = BigDecimal.fromString('1e12')

export const BIG_DECIMAL_1E18 = BigDecimal.fromString('1e18')

export const BIG_DECIMAL_ZERO = BigDecimal.fromString('0')

export const BIG_DECIMAL_ONE = BigDecimal.fromString('1')

export const BIG_INT_ONE = BigInt.fromI32(1)

export const BIG_INT_ONE_DAY_SECONDS = BigInt.fromI32(86400)

export const BIG_INT_ZERO = BigInt.fromI32(0)

export const LOCKUP_POOL_NUMBER = BigInt.fromI32(29)

export const FACTORY_ADDRESS = Address.fromString('0xc3abe5da15d89c3c13cfc4d4ae4f55b0e408e53e')

export const LOCKUP_BLOCK_NUMBER = BigInt.fromI32(10959148)

export const MASTER_CHEF_ADDRESS = Address.fromString('0x267748fe0db99863e1d5448ef5b9442230c24789')

export const SWIPE_BAR_ADDRESS = Address.fromString('0x8798249c2e607446efb7ad49ec89dd1865ff4272')

export const SWIPE_MAKER_ADDRESS = Address.fromString('0xe11fc0b43ab98eb91e9836129d1ee7c3Bc95df50')

export const SWIPE_TOKEN_ADDRESS = Address.fromString('0xd57022d5cb065505093e2c4bbf7d683d2335ab6a')

export const SWIPE_USDT_PAIR_ADDRESS = Address.fromString('0xf4fa90f0bc7e767e283eb79f45cde7d0e2318f7e')

// export const XSWIPE_USDC_PAIR_ADDRESS = Address.fromString('0xd597924b16cc1904d808285bc9044fd51ceeead7')

// export const XSWIPE_WETH_PAIR_ADDRESS = Address.fromString('0x36e2fcccc59e5747ff63a03ea2e5c0c2c14911e7')

export const NULL_CALL_RESULT_VALUE = '0x0000000000000000000000000000000000000000000000000000000000000001'

export const USDC_WETH_PAIR = '0x650213faa833b518de00bae7239159fa1239ae2b'

export const DAI_WETH_PAIR = '0xe9fe018e38723ae72261ab32d3edcddc74934c5e'

export const USDT_WETH_PAIR = '0xa58d9d47ff70ecd186d0f32e448e4ecf7f0d3cdd'

export const SWIPE_USDT_PAIR = '0xf4fa90f0bc7e767e283eb79f45cde7d0e2318f7e'

export const WHITELIST: string[] = [
  '0xc778417e063141139fce010982780140aa0cd5ab', // WETH
  '0xa1a38b5e0dad12c4af73c6abfb8b3fd8ad621733', // DAI
  '0x005a31b9b305b8e63e3991cfb9943193432ec89b', // USDC
  '0xb421716a0a1feed58bac7e0bbad54cb0d37c382e', // USDT
  // '0x0000000000085d4780b73119b644ae5ecd22b376', // TUSD
  // '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643', // cDAI
  // '0x39aa39c021dfbae8fac545936693ac917d5e7563', // cUSDC
  // '0x86fadb80d8d2cff3c3680819e4da99c10232ba0f', // EBASE
  // '0x57ab1ec28d129707052df4df418d58a2d46d5f51', // sUSD
  // '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', // MKR
  // '0xc00e94cb662c3520282e6f5717214004a7f26888', // COMP
  // '0x514910771af9ca656af840dff83e8264ecf986ca', //LINK
  // '0x960b236a07cf122663c4303350609a66a7b288c0', //ANT
  // '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f', //SNX
  // '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e', //YFI
  // '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8', // yCurv
]

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
export const MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('0')

// minimum liquidity for price to get tracked
export const MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString('0')

export const WETH_ADDRESS = Address.fromString('0xc778417e063141139fce010982780140aa0cd5ab')

export const SWIPESWAP_WETH_USDT_PAIR_ADDRESS = Address.fromString('0xa58d9d47ff70ecd186d0f32e448e4ecf7f0d3cdd')

export const USDT_ADDRESS = Address.fromString('0xb421716a0a1feed58bac7e0bbad54cb0d37c382e')

export const MASTER_CHEF_START_BLOCK = BigInt.fromI32(9686191)

export const UNISWAP_FACTORY_ADDRESS = Address.fromString('0x9c83dCE8CA20E9aAF9D3efc003b2ea62aBC08351')

export const UNISWAP_SWIPE_ETH_PAIR_FIRST_LIQUDITY_BLOCK = BigInt.fromI32(9686191)

export const UNISWAP_WETH_USDT_PAIR_ADDRESS = Address.fromString('0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852')

export const UNISWAP_SWIPE_ETH_PAIR_ADDRESS = Address.fromString('0xce84867c3c02b05dc570d0135103d3fb9cc19433')

export const UNISWAP_SWIPE_USDT_PAIR_ADDRESS = Address.fromString('0xe3ffab89e53422f468be955e7011932efe80aa26')
