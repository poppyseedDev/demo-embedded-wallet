import { createFhevmConfig, sepolia } from "@/lib/fhevm"

/**
 * FHEVM configuration for Sepolia testnet
 */
export const fhevmConfig = createFhevmConfig({
  chains: [sepolia],
})

/**
 * ERC7984 wrapper token configuration
 * These are the confidential token contracts deployed on Sepolia
 */
export interface WrapperToken {
  wrapper: `0x${string}`
  underlying: `0x${string}`
  symbol: string
  underlyingSymbol: string
  decimals: number
}

export const WRAPPER_TOKENS: Record<string, WrapperToken> = {
  cTEST1: {
    wrapper: "0x593E77e7E2bEe748aa27942E1f2069b5B6902625",
    underlying: "0x0D03CF79A2798b35C27b2b52B23674742D278F90",
    symbol: "cTEST1",
    underlyingSymbol: "TEST1",
    decimals: 6,  // Test tokens use 6 decimals (like USDC)
  },
  cTEST2: {
    wrapper: "0x9942aBbEAb7f5BcefbA3d9865B148aA79B2E82eB",
    underlying: "0xD616Bc7D4dbC05450dA7F7d3678e4047300bdc40",
    symbol: "cTEST2",
    underlyingSymbol: "TEST2",
    decimals: 6,  // Test tokens use 6 decimals (like USDC)
  },
} as const

export const WRAPPER_TOKEN_LIST = Object.values(WRAPPER_TOKENS)

/**
 * Format a bigint amount with decimals for display
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals: number = 6
): string {
  if (amount === BigInt(0)) {
    return "0"
  }

  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const remainder = amount % divisor

  if (remainder === BigInt(0)) {
    return whole.toString()
  }

  const remainderStr = remainder.toString().padStart(decimals, "0")
  const trimmed = remainderStr.slice(0, maxDecimals).replace(/0+$/, "")

  // If the formatted value would be 0 but we have a non-zero amount,
  // show the raw amount in scientific notation or as raw wei
  if (whole === BigInt(0) && trimmed === "") {
    // Show as raw amount with token units suffix
    return `${amount.toString()} wei`
  }

  if (trimmed === "") {
    return whole.toString()
  }

  return `${whole}.${trimmed}`
}
