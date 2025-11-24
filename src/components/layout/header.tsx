"use client";

import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, LogOut } from "lucide-react";
import { WalletCard } from "@/components/wallet/wallet-card";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 bg-black rounded-full">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold">ChatApp</h1>
        </Link>

        <div className="flex items-center gap-4">
          {session?.user && (
            <>
              <WalletCard />
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image || undefined} />
                  <AvatarFallback>
                    {session.user.name?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline">
                  {session.user.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
