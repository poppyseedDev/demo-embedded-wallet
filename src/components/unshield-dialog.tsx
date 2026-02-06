"use client"

import { useState } from "react"
import { useUnshield } from "@/lib/fhevm"
import { Loader2, Unlock } from "lucide-react"
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

interface UnshieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UnshieldDialog({ open, onOpenChange, onSuccess }: UnshieldDialogProps) {
  const [selectedToken, setSelectedToken] = useState<WrapperToken>(WRAPPER_TOKEN_LIST[0])
  const [amount, setAmount] = useState("")

  const {
    unshield,
    isPending,
    isEncrypting,
    isSigning,
    isDecrypting,
    isFinalizing,
    error,
    reset,
  } = useUnshield({
    wrapperAddress: selectedToken.wrapper,
    onSuccess: (txHash) => {
      toast.success("Tokens unshielded successfully!", {
        description: `Transaction: ${txHash.slice(0, 10)}...`,
      })
      setAmount("")
      reset()
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err) => {
      toast.error("Unshield failed", {
        description: err.message,
      })
    },
  })

  const handleUnshield = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    try {
      const amountBigInt = parseUnits(amount, selectedToken.decimals)
      await unshield(amountBigInt)
    } catch (err) {
      console.error("Unshield error:", err)
    }
  }

  const handleClose = () => {
    if (!isPending) {
      setAmount("")
      reset()
      onOpenChange(false)
    }
  }

  const getStatusText = () => {
    if (isEncrypting) return "Encrypting..."
    if (isSigning) return "Sign in wallet..."
    if (isDecrypting) return "Getting proof..."
    if (isFinalizing) return "Finalizing..."
    return "Processing..."
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Unshield Tokens
          </DialogTitle>
          <DialogDescription>
            Convert your confidential tokens back to regular ERC20 tokens. This will reveal the amount.
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
                    {token.symbol} → {token.underlyingSymbol}
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
              Enter the amount of {selectedToken.symbol} to unshield
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
          <Button onClick={handleUnshield} disabled={isPending || !amount}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {getStatusText()}
              </>
            ) : (
              <>
                <Unlock className="mr-2 h-4 w-4" />
                Unshield
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
