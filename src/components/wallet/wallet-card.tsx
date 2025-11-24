"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPoints, formatSeconds } from "@/lib/utils";
import { motion } from "framer-motion";
import { Wallet, Plus, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

interface WalletCardProps {
  onBalanceUpdate?: () => void;
}

export function WalletCard({ onBalanceUpdate }: WalletCardProps) {
  const [points, setPoints] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/wallet/balance");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setPoints(data.points);
          setSeconds(data.seconds);
        } else {
          console.error("Invalid response type from balance API");
        }
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  useEffect(() => {
    fetchBalance();
    // const interval = setInterval(fetchBalance, 5000); // Update every 5 seconds
    // return () => clearInterval(interval);
  }, []);

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount < 1) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount (minimum ₹1)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/wallet/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const data = await res.json();
        setPoints(data.points);
        setSeconds(data.seconds);
        setRechargeAmount("");
        setIsOpen(false);

        toast({
          title: "Recharge successful!",
          description: `Added ₹${amount} to your wallet`,
        });

        onBalanceUpdate?.();
      } else {
        throw new Error("Recharge failed");
      }
    } catch {
      toast({
        title: "Recharge failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-black to-gray-800 text-white rounded-lg shadow-md flex items-center gap-2 sm:gap-4 p-1"
    >
      <Link
        href="/wallet"
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity rounded-sm p-1 min-w-0"
      >
        <Wallet className="h-4 w-4 flex-shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          {/* Points - compact on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 min-w-0">
            <span className="text-[10px] sm:text-xs hidden sm:inline">
              Points
            </span>
            <span className="text-[11px] sm:text-sm font-bold whitespace-nowrap">
              {formatPoints(points)}
            </span>
          </div>
          {/* Divider - hide on very small screens */}
          <div className="h-3 sm:h-4 w-px bg-gray-600/60 hidden sm:block flex-shrink-0" />
          {/* Chat Time - compact on mobile */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="text-[11px] sm:text-sm font-bold whitespace-nowrap">
              {formatSeconds(seconds)}
            </span>
          </div>
        </div>
      </Link>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs rounded-sm flex-shrink-0"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline sm:ml-1">Recharge</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recharge Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="10"
                placeholder="50"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                ₹50 = 50 Points = 300 seconds of chat time
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRechargeAmount("50")}
              >
                ₹50
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRechargeAmount("100")}
              >
                ₹100
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRechargeAmount("200")}
              >
                ₹200
              </Button>
            </div>
            <Button
              onClick={handleRecharge}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Processing..." : "Recharge Now"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
