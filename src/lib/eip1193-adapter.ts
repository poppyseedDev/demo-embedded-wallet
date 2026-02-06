import type { WalletClient, PublicClient } from "viem"

/**
 * EIP-1193 Provider interface
 */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

/**
 * Creates an EIP-1193 compatible provider from viem WalletClient and PublicClient.
 * This adapter allows Turnkey's viem-based wallet to work with libraries
 * that expect an EIP-1193 provider (like @zama-fhe/react-sdk).
 */
export function createEip1193Adapter(
  walletClient: WalletClient,
  publicClient: PublicClient
): Eip1193Provider {
  return {
    async request({ method, params = [] }: { method: string; params?: unknown[] }) {
      // Debug logging for transaction-related methods
      if (method.includes("Transaction")) {
        console.log(`[EIP1193Adapter] ${method} called with params:`, params)
      }

      switch (method) {
        case "eth_chainId": {
          const chainId = await publicClient.getChainId()
          return `0x${chainId.toString(16)}`
        }

        case "eth_accounts":
        case "eth_requestAccounts": {
          if (!walletClient.account) {
            return []
          }
          return [walletClient.account.address]
        }

        case "eth_getBalance": {
          const [address, block] = params as [string, string?]
          const balance = await publicClient.getBalance({
            address: address as `0x${string}`,
            blockTag: block as "latest" | "pending" | undefined,
          })
          return `0x${balance.toString(16)}`
        }

        case "eth_blockNumber": {
          const blockNumber = await publicClient.getBlockNumber()
          return `0x${blockNumber.toString(16)}`
        }

        case "eth_call": {
          const [txParams, block] = params as [any, string?]
          const result = await publicClient.call({
            to: txParams.to,
            data: txParams.data,
            account: txParams.from,
            blockTag: block as "latest" | "pending" | undefined,
          })
          return result.data
        }

        case "eth_estimateGas": {
          const [txParams] = params as [any]
          const gas = await publicClient.estimateGas({
            to: txParams.to,
            data: txParams.data,
            account: walletClient.account,
            value: txParams.value ? BigInt(txParams.value) : undefined,
          })
          return `0x${gas.toString(16)}`
        }

        case "eth_sendTransaction": {
          const [txParams] = params as [any]
          if (!walletClient.account) {
            throw new Error("No account connected")
          }
          const hash = await walletClient.sendTransaction({
            to: txParams.to,
            data: txParams.data,
            value: txParams.value ? BigInt(txParams.value) : undefined,
            account: walletClient.account,
            chain: walletClient.chain,
          })
          return hash
        }

        case "personal_sign": {
          const [message, address] = params as [string, string]
          if (!walletClient.account) {
            throw new Error("No account connected")
          }
          const signature = await walletClient.signMessage({
            account: walletClient.account,
            message: { raw: message as `0x${string}` },
          })
          return signature
        }

        case "eth_signTypedData":
        case "eth_signTypedData_v4": {
          const [address, typedDataJson] = params as [string, string]
          if (!walletClient.account) {
            throw new Error("No account connected")
          }

          const typedData = typeof typedDataJson === "string"
            ? JSON.parse(typedDataJson)
            : typedDataJson

          const signature = await walletClient.signTypedData({
            account: walletClient.account,
            domain: typedData.domain,
            types: typedData.types,
            primaryType: typedData.primaryType,
            message: typedData.message,
          })
          return signature
        }

        case "eth_getTransactionReceipt": {
          const [hash] = params as [string]

          let receipt
          try {
            receipt = await publicClient.getTransactionReceipt({
              hash: hash as `0x${string}`,
            })
          } catch (err: any) {
            // viem throws when receipt not found (transaction pending)
            // Return null so ethers can retry polling
            if (err?.message?.includes("could not be found")) {
              return null
            }
            throw err
          }

          if (!receipt) return null

          // Convert viem receipt format to ethers-compatible format
          const typeMap: Record<string, string> = {
            legacy: "0x0",
            eip2930: "0x1",
            eip1559: "0x2",
            eip4844: "0x3",
          }

          // Destructure to remove viem-specific fields
          const { type: viemType, ...rest } = receipt as any

          return {
            ...rest,
            type: typeof viemType === "string" ? typeMap[viemType] || "0x0" : `0x${viemType?.toString(16) || "0"}`,
            blockNumber: `0x${receipt.blockNumber.toString(16)}`,
            cumulativeGasUsed: `0x${receipt.cumulativeGasUsed.toString(16)}`,
            effectiveGasPrice: `0x${receipt.effectiveGasPrice.toString(16)}`,
            gasUsed: `0x${receipt.gasUsed.toString(16)}`,
            status: receipt.status === "success" ? "0x1" : "0x0",
            transactionIndex: `0x${receipt.transactionIndex.toString(16)}`,
          }
        }

        case "eth_getTransactionByHash": {
          const [hash] = params as [string]
          const tx = await publicClient.getTransaction({
            hash: hash as `0x${string}`,
          })
          if (!tx) return null

          // Convert viem transaction format to ethers-compatible format
          // viem returns type as string ("legacy", "eip1559", etc.), ethers expects hex number
          const typeMap: Record<string, string> = {
            legacy: "0x0",
            eip2930: "0x1",
            eip1559: "0x2",
            eip4844: "0x3",
          }

          // Destructure to remove viem-specific fields that confuse ethers
          const { type: viemType, typeHex, yParity, ...rest } = tx as any

          return {
            ...rest,
            // Convert type to hex format expected by ethers
            type: typeof viemType === "string" ? typeMap[viemType] || "0x0" : `0x${viemType?.toString(16) || "0"}`,
            // Ensure numeric fields are hex strings for ethers compatibility
            blockNumber: tx.blockNumber ? `0x${tx.blockNumber.toString(16)}` : null,
            gas: `0x${tx.gas.toString(16)}`,
            gasPrice: tx.gasPrice ? `0x${tx.gasPrice.toString(16)}` : undefined,
            maxFeePerGas: tx.maxFeePerGas ? `0x${tx.maxFeePerGas.toString(16)}` : undefined,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? `0x${tx.maxPriorityFeePerGas.toString(16)}` : undefined,
            nonce: `0x${tx.nonce.toString(16)}`,
            value: `0x${tx.value.toString(16)}`,
            transactionIndex: tx.transactionIndex !== null ? `0x${tx.transactionIndex.toString(16)}` : null,
            chainId: `0x${tx.chainId.toString(16)}`,
            v: tx.v !== undefined ? `0x${tx.v.toString(16)}` : undefined,
          }
        }

        default:
          console.warn(`[EIP1193Adapter] Unhandled method: ${method}`)
          throw new Error(`Method ${method} not supported`)
      }
    },
  }
}
