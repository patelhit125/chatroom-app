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
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Send, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CoinTransferProps {
  receiverId: number;
  sessionId: number | null;
  onTransferComplete?: (transferData: {
    transferId: number;
    amount: number;
    netAmount: number;
  }) => void;
  disabled?: boolean;
}

export function CoinTransfer({
  receiverId,
  sessionId,
  onTransferComplete,
  disabled = false,
}: CoinTransferProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [coins, setCoins] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchCoins();
  }, []);

  const fetchCoins = async () => {
    try {
      const res = await fetch("/api/coins/balance");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setCoins(data.coins || 0);
        } else {
          console.error("Invalid response type from coins balance API");
        }
      }
    } catch (error) {
      console.error("Failed to fetch coins:", error);
    }
  };

  const handleSend = async () => {
    const coinAmount = parseFloat(amount);
    if (isNaN(coinAmount) || coinAmount < 1) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount (minimum 1 coin)",
        variant: "destructive",
      });
      return;
    }

    if (coinAmount > coins) {
      toast({
        title: "Insufficient coins",
        description: `You only have ${coins.toFixed(2)} coins`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/coins/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          amount: coinAmount,
          sessionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAmount("");
        setIsOpen(false);
        await fetchCoins();

        toast({
          title: "Coins sent! 🎉",
          description: `Sent ${coinAmount} coins. Receiver got ${data.netAmountReceived.toFixed(2)} coins (after 20% deduction)`,
        });

        onTransferComplete?.({
          transferId: data.transferId,
          amount: coinAmount,
          netAmount: data.netAmountReceived,
        });
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to send coins");
      }
    } catch (error: any) {
      toast({
        title: "Failed to send coins",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const GST_RATE = 18;
  const PLATFORM_FEE = 2;
  const previewAmount = parseFloat(amount) || 0;
  const gstAmount = previewAmount * 0.18;
  const platformFeeAmount = previewAmount * 0.02;
  const netAmount = previewAmount * 0.8;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          disabled={disabled || coins < 1}
          title="Send coins"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Coins className="h-5 w-5 text-yellow-500" />
          </motion.div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Send Coins
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Your Balance</span>
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="text-lg font-bold text-yellow-600">
                  {coins.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="coin-amount">Amount (Coins)</Label>
            <Input
              id="coin-amount"
              type="number"
              min="1"
              step="1"
              placeholder="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={coins}
            />
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount("10")}
                className="flex-1"
              >
                10
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount("50")}
                className="flex-1"
              >
                50
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount("100")}
                className="flex-1"
              >
                100
              </Button>
            </div>
          </div>

          {previewAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200"
            >
              <div className="text-sm font-semibold text-gray-700 mb-3">
                Transfer Breakdown
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Sent</span>
                  <span className="font-medium">{previewAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>GST ({GST_RATE}%)</span>
                  <span>-{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Platform Fee ({PLATFORM_FEE}%)</span>
                  <span>-{platformFeeAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-1.5 mt-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">
                      Receiver Gets
                    </span>
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      <span className="font-bold text-yellow-600">
                        {netAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <Button
            onClick={handleSend}
            disabled={isLoading || !amount || parseFloat(amount) < 1}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
          >
            {isLoading ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Coins
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

