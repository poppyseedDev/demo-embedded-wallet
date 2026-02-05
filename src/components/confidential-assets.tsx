"use client"

import { useState } from "react"
import {
  useFhevmStatus,
  useConfidentialBalances,
  useEthersSigner,
} from "@/lib/fhevm"
import { Eye, EyeOff, Lock, Send, Shield, Unlock, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { useWallets } from "@/providers/wallet-provider"
import {
  WRAPPER_TOKEN_LIST,
  WRAPPER_TOKENS,
  formatTokenAmount,
  type WrapperToken,
} from "@/config/fhevm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface TokenRowProps {
  token: WrapperToken
  balanceData: {
    result?: string | null
    status?: string
    decryptedValue?: bigint | string | boolean
    error?: Error
  } | undefined
  isDecrypting: boolean
  isLoading: boolean
}

function TokenRow({ token, balanceData, isDecrypting, isLoading }: TokenRowProps) {
  const handle = balanceData?.result
  const hasBalance = !!handle
  const decryptedValue = balanceData?.decryptedValue
  const isRevealed = decryptedValue !== undefined
  const status = balanceData?.status

  // Debug logging
  console.log(`[TokenRow ${token.symbol}]`, {
    handle,
    hasBalance,
    decryptedValue,
    isRevealed,
    status,
    balanceData,
  })

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">Confidential {token.underlyingSymbol}</div>
            <div className="text-xs text-muted-foreground">{token.symbol}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">
        {`${token.wrapper.slice(0, 6)}...${token.wrapper.slice(-4)}`}
      </TableCell>
      <TableCell>
        {isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : status === "failure" ? (
          <div className="flex items-center gap-1 text-red-500">
            <AlertCircle className="h-3 w-3" />
            <span className="text-xs">Error</span>
          </div>
        ) : isRevealed ? (
          // Decrypted value takes priority - show it first
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-green-500" />
            <span className="font-mono text-sm font-medium">
              {formatTokenAmount(BigInt(decryptedValue.toString()), token.decimals)}
            </span>
          </div>
        ) : isDecrypting ? (
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs text-muted-foreground italic">Decrypting...</span>
          </div>
        ) : hasBalance ? (
          // Show encrypted handle
          <div className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            <span className="font-mono text-xs" title={handle}>
              {handle.slice(0, 10)}...{handle.slice(-6)}
            </span>
          </div>
        ) : (
          // No balance at all
          <span className="text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell>
        {isLoading ? (
          <Skeleton className="h-5 w-20" />
        ) : isRevealed ? (
          <Badge variant="default" className="gap-1 bg-green-600">
            <Eye className="h-3 w-3" />
            Revealed
          </Badge>
        ) : hasBalance ? (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" />
            Encrypted
          </Badge>
        ) : (
          <Badge variant="outline">No Balance</Badge>
        )}
      </TableCell>
    </TableRow>
  )
}

export default function ConfidentialAssets() {
  const { state } = useWallets()
  const { selectedAccount } = state
  const { isReady: fhevmIsReady, status: fhevmStatus, error: fhevmError } = useFhevmStatus()
  const { provider: ethersProvider, isReady: ethersReady } = useEthersSigner()

  // Use react-sdk's useConfidentialBalances hook
  const {
    data: balanceData,
    decryptAll,
    isDecrypting,
    canDecrypt,
    isAllDecrypted,
    isLoading,
    isError,
    error: balanceError,
    status: balanceStatus,
  } = useConfidentialBalances({
    contracts: WRAPPER_TOKEN_LIST.map((t) => ({ contractAddress: t.wrapper })),
    account: selectedAccount?.address as `0x${string}` | undefined,
    enabled: !!selectedAccount?.address && fhevmIsReady && ethersReady,
    decrypt: true,
  })

  const handleRevealBalances = async () => {
    if (!canDecrypt) {
      toast.error("Cannot decrypt balances right now")
      return
    }

    try {
      toast.info("Please sign the decryption request...")
      decryptAll()
    } catch (error) {
      console.error("Decryption failed:", error)
      toast.error("Failed to reveal balances: " + (error as Error).message)
    }
  }

  const hasAnyBalance = balanceData?.some((b) => !!b?.result) ?? false

  // Debug logging
  console.log("[ConfidentialAssets] balanceData:", balanceData)
  console.log("[ConfidentialAssets] hasAnyBalance:", hasAnyBalance, "isAllDecrypted:", isAllDecrypted, "canDecrypt:", canDecrypt)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Confidential Assets
            <Badge variant="secondary" className="ml-2">
              FHE
            </Badge>
          </CardTitle>

{/* Button moved to CardContent for better visibility */}
        </div>
        <p className="text-sm text-muted-foreground">
          Privacy-preserving tokens powered by Fully Homomorphic Encryption
        </p>

        {/* Status indicators */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={fhevmIsReady ? "text-green-600" : "text-amber-600"}>
            FHE: {fhevmStatus}
          </span>
          <span className={ethersReady ? "text-green-600" : "text-amber-600"}>
            Provider: {ethersReady ? "ready" : "initializing"}
          </span>
          {selectedAccount && (
            <span className="text-muted-foreground">
              Account: {selectedAccount.address.slice(0, 6)}...
            </span>
          )}
          <span className="text-muted-foreground">
            | hasBalance: {hasAnyBalance ? "yes" : "no"} | allDecrypted: {isAllDecrypted ? "yes" : "no"} | canDecrypt: {canDecrypt ? "yes" : "no"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">
              Error loading balances: {balanceError?.message || "Unknown error"}
            </p>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Contract</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {WRAPPER_TOKEN_LIST.map((token, index) => (
              <TokenRow
                key={token.symbol}
                token={token}
                balanceData={balanceData?.[index]}
                isDecrypting={isDecrypting}
                isLoading={isLoading}
              />
            ))}
          </TableBody>
        </Table>

        {/* Decrypt button - always visible when there are balances */}
        {hasAnyBalance && (
          <div className="mt-4 flex items-center gap-4">
            {isAllDecrypted ? (
              <Badge variant="default" className="gap-1 bg-green-600 px-4 py-2">
                <Eye className="h-4 w-4" />
                All Balances Revealed
              </Badge>
            ) : (
              <Button
                variant="default"
                className="gap-2"
                onClick={handleRevealBalances}
                disabled={!canDecrypt || isDecrypting}
              >
                {isDecrypting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Reveal Balances
                  </>
                )}
              </Button>
            )}
            {!canDecrypt && !isAllDecrypted && (
              <span className="text-xs text-muted-foreground">
                (Waiting for FHE to be ready...)
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              toast.info("Shield: Convert ERC20 to Confidential tokens (coming soon)")
            }
          >
            <Shield className="h-4 w-4" />
            Shield Tokens
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              toast.info("Unshield: Convert Confidential to ERC20 tokens (coming soon)")
            }
          >
            <Unlock className="h-4 w-4" />
            Unshield Tokens
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              toast.info("Confidential Transfer (coming soon)")
            }
          >
            <Send className="h-4 w-4" />
            Transfer
          </Button>
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Test Tokens on Sepolia:</strong>
          </p>
          <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
            <li>cTEST1 wraps TEST1 at {WRAPPER_TOKENS.cTEST1.underlying.slice(0, 10)}...</li>
            <li>cTEST2 wraps TEST2 at {WRAPPER_TOKENS.cTEST2.underlying.slice(0, 10)}...</li>
            <li>Shield tokens first to get confidential balances</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
