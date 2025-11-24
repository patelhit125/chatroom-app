"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { WalletCardPage } from "@/components/wallet/wallet-card-page";
import { formatDate, formatTime } from "@/lib/utils";
import { motion } from "framer-motion";
import { Loader2, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import InfiniteScroll from "react-infinite-scroll-component";

interface Transaction {
  id: number;
  amount: number | string;
  points: number | string;
  type: string;
  description: string;
  created_at: Date | string;
}

const TRANSACTIONS_PAGE_SIZE = 20;

export default function WalletPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldestCursorRef = useRef<string | null>(null);
  const [balanceKey, setBalanceKey] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const fetchTransactions = useCallback(async (append = false) => {
    try {
      const params = new URLSearchParams({
        limit: TRANSACTIONS_PAGE_SIZE.toString(),
      });

      if (append && oldestCursorRef.current) {
        params.append("before", oldestCursorRef.current);
      }

      const res = await fetch(`/api/wallet/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedTransactions: Transaction[] = data.transactions || [];

        if (append) {
          setTransactions((prev) => [...prev, ...fetchedTransactions]);
        } else {
          setTransactions(fetchedTransactions);
        }

        if (fetchedTransactions.length > 0) {
          const lastTransaction =
            fetchedTransactions[fetchedTransactions.length - 1];
          oldestCursorRef.current = new Date(
            lastTransaction.created_at
          ).toISOString();
        } else {
          oldestCursorRef.current = null;
        }

        setHasMore(Boolean(data.hasMore));
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      setTransactions([]);
      oldestCursorRef.current = null;
      setHasMore(true);
      fetchTransactions(false);
    }
  }, [session, fetchTransactions]);

  const handleBalanceUpdate = () => {
    setBalanceKey((prev) => prev + 1);
    setTransactions([]);
    oldestCursorRef.current = null;
    setHasMore(true);
    fetchTransactions(false);
  };

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || !oldestCursorRef.current) {
      return;
    }
    setIsLoadingMore(true);
    fetchTransactions(true);
  }, [hasMore, isLoadingMore, fetchTransactions]);

  const getTransactionIcon = (type: string) => {
    if (type === "recharge" || type === "credit") {
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-500" />;
  };

  const getTransactionColor = (type: string) => {
    if (type === "recharge" || type === "credit") {
      return "text-green-600";
    }
    return "text-red-600";
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Wallet</h1>
          <p className="text-gray-600">
            Manage your balance and view transaction history
          </p>
        </div>

        <WalletCardPage
          key={balanceKey}
          onBalanceUpdate={handleBalanceUpdate}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Transaction History
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              View all your wallet transactions
            </p>
          </div>

          <div
            id="transactions-scroll"
            className="max-h-[calc(100vh-24rem)] overflow-y-auto"
          >
            {transactions.length === 0 && !isLoading ? (
              <div className="p-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No transactions yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Your transaction history will appear here
                </p>
              </div>
            ) : (
              <InfiniteScroll
                dataLength={transactions.length}
                next={handleLoadMore}
                hasMore={hasMore}
                loader={
                  isLoadingMore ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : null
                }
                scrollableTarget="transactions-scroll"
                style={{ overflow: "visible" }}
              >
                <div className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-shrink-0">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              {transaction.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-gray-500">
                                {formatDate(transaction.created_at)}
                              </p>
                              <span className="text-gray-300">•</span>
                              <p className="text-sm text-gray-500">
                                {formatTime(transaction.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p
                              className={`font-semibold ${getTransactionColor(
                                transaction.type
                              )}`}
                            >
                              {transaction.type === "recharge" ||
                              transaction.type === "credit"
                                ? "+"
                                : "-"}
                              ₹{Number(transaction.amount).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {Number(transaction.points) > 0 ? "+" : ""}
                              {Number(transaction.points).toFixed(2)} points
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </InfiniteScroll>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
