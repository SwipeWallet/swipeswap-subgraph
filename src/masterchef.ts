import {
  AddCall,
  Deposit,
  DevCall,
  EmergencyWithdraw,
  MassUpdatePoolsCall,
  SwipeSwap as SwipeSwapContract,
  MigrateCall,
  OwnershipTransferred,
  SetCall,
  SetMigratorCall,
  UpdatePoolCall,
  Withdraw,
} from '../generated/SwipeSwap/SwipeSwap'
import { Address, BigDecimal, BigInt, dataSource, ethereum, log } from '@graphprotocol/graph-ts'
import {
  BIG_DECIMAL_1E12,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_ZERO,
  BIG_INT_ONE,
  BIG_INT_ONE_DAY_SECONDS,
  BIG_INT_ZERO,
  SWIPE_SWAP_ADDRESS,
  SWIPE_SWAP_START_BLOCK,
} from './constants'
import { History, SwipeSwap, Pool, PoolHistory, User } from '../generated/schema'
import { getSwipePrice, getUSDRate } from './price'

import { ERC20 as ERC20Contract } from '../generated/SwipeSwap/ERC20'
import { Pair as PairContract } from '../generated/SwipeSwap/Pair'

function getSwipeSwap(block: ethereum.Block): SwipeSwap {
  let swipeSwap = SwipeSwap.load(SWIPE_SWAP_ADDRESS.toHex())

  if (swipeSwap === null) {
    const contract = SwipeSwapContract.bind(SWIPE_SWAP_ADDRESS)
    swipeSwap = new SwipeSwap(SWIPE_SWAP_ADDRESS.toHex())
    swipeSwap.bonusMultiplier = contract.BONUS_MULTIPLIER()
    swipeSwap.bonusEndBlock = contract.bonusEndBlock()
    swipeSwap.devaddr = contract.devaddr()
    swipeSwap.migrator = contract.migrator()
    swipeSwap.owner = contract.owner()
    // poolInfo ...
    swipeSwap.startBlock = contract.startBlock()
    swipeSwap.swipe = contract.swipe()
    swipeSwap.swipePerBlock = contract.swipePerBlock()
    swipeSwap.totalAllocPoint = contract.totalAllocPoint()
    // userInfo ...
    swipeSwap.poolCount = BIG_INT_ZERO

    swipeSwap.slpBalance = BIG_DECIMAL_ZERO
    swipeSwap.slpAge = BIG_DECIMAL_ZERO
    swipeSwap.slpAgeRemoved = BIG_DECIMAL_ZERO
    swipeSwap.slpDeposited = BIG_DECIMAL_ZERO
    swipeSwap.slpWithdrawn = BIG_DECIMAL_ZERO

    swipeSwap.updatedAt = block.timestamp

    swipeSwap.save()
  }

  return swipeSwap as SwipeSwap
}

export function getPool(id: BigInt, block: ethereum.Block): Pool {
  let pool = Pool.load(id.toString())

  if (pool === null) {
    const swipeSwap = getSwipeSwap(block)

    const swipeSwapContract = SwipeSwapContract.bind(SWIPE_SWAP_ADDRESS)

    // Create new pool.
    pool = new Pool(id.toString())

    // Set relation
    pool.owner = swipeSwap.id

    const poolInfo = swipeSwapContract.poolInfo(swipeSwap.poolCount)

    pool.pair = poolInfo.value0
    pool.allocPoint = poolInfo.value1
    pool.lastRewardBlock = poolInfo.value2
    pool.accSwipePerShare = poolInfo.value3

    // Total supply of LP tokens
    pool.balance = BIG_INT_ZERO
    pool.userCount = BIG_INT_ZERO

    pool.slpBalance = BIG_DECIMAL_ZERO
    pool.slpAge = BIG_DECIMAL_ZERO
    pool.slpAgeRemoved = BIG_DECIMAL_ZERO
    pool.slpDeposited = BIG_DECIMAL_ZERO
    pool.slpWithdrawn = BIG_DECIMAL_ZERO

    pool.timestamp = block.timestamp
    pool.block = block.number

    pool.updatedAt = block.timestamp
    pool.entryUSD = BIG_DECIMAL_ZERO
    pool.exitUSD = BIG_DECIMAL_ZERO
    pool.swipeHarvested = BIG_DECIMAL_ZERO
    pool.swipeHarvestedUSD = BIG_DECIMAL_ZERO
    pool.save()
  }

  return pool as Pool
}

function getHistory(owner: string, block: ethereum.Block): History {
  const day = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS)

  const id = owner.concat(day.toString())

  let history = History.load(id)

  if (history === null) {
    history = new History(id)
    history.owner = owner
    history.slpBalance = BIG_DECIMAL_ZERO
    history.slpAge = BIG_DECIMAL_ZERO
    history.slpAgeRemoved = BIG_DECIMAL_ZERO
    history.slpDeposited = BIG_DECIMAL_ZERO
    history.slpWithdrawn = BIG_DECIMAL_ZERO
    history.timestamp = block.timestamp
    history.block = block.number
  }

  return history as History
}

function getPoolHistory(pool: Pool, block: ethereum.Block): PoolHistory {
  const day = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS)

  const id = pool.id.concat(day.toString())

  let history = PoolHistory.load(id)

  if (history === null) {
    history = new PoolHistory(id)
    history.pool = pool.id
    history.slpBalance = BIG_DECIMAL_ZERO
    history.slpAge = BIG_DECIMAL_ZERO
    history.slpAgeRemoved = BIG_DECIMAL_ZERO
    history.slpDeposited = BIG_DECIMAL_ZERO
    history.slpWithdrawn = BIG_DECIMAL_ZERO
    history.timestamp = block.timestamp
    history.block = block.number
    history.entryUSD = BIG_DECIMAL_ZERO
    history.exitUSD = BIG_DECIMAL_ZERO
    history.swipeHarvested = BIG_DECIMAL_ZERO
    history.swipeHarvestedUSD = BIG_DECIMAL_ZERO
  }

  return history as PoolHistory
}

export function getUser(pid: BigInt, address: Address, block: ethereum.Block): User {
  const uid = address.toHex()
  const id = pid.toString().concat('-').concat(uid)

  let user = User.load(id)

  if (user === null) {
    user = new User(id)
    user.pool = null
    user.address = address
    user.amount = BIG_INT_ZERO
    user.rewardDebt = BIG_INT_ZERO
    user.swipeHarvested = BIG_DECIMAL_ZERO
    user.swipeHarvestedUSD = BIG_DECIMAL_ZERO
    user.entryUSD = BIG_DECIMAL_ZERO
    user.exitUSD = BIG_DECIMAL_ZERO
    user.timestamp = block.timestamp
    user.block = block.number
    user.save()
  }

  return user as User
}

export function add(event: AddCall): void {
  const swipeSwap = getSwipeSwap(event.block)

  log.info('Add pool #{}', [swipeSwap.poolCount.toString()])

  const pool = getPool(swipeSwap.poolCount, event.block)

  // Update SwipeSwap.
  swipeSwap.totalAllocPoint = swipeSwap.totalAllocPoint.plus(pool.allocPoint)
  swipeSwap.poolCount = swipeSwap.poolCount.plus(BIG_INT_ONE)
  swipeSwap.save()
}

// Calls
export function set(call: SetCall): void {
  log.info('Set pool id: {} allocPoint: {} withUpdate: {}', [
    call.inputs._pid.toString(),
    call.inputs._allocPoint.toString(),
    call.inputs._withUpdate ? 'true' : 'false',
  ])

  const pool = getPool(call.inputs._pid, call.block)

  const swipeSwap = getSwipeSwap(call.block)

  // Update swipeswap
  swipeSwap.totalAllocPoint = swipeSwap.totalAllocPoint.plus(call.inputs._allocPoint.minus(pool.allocPoint))
  swipeSwap.save()

  // Update pool
  pool.allocPoint = call.inputs._allocPoint
  pool.save()
}

export function setMigrator(call: SetMigratorCall): void {
  log.info('Set migrator to {}', [call.inputs._migrator.toHex()])

  const swipeSwap = getSwipeSwap(call.block)
  swipeSwap.migrator = call.inputs._migrator
  swipeSwap.save()
}

export function migrate(call: MigrateCall): void {
  const swipeSwapContract = SwipeSwapContract.bind(SWIPE_SWAP_ADDRESS)

  const pool = getPool(call.inputs._pid, call.block)

  const poolInfo = swipeSwapContract.poolInfo(call.inputs._pid)

  const pair = poolInfo.value0

  const pairContract = PairContract.bind(pair as Address)

  pool.pair = pair

  const balance = pairContract.balanceOf(SWIPE_SWAP_ADDRESS)

  pool.balance = balance

  pool.save()
}

export function massUpdatePools(call: MassUpdatePoolsCall): void {
  log.info('Mass update pools', [])
}

export function updatePool(call: UpdatePoolCall): void {
  log.info('Update pool id {}', [call.inputs._pid.toString()])

  const swipeSwap = SwipeSwapContract.bind(SWIPE_SWAP_ADDRESS)
  const poolInfo = swipeSwap.poolInfo(call.inputs._pid)
  const pool = getPool(call.inputs._pid, call.block)
  pool.lastRewardBlock = poolInfo.value2
  pool.accSwipePerShare = poolInfo.value3
  pool.save()
}

export function dev(call: DevCall): void {
  log.info('Dev changed to {}', [call.inputs._devaddr.toHex()])

  const swipeSwap = getSwipeSwap(call.block)

  swipeSwap.devaddr = call.inputs._devaddr

  swipeSwap.save()
}

// Events
export function deposit(event: Deposit): void {
  // if (event.params.amount == BIG_INT_ZERO) {
  //   log.info('Deposit zero transaction, input {} hash {}', [
  //     event.transaction.input.toHex(),
  //     event.transaction.hash.toHex(),
  //   ])
  // }

  const amount = event.params.amount.divDecimal(BIG_DECIMAL_1E18)

  // log.info('{} has deposited {} slp tokens to pool #{}', [
  //   event.params.user.toHex(),
  //   event.params.amount.toString(),
  //   event.params.pid.toString(),
  // ])

  const swipeSwapContract = SwipeSwapContract.bind(SWIPE_SWAP_ADDRESS)

  const poolInfo = swipeSwapContract.poolInfo(event.params.pid)

  const pool = getPool(event.params.pid, event.block)

  const poolHistory = getPoolHistory(pool, event.block)

  const pairContract = PairContract.bind(poolInfo.value0)
  pool.balance = pairContract.balanceOf(SWIPE_SWAP_ADDRESS)

  pool.lastRewardBlock = poolInfo.value2
  pool.accSwipePerShare = poolInfo.value3

  const poolDays = event.block.timestamp.minus(pool.updatedAt).divDecimal(BigDecimal.fromString('86400'))
  pool.slpAge = pool.slpAge.plus(poolDays.times(pool.slpBalance))

  pool.slpDeposited = pool.slpDeposited.plus(amount)
  pool.slpBalance = pool.slpBalance.plus(amount)

  pool.updatedAt = event.block.timestamp

  const userInfo = swipeSwapContract.userInfo(event.params.pid, event.params.user)

  const user = getUser(event.params.pid, event.params.user, event.block)

  // If not currently in pool and depositing SLP
  if (!user.pool && event.params.amount.gt(BIG_INT_ZERO)) {
    user.pool = pool.id
    pool.userCount = pool.userCount.plus(BIG_INT_ONE)
  }

  // Calculate SWIPE being paid out
  if (event.block.number.gt(SWIPE_SWAP_START_BLOCK) && user.amount.gt(BIG_INT_ZERO)) {
    const pending = user.amount
      .toBigDecimal()
      .times(pool.accSwipePerShare.toBigDecimal())
      .div(BIG_DECIMAL_1E12)
      .minus(user.rewardDebt.toBigDecimal())
      .div(BIG_DECIMAL_1E18)
    // log.info('Deposit: User amount is more than zero, we should harvest {} swipe', [pending.toString()])
    if (pending.gt(BIG_DECIMAL_ZERO)) {
      // log.info('Harvesting {} SWIPE', [pending.toString()])
      const swipeHarvestedUSD = pending.times(getSwipePrice(event.block))
      user.swipeHarvested = user.swipeHarvested.plus(pending)
      user.swipeHarvestedUSD = user.swipeHarvestedUSD.plus(swipeHarvestedUSD)
      pool.swipeHarvested = pool.swipeHarvested.plus(pending)
      pool.swipeHarvestedUSD = pool.swipeHarvestedUSD.plus(swipeHarvestedUSD)
      poolHistory.swipeHarvested = pool.swipeHarvested
      poolHistory.swipeHarvestedUSD = pool.swipeHarvestedUSD
    }
  }

  user.amount = userInfo.value0
  user.rewardDebt = userInfo.value1

  if (event.params.amount.gt(BIG_INT_ZERO)) {
    const reservesResult = pairContract.try_getReserves()
    if (!reservesResult.reverted) {
      const totalSupply = pairContract.totalSupply()

      const share = amount.div(totalSupply.toBigDecimal())

      const token0Amount = reservesResult.value.value0.toBigDecimal().times(share)

      const token1Amount = reservesResult.value.value1.toBigDecimal().times(share)

      const token0PriceUSD = getUSDRate(pairContract.token0(), event.block)

      const token1PriceUSD = getUSDRate(pairContract.token1(), event.block)

      const token0USD = token0Amount.times(token0PriceUSD)

      const token1USD = token1Amount.times(token1PriceUSD)

      const entryUSD = token0USD.plus(token1USD)

      // log.info(
      //   'Token {} priceUSD: {} reserve: {} amount: {} / Token {} priceUSD: {} reserve: {} amount: {} - slp amount: {} total supply: {} share: {}',
      //   [
      //     token0.symbol(),
      //     token0PriceUSD.toString(),
      //     reservesResult.value.value0.toString(),
      //     token0Amount.toString(),
      //     token1.symbol(),
      //     token1PriceUSD.toString(),
      //     reservesResult.value.value1.toString(),
      //     token1Amount.toString(),
      //     amount.toString(),
      //     totalSupply.toString(),
      //     share.toString(),
      //   ]
      // )

      // log.info('User {} has deposited {} SLP tokens {} {} (${}) and {} {} (${}) at a combined value of ${}', [
      //   user.address.toHex(),
      //   amount.toString(),
      //   token0Amount.toString(),
      //   token0.symbol(),
      //   token0USD.toString(),
      //   token1Amount.toString(),
      //   token1.symbol(),
      //   token1USD.toString(),
      //   entryUSD.toString(),
      // ])

      user.entryUSD = user.entryUSD.plus(entryUSD)

      pool.entryUSD = pool.entryUSD.plus(entryUSD)

      poolHistory.entryUSD = pool.entryUSD
    }
  }

  user.save()
  pool.save()

  const swipeSwap = getSwipeSwap(event.block)

  const swipeSwapDays = event.block.timestamp.minus(swipeSwap.updatedAt).divDecimal(BigDecimal.fromString('86400'))
  swipeSwap.slpAge = swipeSwap.slpAge.plus(swipeSwapDays.times(swipeSwap.slpBalance))

  swipeSwap.slpDeposited = swipeSwap.slpDeposited.plus(amount)
  swipeSwap.slpBalance = swipeSwap.slpBalance.plus(amount)

  swipeSwap.updatedAt = event.block.timestamp
  swipeSwap.save()

  const history = getHistory(SWIPE_SWAP_ADDRESS.toHex(), event.block)
  history.slpAge = swipeSwap.slpAge
  history.slpBalance = swipeSwap.slpBalance
  history.slpDeposited = history.slpDeposited.plus(amount)
  history.save()

  poolHistory.slpAge = pool.slpAge
  poolHistory.slpBalance = pool.balance.divDecimal(BIG_DECIMAL_1E18)
  poolHistory.slpDeposited = poolHistory.slpDeposited.plus(amount)
  poolHistory.userCount = pool.userCount
  poolHistory.save()
}

export function withdraw(event: Withdraw): void {
  // if (event.params.amount == BIG_INT_ZERO && User.load(event.params.user.toHex()) !== null) {
  //   log.info('Withdrawal zero transaction, input {} hash {}', [
  //     event.transaction.input.toHex(),
  //     event.transaction.hash.toHex(),
  //   ])
  // }

  const amount = event.params.amount.divDecimal(BIG_DECIMAL_1E18)

  // log.info('{} has withdrawn {} slp tokens from pool #{}', [
  //   event.params.user.toHex(),
  //   amount.toString(),
  //   event.params.pid.toString(),
  // ])

  const swipeSwapContract = SwipeSwapContract.bind(SWIPE_SWAP_ADDRESS)

  const poolInfo = swipeSwapContract.poolInfo(event.params.pid)

  const pool = getPool(event.params.pid, event.block)

  const poolHistory = getPoolHistory(pool, event.block)

  const pairContract = PairContract.bind(poolInfo.value0)
  pool.balance = pairContract.balanceOf(SWIPE_SWAP_ADDRESS)
  pool.lastRewardBlock = poolInfo.value2
  pool.accSwipePerShare = poolInfo.value3

  const poolDays = event.block.timestamp.minus(pool.updatedAt).divDecimal(BigDecimal.fromString('86400'))
  const poolAge = pool.slpAge.plus(poolDays.times(pool.slpBalance))
  const poolAgeRemoved = poolAge.div(pool.slpBalance).times(amount)
  pool.slpAge = poolAge.minus(poolAgeRemoved)
  pool.slpAgeRemoved = pool.slpAgeRemoved.plus(poolAgeRemoved)
  pool.slpWithdrawn = pool.slpWithdrawn.plus(amount)
  pool.slpBalance = pool.slpBalance.minus(amount)
  pool.updatedAt = event.block.timestamp

  const user = getUser(event.params.pid, event.params.user, event.block)

  if (event.block.number.gt(SWIPE_SWAP_START_BLOCK) && user.amount.gt(BIG_INT_ZERO)) {
    const pending = user.amount
      .toBigDecimal()
      .times(pool.accSwipePerShare.toBigDecimal())
      .div(BIG_DECIMAL_1E12)
      .minus(user.rewardDebt.toBigDecimal())
      .div(BIG_DECIMAL_1E18)
    // log.info('Withdraw: User amount is more than zero, we should harvest {} swipe - block: {}', [
    //   pending.toString(),
    //   event.block.number.toString(),
    // ])
    // log.info('SWIPE PRICE {}', [getSwipePrice(event.block).toString()])
    if (pending.gt(BIG_DECIMAL_ZERO)) {
      // log.info('Harvesting {} SWIPE (CURRENT SWIPE PRICE {})', [
      //   pending.toString(),
      //   getSwipePrice(event.block).toString(),
      // ])
      const swipeHarvestedUSD = pending.times(getSwipePrice(event.block))
      user.swipeHarvested = user.swipeHarvested.plus(pending)
      user.swipeHarvestedUSD = user.swipeHarvestedUSD.plus(swipeHarvestedUSD)
      pool.swipeHarvested = pool.swipeHarvested.plus(pending)
      pool.swipeHarvestedUSD = pool.swipeHarvestedUSD.plus(swipeHarvestedUSD)
      poolHistory.swipeHarvested = pool.swipeHarvested
      poolHistory.swipeHarvestedUSD = pool.swipeHarvestedUSD
    }
  }

  const userInfo = swipeSwapContract.userInfo(event.params.pid, event.params.user)

  user.amount = userInfo.value0
  user.rewardDebt = userInfo.value1

  if (event.params.amount.gt(BIG_INT_ZERO)) {
    const reservesResult = pairContract.try_getReserves()

    if (!reservesResult.reverted) {
      const totalSupply = pairContract.totalSupply()

      const share = amount.div(totalSupply.toBigDecimal())

      const token0Amount = reservesResult.value.value0.toBigDecimal().times(share)

      const token1Amount = reservesResult.value.value1.toBigDecimal().times(share)

      const token0PriceUSD = getUSDRate(pairContract.token0(), event.block)

      const token1PriceUSD = getUSDRate(pairContract.token1(), event.block)

      const token0USD = token0Amount.times(token0PriceUSD)

      const token1USD = token1Amount.times(token1PriceUSD)

      const exitUSD = token0USD.plus(token1USD)

      pool.exitUSD = pool.exitUSD.plus(exitUSD)

      poolHistory.exitUSD = pool.exitUSD

      // log.info('User {} has withdrwn {} SLP tokens {} {} (${}) and {} {} (${}) at a combined value of ${}', [
      //   user.address.toHex(),
      //   amount.toString(),
      //   token0Amount.toString(),
      //   token0USD.toString(),
      //   pairContract.token0().toHex(),
      //   token1Amount.toString(),
      //   token1USD.toString(),
      //   pairContract.token1().toHex(),
      //   exitUSD.toString(),
      // ])

      user.exitUSD = user.exitUSD.plus(exitUSD)
    } else {
      log.info("Withdraw couldn't get reserves for pair {}", [poolInfo.value0.toHex()])
    }
  }

  // If SLP amount equals zero, remove from pool and reduce userCount
  if (user.amount.equals(BIG_INT_ZERO)) {
    user.pool = null
    pool.userCount = pool.userCount.minus(BIG_INT_ONE)
  }

  user.save()
  pool.save()

  const swipeSwap = getSwipeSwap(event.block)

  const days = event.block.timestamp.minus(swipeSwap.updatedAt).divDecimal(BigDecimal.fromString('86400'))
  const slpAge = swipeSwap.slpAge.plus(days.times(swipeSwap.slpBalance))
  const slpAgeRemoved = slpAge.div(swipeSwap.slpBalance).times(amount)
  swipeSwap.slpAge = slpAge.minus(slpAgeRemoved)
  swipeSwap.slpAgeRemoved = swipeSwap.slpAgeRemoved.plus(slpAgeRemoved)

  swipeSwap.slpWithdrawn = swipeSwap.slpWithdrawn.plus(amount)
  swipeSwap.slpBalance = swipeSwap.slpBalance.minus(amount)
  swipeSwap.updatedAt = event.block.timestamp
  swipeSwap.save()

  const history = getHistory(SWIPE_SWAP_ADDRESS.toHex(), event.block)
  history.slpAge = swipeSwap.slpAge
  history.slpAgeRemoved = history.slpAgeRemoved.plus(slpAgeRemoved)
  history.slpBalance = swipeSwap.slpBalance
  history.slpWithdrawn = history.slpWithdrawn.plus(amount)
  history.save()

  poolHistory.slpAge = pool.slpAge
  poolHistory.slpAgeRemoved = poolHistory.slpAgeRemoved.plus(slpAgeRemoved)
  poolHistory.slpBalance = pool.balance.divDecimal(BIG_DECIMAL_1E18)
  poolHistory.slpWithdrawn = poolHistory.slpWithdrawn.plus(amount)
  poolHistory.userCount = pool.userCount
  poolHistory.save()
}

export function emergencyWithdraw(event: EmergencyWithdraw): void {
  log.info('User {} emergancy withdrawal of {} from pool #{}', [
    event.params.user.toHex(),
    event.params.amount.toString(),
    event.params.pid.toString(),
  ])

  const pool = getPool(event.params.pid, event.block)

  const pairContract = PairContract.bind(pool.pair as Address)
  pool.balance = pairContract.balanceOf(SWIPE_SWAP_ADDRESS)
  pool.save()

  // Update user
  const user = getUser(event.params.pid, event.params.user, event.block)
  user.amount = BIG_INT_ZERO
  user.rewardDebt = BIG_INT_ZERO

  user.save()
}

export function ownershipTransferred(event: OwnershipTransferred): void {
  log.info('Ownership transfered from previous owner: {} to new owner: {}', [
    event.params.previousOwner.toHex(),
    event.params.newOwner.toHex(),
  ])
}
