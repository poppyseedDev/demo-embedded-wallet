"use client"

import { useMemo, useEffect, useState } from "react"
import { useWallets } from "@/providers/wallet-provider"
import { formatEther, formatUnits } from "viem"
import { Coins } from "lucide-react"

import { truncateAddress } from "@/lib/utils"
import { useTokenPrice } from "@/hooks/use-token-price"
import { getPublicClient } from "@/lib/web3"
import { WRAPPER_TOKENS } from "@/config/fhevm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Icons } from "./icons"

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Test token configurations
const TEST_TOKENS = [
  {
    symbol: "TEST1",
    name: "Test Token 1",
    address: WRAPPER_TOKENS.cTEST1.underlying,
    decimals: 18,  // Standard ERC20 decimals
  },
  {
    symbol: "TEST2",
    name: "Test Token 2",
    address: WRAPPER_TOKENS.cTEST2.underlying,
    decimals: 18,  // Standard ERC20 decimals
  },
]

export default function Assets() {
  const { state } = useWallets()
  const { ethPrice } = useTokenPrice()
  const { selectedAccount } = state

  // Token balances state
  const [tokenBalances, setTokenBalances] = useState<Record<string, bigint>>({})

  // Fetch ERC20 token balances
  useEffect(() => {
    async function fetchTokenBalances() {
      if (!selectedAccount?.address) return

      const publicClient = getPublicClient()
      const balances: Record<string, bigint> = {}

      for (const token of TEST_TOKENS) {
        try {
          const balance = await publicClient.readContract({
            address: token.address,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [selectedAccount.address],
          })
          balances[token.symbol] = balance
        } catch (err) {
          console.error(`Failed to fetch ${token.symbol} balance:`, err)
          balances[token.symbol] = BigInt(0)
        }
      }

      setTokenBalances(balances)
    }

    fetchTokenBalances()
    // Refresh every 30 seconds
    const interval = setInterval(fetchTokenBalances, 30000)
    return () => clearInterval(interval)
  }, [selectedAccount?.address])

  // Memoize the balance calculation
  const amount = useMemo(() => {
    return selectedAccount?.balance
      ? parseFloat(
          Number(formatEther(selectedAccount?.balance ?? BigInt(0))).toFixed(8)
        ).toString()
      : "0"
  }, [selectedAccount?.balance])

  // Memoize the value calculation
  const valueInUSD = useMemo(() => {
    return (
      Number(formatEther(selectedAccount?.balance ?? BigInt(0))) *
      (ethPrice || 0)
    ).toFixed(2)
  }, [selectedAccount?.balance, ethPrice])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-2xl">Assets</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="">
              <TableHead>Asset</TableHead>
              <TableHead className="hidden sm:table-cell">Address</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="hidden sm:table-cell">
                Value (USD)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* ETH Row */}
            <TableRow>
              <TableCell className="p-2 font-medium sm:p-4">
                <div className="flex items-center space-x-2 text-xs sm:text-sm">
                  <Icons.ethereum className="h-6 w-6" />
                  <span>Ethereum (Sepolia)</span>
                </div>
              </TableCell>
              <TableCell className="hidden font-mono text-xs sm:table-cell">
                {selectedAccount?.address &&
                  truncateAddress(selectedAccount?.address)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{amount}</TableCell>
              <TableCell className="hidden sm:table-cell">
                ${valueInUSD}
              </TableCell>
              <TableCell className="p-2 sm:hidden">
                <div className="font-medium">
                  {amount}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ETH
                  </span>
                </div>
                <div className=" text-sm text-muted-foreground">
                  ${valueInUSD}
                </div>
              </TableCell>
            </TableRow>

            {/* Test Token Rows */}
            {TEST_TOKENS.map((token) => {
              const balance = tokenBalances[token.symbol] ?? BigInt(0)
              const formattedBalance = formatUnits(balance, token.decimals)
              return (
                <TableRow key={token.symbol}>
                  <TableCell className="p-2 font-medium sm:p-4">
                    <div className="flex items-center space-x-2 text-xs sm:text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <Coins className="h-4 w-4 text-primary" />
                      </div>
                      <span>{token.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">
                    {truncateAddress(token.address)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formattedBalance}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    -
                  </TableCell>
                  <TableCell className="p-2 sm:hidden">
                    <div className="font-medium">
                      {formattedBalance}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {token.symbol}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
