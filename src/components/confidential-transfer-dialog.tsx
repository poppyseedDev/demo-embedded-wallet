"use client"

import { useState } from "react"
import { useConfidentialTransfer } from "@/lib/fhevm"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { isAddress, parseUnits } from "viem"

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

interface ConfidentialTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ConfidentialTransferDialog({
  open,
  onOpenChange,
  onSuccess,
}: ConfidentialTransferDialogProps) {
  const [selectedToken, setSelectedToken] = useState<WrapperToken>(WRAPPER_TOKEN_LIST[0])
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")

  const {
    transfer,
    isPending,
    isEncrypting,
    isSigning,
    isConfirming,
    error,
    reset,
  } = useConfidentialTransfer({
    contractAddress: selectedToken.wrapper,
    onSuccess: (txHash) => {
      toast.success("Confidential transfer successful!", {
        description: `Transaction: ${txHash.slice(0, 10)}...`,
      })
      setAmount("")
      setRecipient("")
      reset()
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err) => {
      toast.error("Transfer failed", {
        description: err.message,
      })
    },
  })

  const handleTransfer = async () => {
    if (!recipient || !isAddress(recipient)) {
      toast.error("Please enter a valid recipient address")
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    try {
      const amountBigInt = parseUnits(amount, selectedToken.decimals)
      await transfer(recipient as `0x${string}`, amountBigInt)
    } catch (err) {
      console.error("Transfer error:", err)
    }
  }

  const handleClose = () => {
    if (!isPending) {
      setAmount("")
      setRecipient("")
      reset()
      onOpenChange(false)
    }
  }

  const getStatusText = () => {
    if (isEncrypting) return "Encrypting..."
    if (isSigning) return "Sign in wallet..."
    if (isConfirming) return "Confirming..."
    return "Processing..."
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Confidential Transfer
          </DialogTitle>
          <DialogDescription>
            Transfer confidential tokens privately. The amount remains encrypted on-chain.
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
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              type="text"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={isPending}
            />
            {recipient && !isAddress(recipient) && (
              <p className="text-xs text-red-500">Invalid address</p>
            )}
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
              Enter the amount of {selectedToken.symbol} to transfer
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
          <Button
            onClick={handleTransfer}
            disabled={isPending || !amount || !recipient || !isAddress(recipient)}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {getStatusText()}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Transfer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
