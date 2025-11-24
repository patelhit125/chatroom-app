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
        const data = await res.json();
        setPoints(data.points);
        setSeconds(data.seconds);
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
      className="bg-gradient-to-br from-black to-gray-800 text-white rounded-lg p-1 shadow-md flex items-center gap-4"
    >
      <Link
        href="/wallet"
        className="flex items-center gap-2 hover:text-gray-800 transition-colors hover:bg-gray-100 rounded-sm p-1"
      >
        <Wallet className="h-4 w-4" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">Points</span>
            <span className="text-sm font-bold">{formatPoints(points)}</span>
          </div>
          <div className="h-4 w-px bg-gray-600" />
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">
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
            className="h-7 px-2 text-xs rounded-sm"
          >
            <Plus className="h-3 w-3 mr-1" />
            Recharge
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
