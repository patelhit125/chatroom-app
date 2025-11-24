"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ActiveUsersList } from "@/components/chat/active-users-list";
import { ChatWindow } from "@/components/chat/chat-window";
import { WalletCard } from "@/components/wallet/wallet-card";
import { useWebSocket, ActiveUser, Message } from "@/lib/websocket/client";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const MESSAGE_PAGE_SIZE = 30;

function mergeMessages(
  existing: Message[],
  incoming: Message[],
  append: boolean
) {
  const combined = append
    ? [...incoming, ...existing]
    : [...existing, ...incoming];

  const map = new Map<number, Message>();
  for (const message of combined) {
    map.set(message.id, message);
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isFetchingOlder, setIsFetchingOlder] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [chatStartTime, setChatStartTime] = useState<string | null>(null);

  const userId = session?.user?.id ? parseInt(session.user.id) : null;

  const {
    isConnected,
    activeUsers,
    activeUsersHasMore,
    isLoadingActiveUsers,
    messages,
    isTyping,
    currentSessionId,
    initiateChat,
    sendMessage,
    sendTyping,
    stopTyping,
    endChat,
    setMessages,
    setCurrentSessionId,
    loadMoreActiveUsers,
    remainingPoints,
  } = useWebSocket(userId);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    // Check window size
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize dummy users on mount
  useEffect(() => {
    const initDummyUsers = async () => {
      try {
        await fetch("/api/users/init-dummy", { method: "POST" });
      } catch (error) {
        console.error("Failed to init dummy users:", error);
      }
    };

    if (userId) {
      initDummyUsers();
    }
  }, [userId]);

  const fetchMessages = useCallback(
    async ({
      userId: targetUserId,
      before,
      append = false,
    }: {
      userId: number;
      before?: string | null;
      append?: boolean;
    }) => {
      try {
        const params = new URLSearchParams({
          userId: targetUserId.toString(),
          limit: MESSAGE_PAGE_SIZE.toString(),
        });

        if (before) {
          params.append("before", before);
        }

        const res = await fetch(`/api/chat/messages?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = await res.json();
        const fetchedMessages: Message[] = data.messages ?? [];

        setMessages((prev) => mergeMessages(prev, fetchedMessages, append));

        if (fetchedMessages.length > 0) {
          setOldestCursor(fetchedMessages[0].created_at);
        } else if (!append) {
          setOldestCursor(null);
        }

        setHasMoreMessages(Boolean(data.hasMore));
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    },
    [setMessages]
  );

  // Fetch session info when selectedUser or currentSessionId changes
  useEffect(() => {
    const fetchSession = async () => {
      if (!selectedUser || !userId) {
        setChatStartTime(null);
        return;
      }

      // If currentSessionId is null, clear chatStartTime
      if (!currentSessionId) {
        setChatStartTime(null);
        return;
      }

      try {
        const res = await fetch(`/api/chat/session?userId=${selectedUser.id}`);
        if (res.ok) {
          const data = await res.json();
          if (
            data.session &&
            data.session.status === "active" &&
            data.session.id === currentSessionId
          ) {
            setChatStartTime(data.session.started_at);
          } else {
            setChatStartTime(null);
            setCurrentSessionId(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch session:", error);
        setChatStartTime(null);
      }
    };

    fetchSession();
  }, [selectedUser, currentSessionId, userId, setCurrentSessionId]);

  const handleSelectUser = useCallback(
    async (user: ActiveUser) => {
      setSelectedUser(user);
      setMessages([]);
      setHasMoreMessages(true);
      setOldestCursor(null);
      setChatStartTime(null);

      await fetchMessages({ userId: user.id });
    },
    [fetchMessages, setMessages]
  );

  const handleStartChat = useCallback(() => {
    if (selectedUser) {
      initiateChat(selectedUser.id);
    }
  }, [selectedUser, initiateChat]);

  const handleEndChat = useCallback(() => {
    if (currentSessionId) {
      endChat();
      setChatStartTime(null);
      setCurrentSessionId(null);
    }
  }, [endChat, currentSessionId, setCurrentSessionId]);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!selectedUser || !hasMoreMessages || isFetchingOlder || !oldestCursor) {
      return;
    }

    setIsFetchingOlder(true);
    try {
      await fetchMessages({
        userId: selectedUser.id,
        before: oldestCursor,
        append: true,
      });
    } finally {
      setIsFetchingOlder(false);
    }
  }, [
    selectedUser,
    hasMoreMessages,
    isFetchingOlder,
    oldestCursor,
    fetchMessages,
  ]);

  const handleSendMessage = (content: string) => {
    if (selectedUser) {
      sendMessage(content, selectedUser.id);
    }
  };

  const handleTyping = () => {
    if (selectedUser) {
      sendTyping(selectedUser.id);
    }
  };

  const handleStopTyping = () => {
    if (selectedUser) {
      stopTyping(selectedUser.id);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setMessages([]);
    setHasMoreMessages(true);
    setOldestCursor(null);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const showChat = selectedUser && (isMobileView ? true : true);
  const showSidebar = !isMobileView || !selectedUser;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      {showSidebar && (
        <motion.div
          initial={false}
          animate={{ x: 0 }}
          className="w-full md:w-80 border-r bg-white flex flex-col"
        >
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Active Users</h2>
              <div className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                {isConnected ? "Connected" : "Connecting..."}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ActiveUsersList
              users={activeUsers}
              onSelectUser={handleSelectUser}
              selectedUserId={selectedUser?.id || null}
              hasMore={activeUsersHasMore}
              onLoadMore={loadMoreActiveUsers}
              isLoading={isLoadingActiveUsers}
            />
          </div>
        </motion.div>
      )}

      {/* Chat Area */}
      {showChat && selectedUser && userId ? (
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            user={selectedUser}
            messages={messages}
            currentUserId={userId}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
            onBack={handleBack}
            hasMore={hasMoreMessages}
            onLoadMore={handleLoadOlderMessages}
            isLoadingMore={isFetchingOlder}
            currentSessionId={currentSessionId}
            onStartChat={handleStartChat}
            onEndChat={handleEndChat}
            chatStartTime={chatStartTime}
            remainingPoints={remainingPoints}
          />
        </div>
      ) : !isMobileView ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                💬
              </motion.div>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Select a user to start chatting
            </h3>
            <p className="text-gray-500 text-sm">
              Choose from active users on the left
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
