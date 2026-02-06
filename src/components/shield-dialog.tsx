"use client"

import { useState } from "react"
import { useShield } from "@/lib/fhevm"
import { Loader2, Shield } from "lucide-react"
import { toast } from "sonner"
import { parseUnits } from "viem"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WRAPPER_TOKEN_LIST, type WrapperToken } from "@/config/fhevm"

interface ShieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ShieldDialog({ open, onOpenChange, onSuccess }: ShieldDialogProps) {
  const [selectedToken, setSelectedToken] = useState<WrapperToken>(WRAPPER_TOKEN_LIST[0])
  const [amount, setAmount] = useState("")

  const {
    shield,
    isPending,
    isApproving,
    isWrapping,
    error,
    reset,
  } = useShield({
    wrapperAddress: selectedToken.wrapper,
    underlyingAddress: selectedToken.underlying,
    onSuccess: (txHash) => {
      toast.success("Tokens shielded successfully!", {
        description: `Transaction: ${txHash.slice(0, 10)}...`,
      })
      setAmount("")
      reset()
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err) => {
      toast.error("Shield failed", {
        description: err.message,
      })
    },
  })

  const handleShield = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    try {
      const amountBigInt = parseUnits(amount, selectedToken.decimals)
      await shield(amountBigInt)
    } catch (err) {
      console.error("Shield error:", err)
    }
  }

  const handleClose = () => {
    if (!isPending) {
      setAmount("")
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Shield Tokens
          </DialogTitle>
          <DialogDescription>
            Convert your ERC20 tokens to confidential tokens. Your balance will be encrypted on-chain.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="token">Token</Label>
            <Select
              value={selectedToken.symbol}
              onValueChange={(value) => {
                const token = WRAPPER_TOKEN_LIST.find((t) => t.symbol === value)
                if (token) setSelectedToken(token)
              }}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                {WRAPPER_TOKEN_LIST.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    {token.underlyingSymbol} → {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
              min="0"
              step="any"
            />
            <p className="text-xs text-muted-foreground">
              Enter the amount of {selectedToken.underlyingSymbol} to shield
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleShield} disabled={isPending || !amount}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isApproving ? "Approving..." : isWrapping ? "Shielding..." : "Processing..."}
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Shield
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
