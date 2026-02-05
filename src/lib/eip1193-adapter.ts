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
          const receipt = await publicClient.getTransactionReceipt({
            hash: hash as `0x${string}`,
          })
          return receipt
        }

        case "eth_getTransactionByHash": {
          const [hash] = params as [string]
          const tx = await publicClient.getTransaction({
            hash: hash as `0x${string}`,
          })
          return tx
        }

        default:
          console.warn(`[EIP1193Adapter] Unhandled method: ${method}`)
          throw new Error(`Method ${method} not supported`)
      }
    },
  }
}
