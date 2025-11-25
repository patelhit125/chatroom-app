import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "@/components/ui/use-toast";

export interface Message {
  id: number;
  session_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_delivered: boolean;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  sender_image?: string;
  coin_transfer?: {
    amount: number;
    net_amount: number;
    transfer_id: number;
  };
}

export interface ActiveUser {
  id: number;
  name: string;
  image: string | null;
  is_online: boolean;
  last_seen: string | null;
  is_ai: boolean;
  last_message_at: string | null;
}

const ACTIVE_USERS_PAGE_SIZE = 20;

export function useWebSocket(userId: number | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [activeUsersHasMore, setActiveUsersHasMore] = useState(true);
  const [activeUsersNextOffset, setActiveUsersNextOffset] = useState<
    number | null
  >(0);
  const [isLoadingActiveUsers, setIsLoadingActiveUsers] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [remainingPoints, setRemainingPoints] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const fetchActiveUsersRef = useRef<
    (options?: { reset?: boolean }) => Promise<void>
  >(async () => {});

  const fetchActiveUsers = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (!userId) return;
      if (!reset && (activeUsersNextOffset === null || !activeUsersHasMore)) {
        return;
      }

      const offset =
        reset || activeUsersNextOffset === null ? 0 : activeUsersNextOffset;

      try {
        setIsLoadingActiveUsers(true);
        const params = new URLSearchParams({
          limit: ACTIVE_USERS_PAGE_SIZE.toString(),
          offset: offset.toString(),
        });

        const response = await fetch(`/api/users/active?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch active users");
        }

        const data: {
          users: ActiveUser[];
          hasMore?: boolean;
          nextOffset?: number | null;
        } = await response.json();

        setActiveUsers((prev) =>
          reset ? data.users : [...prev, ...data.users]
        );
        setActiveUsersHasMore(Boolean(data.hasMore));
        setActiveUsersNextOffset(
          data.hasMore ? data.nextOffset ?? offset + data.users.length : null
        );
      } catch (error) {
        console.error("Failed to fetch active users:", error);
      } finally {
        setIsLoadingActiveUsers(false);
      }
    },
    [userId, activeUsersNextOffset, activeUsersHasMore]
  );

  useEffect(() => {
    fetchActiveUsersRef.current = fetchActiveUsers;
  }, [fetchActiveUsers]);

  // Fetch initial active users via REST API
  useEffect(() => {
    if (!userId) {
      setActiveUsers([]);
      setActiveUsersHasMore(true);
      setActiveUsersNextOffset(0);
      return;
    }

    fetchActiveUsers({ reset: true });
  }, [userId, fetchActiveUsers]);

  useEffect(() => {
    if (!userId) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      {
        transports: ["websocket", "polling"],
        // Reconnection settings
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        // Timeout settings
        timeout: 20000,
        // Auto connect
        autoConnect: true,
        // Upgrade to websocket
        upgrade: true,
        // Force new connection
        forceNew: false,
        // Multiplex
        multiplex: true,
      }
    );

    console.log("🔌 Connecting to WebSocket...");

    newSocket.on("connect_error", (error) => {
      console.error("🔌 WebSocket connection error:", error);
      console.log("🔄 Will retry connection automatically...");
    });

    newSocket.on("reconnect_attempt", (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}...`);
    });

    newSocket.on("reconnect", (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
      setIsConnected(true);
      // Re-authenticate after reconnection
      if (userId) {
        newSocket.emit("authenticate", userId);
      }
    });

    newSocket.on("reconnect_error", (error) => {
      console.error("❌ Reconnection error:", error);
    });

    newSocket.on("reconnect_failed", () => {
      console.error("❌ Failed to reconnect after maximum attempts");
      setIsConnected(false);
    });

    newSocket.on("connect", () => {
      console.log("🔌 Connected to WebSocket");
      setIsConnected(true);
      newSocket.emit("authenticate", userId);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket");
      setIsConnected(false);
    });

    newSocket.on("active_users_update", () => {
      fetchActiveUsersRef.current({ reset: true });
    });

    newSocket.on("chat_started", ({ sessionId }) => {
      setCurrentSessionId(sessionId);
      // Fetch initial balance as fallback
      if (userId) {
        fetch("/api/wallet/balance", {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((res) => {
            if (res.ok) {
              const contentType = res.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                return res.json();
              }
              return res.text().then((text) => {
                throw new Error(
                  `Invalid response type: ${text.substring(0, 50)}`
                );
              });
            }
            throw new Error(`HTTP error! status: ${res.status}`);
          })
          .then((data) => {
            if (data && data.points !== undefined) {
              setRemainingPoints(data.points);
            }
          })
          .catch((error) => {
            console.error("Failed to fetch initial balance:", error);
          });
      }
    });

    newSocket.on("message_confirmed", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("new_message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("user_typing", () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    });

    newSocket.on("user_stop_typing", () => {
      setIsTyping(false);
    });

    newSocket.on("points_update", ({ points }) => {
      setRemainingPoints(points);
    });

    newSocket.on("points_exhausted", () => {
      toast({
        title: "Points exhausted",
        description: "Please recharge to continue chatting.",
        variant: "destructive",
      });
      setCurrentSessionId(null);
    });

    newSocket.on("chat_ended", ({ reason }) => {
      toast({
        title: "Chat ended",
        description: reason || "The chat session was closed.",
      });
      setCurrentSessionId(null);
    });

    newSocket.on("chat_error", ({ message }) => {
      toast({
        title: "Chat error",
        description: message,
        variant: "destructive",
      });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  const initiateChat = useCallback(
    (targetUserId: number) => {
      if (socket && userId) {
        socket.emit("initiate_chat", { userId, targetUserId });
      }
    },
    [socket, userId]
  );

  const sendMessage = useCallback(
    (content: string, receiverId: number) => {
      if (socket && currentSessionId && userId) {
        socket.emit("send_message", {
          sessionId: currentSessionId,
          senderId: userId,
          receiverId,
          content,
        });
      }
    },
    [socket, currentSessionId, userId]
  );

  const sendTyping = useCallback(
    (receiverId: number) => {
      if (socket && currentSessionId && userId) {
        socket.emit("typing", {
          sessionId: currentSessionId,
          userId,
          receiverId,
        });
      }
    },
    [socket, currentSessionId, userId]
  );

  const stopTyping = useCallback(
    (receiverId: number) => {
      if (socket && currentSessionId && userId) {
        socket.emit("stop_typing", {
          sessionId: currentSessionId,
          userId,
          receiverId,
        });
      }
    },
    [socket, currentSessionId, userId]
  );

  const endChat = useCallback(() => {
    if (socket && currentSessionId && userId) {
      socket.emit("end_chat", {
        sessionId: currentSessionId,
        userId,
      });
    }
  }, [socket, currentSessionId, userId]);

  const loadMoreActiveUsers = useCallback(() => {
    if (isLoadingActiveUsers || !activeUsersHasMore) return;
    fetchActiveUsers({ reset: false });
  }, [fetchActiveUsers, isLoadingActiveUsers, activeUsersHasMore]);

  return {
    socket,
    isConnected,
    activeUsers,
    activeUsersHasMore,
    isLoadingActiveUsers,
    currentSessionId,
    messages,
    isTyping,
    remainingPoints,
    initiateChat,
    sendMessage,
    sendTyping,
    stopTyping,
    endChat,
    setMessages,
    setCurrentSessionId,
    loadMoreActiveUsers,
  };
}
