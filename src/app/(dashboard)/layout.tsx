import { WalletsProvider } from "@/providers/wallet-provider"
import { TurnkeyFhevmProvider } from "@/providers/fhevm-provider"

import { Toaster } from "@/components/ui/sonner"
import AuthGuard from "@/components/auth-guard"
import NavMenu from "@/components/nav-menu"
import { SessionExpiryWarning } from "@/components/session-expiry-warning"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <main className="bg-muted/40 h-screen dark:bg-neutral-950/80">
        <WalletsProvider>
          <TurnkeyFhevmProvider>
            <NavMenu />
            <div className="">{children}</div>
          </TurnkeyFhevmProvider>
        </WalletsProvider>
        <SessionExpiryWarning />
        <Toaster />
      </main>
    </AuthGuard>
  )
}
