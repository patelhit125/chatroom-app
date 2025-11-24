"use client";

import { useEffect, useState, memo, useRef } from "react";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const POINTS_PER_SECOND = parseFloat(
  process.env.NEXT_PUBLIC_WALLET_POINTS_PER_SECOND || "0.1667"
);

interface ChatTimerProps {
  isActive: boolean;
  remainingPoints: number | null;
  onEndChat: () => void;
}

function ChatTimerComponent({
  isActive,
  remainingPoints,
  onEndChat,
}: ChatTimerProps) {
  const [displaySeconds, setDisplaySeconds] = useState<number>(0);
  const [isRechargeDialogOpen, setIsRechargeDialogOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasEndedRef = useRef(false);
  const prevDisplaySecondsRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Fetch balance if active but remainingPoints is null
  useEffect(() => {
    if (isActive && remainingPoints === null) {
      fetch("/api/wallet/balance")
        .then((res) => {
          if (res.ok) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              return res.json();
            }
            throw new Error("Invalid response type");
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        })
        .then((data) => {
          if (data && data.points !== undefined && typeof data.points === "number") {
            const seconds = Math.max(
              0,
              Math.floor(data.points / POINTS_PER_SECOND)
            );
            setDisplaySeconds(seconds);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch balance for timer:", error);
        });
    }
  }, [isActive, remainingPoints]);

  useEffect(() => {
    if (!isActive) {
      setDisplaySeconds(0);
      return;
    }

    // Only update if remainingPoints is a valid number
    if (typeof remainingPoints === "number" && remainingPoints >= 0) {
      const seconds = Math.max(
        0,
        Math.floor(remainingPoints / POINTS_PER_SECOND)
      );
      setDisplaySeconds(seconds);
    }
    // If remainingPoints is null, keep the current displaySeconds
    // (it will be updated when points_update event arrives)
  }, [isActive, remainingPoints]);

  // Watch for when timer reaches 0 and end chat
  useEffect(() => {
    const prevValue = prevDisplaySecondsRef.current;
    prevDisplaySecondsRef.current = displaySeconds;

    // Only trigger if timer transitions from > 0 to 0
    if (
      isActive &&
      displaySeconds === 0 &&
      prevValue !== null &&
      prevValue > 0 &&
      !hasEndedRef.current
    ) {
      hasEndedRef.current = true;
      // Use setTimeout to defer the state updates to avoid render phase issues
      setTimeout(() => {
        onEndChat();
        setIsRechargeDialogOpen(true);
      }, 0);
    }
  }, [isActive, displaySeconds, onEndChat]);

  // Timer countdown interval
  useEffect(() => {
    if (!isActive) {
      hasEndedRef.current = false;
      prevDisplaySecondsRef.current = null;
      return;
    }

    const interval = setInterval(() => {
      setDisplaySeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

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
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setRechargeAmount("");
          setIsRechargeDialogOpen(false);

          toast({
            title: "Recharge successful!",
            description: `Added ₹${amount} to your wallet`,
          });

          // Reset the ended flag so timer can work again if chat is restarted
          hasEndedRef.current = false;
        } else {
          throw new Error("Invalid response type");
        }
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

  if (!isActive) {
    return null;
  }

  const minutes = Math.floor(displaySeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (displaySeconds % 60).toString().padStart(2, "0");

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md">
        <Clock className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-mono font-medium text-gray-700">
          {minutes}:{seconds}
        </span>
      </div>

      <Dialog
        open={isRechargeDialogOpen}
        onOpenChange={setIsRechargeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time's Up!</DialogTitle>
            <DialogDescription>
              Your chat time has ended. Recharge your wallet to continue
              chatting.
            </DialogDescription>
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
    </>
  );
}

// Memoize to prevent unnecessary re-renders
export const ChatTimer = memo(ChatTimerComponent);
