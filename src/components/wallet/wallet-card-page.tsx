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
import {
  Wallet,
  Plus,
  Clock,
  TrendingUp,
  Coins,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface WalletCardPageProps {
  onBalanceUpdate?: () => void;
}

export function WalletCardPage({ onBalanceUpdate }: WalletCardPageProps) {
  const [points, setPoints] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [coins, setCoins] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [convertAmount, setConvertAmount] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { toast } = useToast();

  const fetchBalance = async () => {
    try {
      const [balanceRes, coinsRes] = await Promise.all([
        fetch("/api/wallet/balance", {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/coins/balance", {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (balanceRes.ok) {
        const contentType = balanceRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const data = await balanceRes.json();
            setPoints(data.points || 0);
            setSeconds(data.seconds || 0);
          } catch (parseError) {
            console.error("Failed to parse balance response:", parseError);
          }
        } else {
          const text = await balanceRes.text();
          console.error(
            "Invalid response type from balance API:",
            text.substring(0, 100)
          );
        }
      } else {
        console.error(
          "Balance API error:",
          balanceRes.status,
          balanceRes.statusText
        );
      }

      if (coinsRes.ok) {
        const contentType = coinsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const coinsData = await coinsRes.json();
            setCoins(coinsData.coins || 0);
          } catch (parseError) {
            console.error(
              "Failed to parse coins balance response:",
              parseError
            );
          }
        } else {
          const text = await coinsRes.text();
          console.error(
            "Invalid response type from coins balance API:",
            text.substring(0, 100)
          );
        }
      } else {
        console.error(
          "Coins balance API error:",
          coinsRes.status,
          coinsRes.statusText
        );
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  useEffect(() => {
    fetchBalance();
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

  const handleConvertCoins = async () => {
    const coinAmount = parseFloat(convertAmount);
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

    setIsConverting(true);
    try {
      const res = await fetch("/api/coins/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins: coinAmount }),
      });

      if (res.ok) {
        const data = await res.json();
        setConvertAmount("");
        setIsConvertOpen(false);
        await fetchBalance();

        toast({
          title: "Conversion successful! 🎉",
          description: `Converted ${coinAmount} coins to ${data.pointsReceived.toFixed(
            2
          )} points (${data.secondsReceived} seconds)`,
        });

        onBalanceUpdate?.();
      } else {
        const error = await res.json();
        throw new Error(error.error || "Conversion failed");
      }
    } catch (error: any) {
      toast({
        title: "Conversion failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handlePurchaseCoins = async () => {
    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount < 1) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount (minimum ₹1)",
        variant: "destructive",
      });
      return;
    }

    setIsPurchasing(true);
    try {
      const res = await fetch("/api/coins/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const data = await res.json();
        setPurchaseAmount("");
        setIsPurchaseOpen(false);
        await fetchBalance();

        toast({
          title: "Coins purchased! 🎉",
          description: `Purchased ${data.coinsReceived.toFixed(
            2
          )} coins for ₹${amount}`,
        });

        onBalanceUpdate?.();
      } else {
        const error = await res.json();
        throw new Error(error.error || "Purchase failed");
      }
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white rounded-2xl p-8 shadow-2xl relative overflow-hidden"
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-white/5 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-300">
                Wallet Balance
              </h2>
              <p className="text-sm text-gray-400">Your available balance</p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100 font-semibold shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
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
        </div>

        {/* Balance Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coins Card */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 backdrop-blur-sm rounded-xl p-6 border border-yellow-400/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-300" />
                <span className="text-sm font-medium text-yellow-300">
                  Coins
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-yellow-200">
                {coins.toFixed(0)}
              </span>
            </div>
            <p className="text-xs text-yellow-300/80 mt-2">
              Transferable coins
            </p>
            <div className="flex gap-2 mt-3">
              <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white border-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Buy Coins
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Purchase Coins</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="purchase-amount">Amount (₹)</Label>
                      <Input
                        id="purchase-amount"
                        type="number"
                        min="1"
                        step="10"
                        placeholder="100"
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        ₹1 = 1 Coin (can be transferred or converted to points)
                      </p>
                    </div>
                    {purchaseAmount && parseFloat(purchaseAmount) > 0 && (
                      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            You will receive:
                          </span>
                          <div className="flex items-center gap-1">
                            <Coins className="h-4 w-4 text-yellow-600" />
                            <span className="font-bold text-yellow-600">
                              {parseFloat(purchaseAmount).toFixed(0)} coins
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPurchaseAmount("100")}
                        className="flex-1"
                      >
                        ₹100
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPurchaseAmount("500")}
                        className="flex-1"
                      >
                        ₹500
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPurchaseAmount("1000")}
                        className="flex-1"
                      >
                        ₹1000
                      </Button>
                    </div>
                    <Button
                      onClick={handlePurchaseCoins}
                      disabled={
                        isPurchasing ||
                        !purchaseAmount ||
                        parseFloat(purchaseAmount) < 1
                      }
                      className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
                    >
                      {isPurchasing ? "Processing..." : "Purchase Coins"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 border border-yellow-400/30"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Convert
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convert Coins to Points</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="convert-amount">Coins to Convert</Label>
                      <Input
                        id="convert-amount"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="10"
                        value={convertAmount}
                        onChange={(e) => setConvertAmount(e.target.value)}
                        max={coins}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Available: {coins.toFixed(2)} coins
                      </p>
                    </div>
                    <Button
                      onClick={handleConvertCoins}
                      disabled={
                        isConverting ||
                        !convertAmount ||
                        parseFloat(convertAmount) < 1
                      }
                      className="w-full"
                    >
                      {isConverting ? "Converting..." : "Convert Now"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Points Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-gray-300" />
                <span className="text-sm font-medium text-gray-300">
                  Points
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{formatPoints(points)}</span>
              <span className="text-sm text-gray-400">pts</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Available for chat sessions
            </p>
          </div>

          {/* Chat Time Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-300" />
                <span className="text-sm font-medium text-gray-300">
                  Chat Time
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                {formatSeconds(seconds)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Remaining chat duration
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
