'use client';

import { Message } from '@/lib/websocket/client';
import { formatTime } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';
import { CoinMessage } from './coin-message';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  // Parse COIN_TRANSFER message format: COIN_TRANSFER:transferId:amount:netAmount
  const coinTransferMatch = message.content.match(/^COIN_TRANSFER:(\d+):([\d.]+):([\d.]+)$/);
  
  // If it's a coin transfer (either from coin_transfer object or parsed from content), render the coin message component
  if (message.coin_transfer || coinTransferMatch) {
    const amount = message.coin_transfer?.amount || parseFloat(coinTransferMatch![2]);
    const netAmount = message.coin_transfer?.net_amount || parseFloat(coinTransferMatch![3]);
    
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className="flex flex-col">
          <CoinMessage
            amount={amount}
            netAmount={netAmount}
            isOwn={isOwn}
          />
          <div className={`flex items-center gap-1 mt-1 px-2 ${
            isOwn ? 'flex-row' : 'flex-row-reverse'
          }`}>
            <span className="text-xs text-gray-400">
              {formatTime(message.created_at)}
            </span>
            {isOwn && (
              <span className="text-gray-400">
                {message.is_read ? (
                  <CheckCheck className="h-3 w-3" />
                ) : message.is_delivered ? (
                  <CheckCheck className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Regular text message
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`relative px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-black text-white rounded-br-none'
              : 'bg-gray-100 text-gray-900 rounded-bl-none'
          }`}
        >
          <p className="text-sm break-words">{message.content}</p>
          
          {/* Tail */}
          <div
            className={`absolute bottom-0 w-0 h-0 border-[8px] border-transparent ${
              isOwn
                ? 'right-0 translate-x-full border-l-black'
                : 'left-0 -translate-x-full border-r-gray-100'
            }`}
            style={{
              borderBottomWidth: 0,
            }}
          />
        </div>
        
        <div className={`flex items-center gap-1 mt-1 px-2 ${
          isOwn ? 'flex-row' : 'flex-row-reverse'
        }`}>
          <span className="text-xs text-gray-400">
            {formatTime(message.created_at)}
          </span>
          {isOwn && (
            <span className="text-gray-400">
              {message.is_read ? (
                <CheckCheck className="h-3 w-3" />
              ) : message.is_delivered ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

