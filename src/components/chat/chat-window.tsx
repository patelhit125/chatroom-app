"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "./message-bubble";
import { ChatTimer } from "./chat-timer";
import { ActiveUser, Message } from "@/lib/websocket/client";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Bot, Loader2, X } from "lucide-react";
import InfiniteScroll from "react-infinite-scroll-component";
import { EmojiPicker } from "./emoji-picker";
import { CoinTransfer } from "./coin-transfer";

interface ChatWindowProps {
  user: ActiveUser;
  messages: Message[];
  currentUserId: number;
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onBack: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  currentSessionId: number | null;
  onStartChat: () => void;
  onEndChat: () => void;
  chatStartTime: string | null;
  remainingPoints: number | null;
}

export function ChatWindow({
  user,
  messages,
  currentUserId,
  isTyping,
  onSendMessage,
  onTyping,
  onStopTyping,
  onBack,
  hasMore,
  onLoadMore,
  isLoadingMore,
  currentSessionId,
  onStartChat,
  onEndChat,
  chatStartTime,
  remainingPoints,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestMessageId = messages[messages.length - 1]?.id;
  const previousLatestIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!latestMessageId) return;
    if (previousLatestIdRef.current === latestMessageId) {
      return;
    }
    previousLatestIdRef.current = latestMessageId;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [latestMessageId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Send typing indicator
    onTyping();

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 1000);
  };

  const handleSendMessage = (content?: string) => {
    const messageContent = content || inputValue.trim();
    if (!messageContent) return;

    onSendMessage(messageContent);
    if (!content) {
      setInputValue("");
    }
    onStopTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
    // Trigger typing indicator when emoji is added
    onTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 1000);
  };

  const scrollContainerId = `chat-scroll-${user.id}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 justify-between border-b bg-white">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback>
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {user.is_online && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{user.name}</h3>
              {user.is_ai && <Bot className="h-4 w-4 text-gray-400" />}
            </div>
            <p className="text-xs text-gray-500">
              {user.is_online ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!currentSessionId ? (
            <Button
              onClick={onStartChat}
              size="sm"
              className="bg-black text-white hover:bg-gray-800"
            >
              Start Chat
            </Button>
          ) : (
            <>
              <ChatTimer
                isActive={!!currentSessionId}
                remainingPoints={remainingPoints}
                onEndChat={onEndChat}
              />
              <Button
                onClick={onEndChat}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                End Chat
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        id={scrollContainerId}
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col-reverse relative"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <InfiniteScroll
            dataLength={messages.length}
            next={onLoadMore}
            hasMore={hasMore}
            inverse
            scrollableTarget={scrollContainerId}
            loader={
              isLoadingMore ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              ) : null
            }
            style={{
              display: "flex",
              flexDirection: "column-reverse",
              overflowX: "hidden",
            }}
          >
            {messages
              .slice()
              .reverse()
              .map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === currentUserId}
                />
              ))}
          </InfiniteScroll>
        )}

        {/* Typing indicator - positioned at the bottom (top in reverse) */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-start items-center gap-2 mb-2 mt-auto"
              style={{ order: -1 }}
            >
              <div className="bg-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <motion.span
                    className="w-2 h-2 bg-gray-600 rounded-full"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-gray-600 rounded-full"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-gray-600 rounded-full"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2 items-center">
          <CoinTransfer
            receiverId={user.id}
            sessionId={currentSessionId}
            disabled={!currentSessionId}
            onTransferComplete={(transferData) => {
              // Send a message with coin transfer info
              // Format: COIN_TRANSFER:{transferId}:{amount}:{netAmount}
              const coinMessage = `COIN_TRANSFER:${transferData.transferId}:${transferData.amount}:${transferData.netAmount}`;
              handleSendMessage(coinMessage);
            }}
          />
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            disabled={!currentSessionId}
          />
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={
              currentSessionId
                ? "Type a message..."
                : "Start chat to send messages"
            }
            className="flex-1"
            disabled={!currentSessionId}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || !currentSessionId}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
