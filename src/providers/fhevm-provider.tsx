"use client"

import { useState, useEffect, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { sepolia } from "viem/chains"

import { FhevmProvider, memoryStorage } from "@/lib/fhevm"
import { fhevmConfig } from "@/config/fhevm"
import { useWallets } from "@/providers/wallet-provider"
import { useTurnkey } from "@turnkey/react-wallet-kit"
import { getTurnkeyWalletClient, getPublicClient } from "@/lib/web3"
import { createEip1193Adapter, type Eip1193Provider } from "@/lib/eip1193-adapter"

// Create a stable QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
})

interface TurnkeyFhevmProviderProps {
  children: ReactNode
}

/**
 * Wraps children with FhevmProvider, automatically connecting to Turnkey wallet.
 * Creates an EIP-1193 adapter from Turnkey's viem WalletClient.
 */
export function TurnkeyFhevmProvider({ children }: TurnkeyFhevmProviderProps) {
  const { state } = useWallets()
  const { httpClient, session } = useTurnkey()
  const { selectedAccount } = state

  const [provider, setProvider] = useState<Eip1193Provider | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  // Create EIP-1193 adapter when wallet is connected
  useEffect(() => {
    async function initProvider() {
      if (!selectedAccount?.address || !httpClient || !session?.organizationId) {
        setProvider(undefined)
        // Clean up window.ethereum if we previously set it
        if (typeof window !== "undefined" && (window as any).__turnkeyEip1193) {
          delete (window as any).ethereum
          delete (window as any).__turnkeyEip1193
        }
        return
      }

      setIsLoading(true)
      try {
        // Get Turnkey wallet client with user's sub-organization ID
        const walletClient = await getTurnkeyWalletClient(
          httpClient,
          selectedAccount.address,
          session.organizationId  // Pass the user's sub-org ID
        )
        const publicClient = getPublicClient()

        // Create EIP-1193 adapter
        const eip1193Provider = createEip1193Adapter(walletClient, publicClient)
        setProvider(eip1193Provider)

        // Inject into window.ethereum so useEthersSigner can find it
        // This is required because react-sdk's useEthersSigner looks for window.ethereum
        if (typeof window !== "undefined") {
          ;(window as any).ethereum = eip1193Provider
          ;(window as any).__turnkeyEip1193 = true // Flag to track we set it
        }
      } catch (error) {
        console.error("[TurnkeyFhevmProvider] Failed to init provider:", error)
        setProvider(undefined)
      } finally {
        setIsLoading(false)
      }
    }

    initProvider()
  }, [selectedAccount?.address, httpClient, session?.organizationId])

  const isConnected = !!selectedAccount?.address && !!provider
  const address = selectedAccount?.address as `0x${string}` | undefined

  return (
    <QueryClientProvider client={queryClient}>
      <FhevmProvider
        config={fhevmConfig}
        provider={provider}
        address={address}
        chainId={sepolia.id}
        isConnected={isConnected}
        storage={memoryStorage}
      >
        {children}
      </FhevmProvider>
    </QueryClientProvider>
  )
}
