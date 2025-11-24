"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Coins, Sparkles, Gift, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface CoinMessageProps {
  amount: number;
  netAmount: number;
  isOwn: boolean;
}

export function CoinMessage({ amount, netAmount, isOwn }: CoinMessageProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: -180 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
        duration: 0.6,
      }}
      className={`flex items-center gap-3 ${
        isOwn ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`relative bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 rounded-3xl ${
          isOwn ? "rounded-br-sm" : "rounded-bl-sm"
        } p-5 shadow-2xl max-w-xs overflow-hidden border-2 border-yellow-300/50`}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full"
              initial={{
                x: Math.random() * 100 + "%",
                y: Math.random() * 100 + "%",
                scale: 0,
              }}
              animate={{
                scale: [0, 1, 0],
                y: [null, Math.random() * 100 + "%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Floating sparkles */}
        <div className="absolute -top-3 -right-3">
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Sparkles className="h-6 w-6 text-yellow-200 drop-shadow-lg" />
          </motion.div>
        </div>

        <div className="absolute -top-2 -left-2">
          <motion.div
            animate={{
              rotate: [360, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Zap className="h-5 w-5 text-amber-300 drop-shadow-lg" />
          </motion.div>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex items-center gap-4">
          {/* Animated coin icon */}
          <motion.div
            animate={{
              rotate: [0, 15, -15, 0],
              scale: [1, 1.15, 1],
              y: [0, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 0.5,
            }}
            className="relative"
          >
            <div className="bg-white/30 backdrop-blur-sm rounded-full p-3 shadow-lg border-2 border-white/40">
              <Coins className="h-10 w-10 text-white drop-shadow-lg" />
            </div>
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 bg-yellow-300 rounded-full blur-xl opacity-50"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0.3, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.div>

          {/* Text content */}
          <div className="text-white flex-1">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-2"
            >
              {!isOwn && (
                <Gift className="h-4 w-4 text-yellow-200 animate-pulse" />
              )}
              <span className="text-xs font-semibold opacity-90 uppercase tracking-wide">
                {isOwn ? "You Sent" : "Received"}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="flex items-baseline gap-2"
            >
              <span className="text-4xl font-extrabold drop-shadow-lg">
                {amount.toFixed(0)}
              </span>
              <span className="text-lg font-semibold opacity-90">coins</span>
            </motion.div>

            {!isOwn && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-2 pt-2 border-t border-white/20"
              >
                <div className="flex items-center gap-1 text-xs">
                  <Sparkles className="h-3 w-3 text-yellow-200" />
                  <span className="opacity-80">
                    +{netAmount.toFixed(2)} after fees
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Shine sweep effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "easeInOut",
          }}
          style={{ transform: "skewX(-25deg)" }}
        />

        {/* Confetti effect on receive */}
        <AnimatePresence>
          {showConfetti && !isOwn && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                  initial={{
                    x: "50%",
                    y: "50%",
                    scale: 0,
                    rotate: 0,
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 200}%`,
                    y: `${50 + (Math.random() - 0.5) * 200}%`,
                    scale: [0, 1, 0],
                    rotate: 360,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Border glow animation */}
        <motion.div
          className="absolute inset-0 rounded-3xl border-2 border-yellow-200/50"
          animate={{
            boxShadow: [
              "0 0 20px rgba(251, 191, 36, 0.3)",
              "0 0 40px rgba(251, 191, 36, 0.6)",
              "0 0 20px rgba(251, 191, 36, 0.3)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
      </div>
    </motion.div>
  );
}

