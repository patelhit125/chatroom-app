import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { query } from "../db.js";
import { generateAIResponse } from "../openai.js";

let io: SocketIOServer | null = null;

// Store active sessions and their timers
const activeSessionTimers = new Map<number, NodeJS.Timeout>();

export function initializeWebSocketServer(server: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Connection timeout and ping/pong settings
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    connectTimeout: 45000, // 45 seconds
    // Allow more time for slow connections
    upgradeTimeout: 30000, // 30 seconds
    // Increase max HTTP buffer size
    maxHttpBufferSize: 1e6, // 1MB
    // Allow reconnection
    allowEIO3: true,
    // Transport options
    transports: ["websocket", "polling"],
  });

  io.on("connection", async (socket: Socket) => {
    console.log("🔌 Client connected:", socket.id);

    // Handle socket errors
    socket.on("error", (error) => {
      console.error("❌ Socket error:", socket.id, error);
    });

    // Handle user authentication
    socket.on("authenticate", async (userId: number) => {
      try {
        socket.data.userId = userId;

        // Update user online status
        await query(
          `INSERT INTO user_online_status (user_id, is_online, socket_id, updated_at)
           VALUES ($1, TRUE, $2, NOW())
           ON CONFLICT (user_id)
           DO UPDATE SET is_online = TRUE, socket_id = $2, updated_at = NOW()`,
          [userId, socket.id]
        );

        // Broadcast updated active users list
        await broadcastActiveUsers();

        console.log(`✅ User ${userId} authenticated`);
      } catch (error) {
        console.error("Authentication error:", error);
      }
    });

    // Handle chat initiation
    socket.on("initiate_chat", async ({ userId, targetUserId }) => {
      try {
        // Check if user has sufficient points
        const walletResult = await query(
          "SELECT points FROM wallet_balance WHERE user_id = $1",
          [userId]
        );

        const points = parseFloat(walletResult.rows[0]?.points || "0");
        const pointsPerSecond = parseFloat(
          process.env.WALLET_POINTS_PER_SECOND || "0.1667"
        );

        if (points < pointsPerSecond) {
          socket.emit("chat_error", {
            message: "Insufficient points. Please recharge your wallet.",
          });
          return;
        }

        // Check if an active session already exists where current user is the initiator
        // Get the most recent active session, or most recent ended session if no active one exists
        const existingSessionCheck = await query(
          `SELECT id, status FROM chat_sessions
           WHERE user1_id = $1 AND user2_id = $2
           ORDER BY 
             CASE WHEN status = 'active' THEN 0 ELSE 1 END,
             started_at DESC
           LIMIT 1`,
          [userId, targetUserId]
        );

        let sessionId: number;

        if (existingSessionCheck.rows.length > 0) {
          // Session exists with current user as initiator
          const existingSession = existingSessionCheck.rows[0];
          sessionId = existingSession.id;

          // If session is not active, reactivate it
          if (existingSession.status !== "active") {
            await query(
              `UPDATE chat_sessions 
               SET status = 'active', started_at = NOW()
               WHERE id = $1`,
              [sessionId]
            );
            console.log(
              `✅ Reactivated session ${sessionId} for user ${userId} -> ${targetUserId}`
            );
          } else {
            console.log(
              `✅ Reusing existing active session ${sessionId} for user ${userId} -> ${targetUserId}`
            );
          }
        } else {
          // No session exists for current user, create a new one
          const newSessionResult = await query(
            `INSERT INTO chat_sessions (user1_id, user2_id, status, started_at)
             VALUES ($1, $2, 'active', NOW())
             RETURNING id`,
            [userId, targetUserId]
          );
          sessionId = newSessionResult.rows[0].id;
          console.log(
            `✅ Created new session ${sessionId} for user ${userId} -> ${targetUserId}`
          );
        }

        // Verify the session was created/retrieved correctly
        const verifySession = await query(
          `SELECT id, user1_id, user2_id, status FROM chat_sessions WHERE id = $1`,
          [sessionId]
        );

        if (verifySession.rows.length === 0) {
          socket.emit("chat_error", {
            message: "Failed to create or retrieve session",
          });
          return;
        }

        const verifiedSession = verifySession.rows[0];
        if (
          verifiedSession.user1_id !== userId ||
          verifiedSession.user2_id !== targetUserId
        ) {
          socket.emit("chat_error", {
            message: "Session mismatch detected",
          });
          return;
        }

        // Verify the other user's session still exists (if it did before)
        const otherUserSessionCheck = await query(
          `SELECT id FROM chat_sessions
           WHERE user1_id = $1 AND user2_id = $2 AND status = 'active'`,
          [targetUserId, userId]
        );

        if (otherUserSessionCheck.rows.length > 0) {
          console.log(
            `✅ Both sessions active: User ${userId} session ${sessionId} and User ${targetUserId} session ${otherUserSessionCheck.rows[0].id}`
          );
        }

        // Stop any existing timer for this session before starting a new one
        const existingTimer = activeSessionTimers.get(sessionId);
        if (existingTimer) {
          clearInterval(existingTimer);
          activeSessionTimers.delete(sessionId);
        }

        // Start points deduction timer (only for this user's session)
        startSessionTimer(sessionId, userId, targetUserId);

        // Emit initial points balance to user
        const currentBalanceResult = await query(
          "SELECT points FROM wallet_balance WHERE user_id = $1",
          [userId]
        );
        const currentPoints = parseFloat(
          currentBalanceResult.rows[0]?.points || "0"
        );
        socket.emit("points_update", { points: currentPoints });

        // Notify only the initiating user
        socket.emit("chat_started", { sessionId, targetUserId });

        console.log(
          `💬 Chat session ${sessionId} started between ${userId} and ${targetUserId}`
        );
      } catch (error) {
        console.error("Chat initiation error:", error);
        socket.emit("chat_error", { message: "Failed to initiate chat" });
      }
    });

    // Handle sending messages
    socket.on(
      "send_message",
      async ({ sessionId, senderId, receiverId, content }) => {
        try {
          // Validate session is active
          const sessionCheck = await query(
            "SELECT status FROM chat_sessions WHERE id = $1",
            [sessionId]
          );

          if (
            sessionCheck.rows.length === 0 ||
            sessionCheck.rows[0].status !== "active"
          ) {
            socket.emit("message_error", { message: "Session is not active" });
            return;
          }

          // Check if user has points
          const walletResult = await query(
            "SELECT points FROM wallet_balance WHERE user_id = $1",
            [senderId]
          );

          const points = parseFloat(walletResult.rows[0]?.points || "0");
          if (points <= 0) {
            socket.emit("points_exhausted");
            await endSession(sessionId);
            return;
          }

          // Insert message into database
          const messageResult = await query(
            `INSERT INTO messages (session_id, sender_id, receiver_id, content, is_delivered)
           VALUES ($1, $2, $3, $4, TRUE)
           RETURNING id, session_id, sender_id, receiver_id, content, is_delivered, is_read, created_at`,
            [sessionId, senderId, receiverId, content]
          );

          const message = messageResult.rows[0];

          // Broadcast to both users
          socket.emit("message_confirmed", message);

          const receiverSocket = await getSocketByUserId(receiverId);
          if (receiverSocket) {
            receiverSocket.emit("new_message", message);

            // Mark as read if receiver is active
            await query("UPDATE messages SET is_read = TRUE WHERE id = $1", [
              message.id,
            ]);
          }

          // Check if receiver is an AI dummy user
          const aiUserCheck = await query(
            "SELECT personality FROM dummy_ai_users WHERE user_id = $1",
            [receiverId]
          );

          if (aiUserCheck.rows.length > 0) {
            // Generate AI response after a short delay
            setTimeout(async () => {
              try {
                const personality = aiUserCheck.rows[0].personality;

                // Get message history
                const historyResult = await query(
                  `SELECT sender_id, content FROM messages 
                 WHERE session_id = $1 
                 ORDER BY created_at DESC LIMIT 10`,
                  [sessionId]
                );

                const messageHistory = historyResult.rows
                  .reverse()
                  .map((msg) => ({
                    role: msg.sender_id === receiverId ? "assistant" : "user",
                    content: msg.content,
                  }));

                const aiResponse = await generateAIResponse(
                  personality,
                  messageHistory as Array<{
                    role: "user" | "assistant";
                    content: string;
                  }>,
                  content
                );

                // Insert AI response
                const aiMessageResult = await query(
                  `INSERT INTO messages (session_id, sender_id, receiver_id, content, is_delivered, is_read)
                 VALUES ($1, $2, $3, $4, TRUE, TRUE)
                 RETURNING id, session_id, sender_id, receiver_id, content, is_delivered, is_read, created_at`,
                  [sessionId, receiverId, senderId, aiResponse]
                );

                const aiMessage = aiMessageResult.rows[0];

                // Send AI response to user
                socket.emit("new_message", aiMessage);
              } catch (error) {
                console.error("AI response error:", error);
              }
            }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds
          }
        } catch (error) {
          console.error("Send message error:", error);
          socket.emit("message_error", { message: "Failed to send message" });
        }
      }
    );

    // Handle typing indicator
    socket.on("typing", async ({ sessionId, userId, receiverId }) => {
      const receiverSocket = await getSocketByUserId(receiverId);
      if (receiverSocket) {
        receiverSocket.emit("user_typing", { userId, sessionId });
      }
    });

    socket.on("stop_typing", async ({ sessionId, userId, receiverId }) => {
      const receiverSocket = await getSocketByUserId(receiverId);
      if (receiverSocket) {
        receiverSocket.emit("user_stop_typing", { userId, sessionId });
      }
    });

    // Handle ending chat
    socket.on("end_chat", async ({ sessionId, userId }) => {
      try {
        // Verify user owns the session
        const sessionCheck = await query(
          "SELECT user1_id, user2_id FROM chat_sessions WHERE id = $1 AND status = 'active'",
          [sessionId]
        );

        if (sessionCheck.rows.length === 0) {
          socket.emit("chat_error", {
            message: "Session not found or already ended",
          });
          return;
        }

        const session = sessionCheck.rows[0];
        const isOwner =
          session.user1_id === userId || session.user2_id === userId;

        if (!isOwner) {
          socket.emit("chat_error", {
            message: "Unauthorized to end this chat",
          });
          return;
        }

        // End the session
        await endSession(sessionId);

        // Notify both users
        socket.emit("chat_ended", { reason: "Chat ended by user" });

        const otherUserId =
          session.user1_id === userId ? session.user2_id : session.user1_id;
        const otherSocket = await getSocketByUserId(otherUserId);
        if (otherSocket) {
          otherSocket.emit("chat_ended", {
            reason: "Chat ended by other user",
          });
        }

        console.log(`💬 Chat session ${sessionId} ended by user ${userId}`);
      } catch (error) {
        console.error("End chat error:", error);
        socket.emit("chat_error", { message: "Failed to end chat" });
      }
    });

    socket.on("disconnect", async (reason) => {
      const userId = socket.data.userId;
      if (userId) {
        await query(
          `UPDATE user_online_status 
           SET is_online = FALSE, last_seen = NOW(), updated_at = NOW()
           WHERE user_id = $1`,
          [userId]
        );

        await broadcastActiveUsers();

        await endActiveSessionsForUser(userId, "User disconnected");
      }
    });
  });

  return io;
}

async function startSessionTimer(
  sessionId: number,
  user1Id: number,
  user2Id: number
) {
  // Calculate points per second: ₹50 = 50 Points = 5 Minutes (300 seconds)
  // So: 50 points / 300 seconds = 0.1667 points per second
  const pointsPerSecond = parseFloat(
    process.env.WALLET_POINTS_PER_SECOND || "0.1667"
  );

  // Check if timer already exists for this session
  const existingTimer = activeSessionTimers.get(sessionId);
  if (existingTimer) {
    console.log(
      `⚠️ Timer already exists for session ${sessionId}, clearing it`
    );
    clearInterval(existingTimer);
    activeSessionTimers.delete(sessionId);
  }

  console.log(
    `⏱️ Starting points deduction timer for session ${sessionId}: ${pointsPerSecond} points/second`
  );

  const timer = setInterval(async () => {
    try {
      // Verify session is still active before deducting points
      const sessionCheck = await query(
        "SELECT status FROM chat_sessions WHERE id = $1",
        [sessionId]
      );

      if (
        sessionCheck.rows.length === 0 ||
        sessionCheck.rows[0].status !== "active"
      ) {
        // Session is no longer active, stop the timer
        clearInterval(timer);
        activeSessionTimers.delete(sessionId);
        console.log(
          `⏱️ Session ${sessionId} is no longer active, stopping timer`
        );
        return;
      }

      // Deduct points from user1 (initiator) per second
      const result = await query(
        `UPDATE wallet_balance 
         SET points = points - $1, updated_at = NOW()
         WHERE user_id = $2 AND points >= $1
         RETURNING points`,
        [pointsPerSecond, user1Id]
      );

      if (result.rows.length === 0) {
        // Points exhausted
        await endSession(sessionId);
        clearInterval(timer);
        activeSessionTimers.delete(sessionId);

        // Notify users
        if (io) {
          const user1Socket = await getSocketByUserId(user1Id);
          const user2Socket = await getSocketByUserId(user2Id);

          if (user1Socket) user1Socket.emit("points_exhausted");
          if (user2Socket)
            user2Socket.emit("chat_ended", { reason: "Points exhausted" });
        }
        return;
      }

      // Log transaction (batch every 10 seconds to reduce DB writes)
      const now = Date.now();
      if (!(timer as any).lastTransactionTime) {
        (timer as any).lastTransactionTime = now;
      }

      if (now - (timer as any).lastTransactionTime >= 10000) {
        await query(
          `INSERT INTO wallet_transactions (user_id, amount, points, type, description, reference_id)
           VALUES ($1, 0, $2, 'deduction', 'Chat time deduction', $3)`,
          [user1Id, -pointsPerSecond * 10, `session_${sessionId}`]
        );
        (timer as any).lastTransactionTime = now;
      }

      // Update session duration
      await query(
        `UPDATE chat_sessions 
         SET points_consumed = points_consumed + $1, duration_seconds = duration_seconds + 1
         WHERE id = $2`,
        [pointsPerSecond, sessionId]
      );

      // Broadcast updated points to user
      const remainingPoints = parseFloat(result.rows[0].points);
      if (io) {
        const user1Socket = await getSocketByUserId(user1Id);
        if (user1Socket) {
          user1Socket.emit("points_update", { points: remainingPoints });
        }
      }
    } catch (error) {
      console.error("Session timer error:", error);
    }
  }, 1000); // Every 1 second

  activeSessionTimers.set(sessionId, timer);
}

async function endActiveSessionsForUser(userId: number, reason: string) {
  try {
    const sessions = await query<{
      id: number;
      user1_id: number;
      user2_id: number;
    }>(
      `SELECT id, user1_id, user2_id
       FROM chat_sessions
       WHERE status = 'active' AND (user1_id = $1 OR user2_id = $1)`,
      [userId]
    );

    for (const session of sessions.rows) {
      await endSession(session.id);

      if (io) {
        const user1Socket = await getSocketByUserId(session.user1_id);
        if (user1Socket) {
          user1Socket.emit("chat_ended", { reason });
        }

        const user2Socket = await getSocketByUserId(session.user2_id);
        if (user2Socket && session.user2_id !== session.user1_id) {
          user2Socket.emit("chat_ended", { reason });
        }
      }
    }
  } catch (error) {
    console.error("End active sessions for user error:", error);
  }
}

async function endSession(sessionId: number) {
  try {
    // Stop the points deduction timer first
    const timer = activeSessionTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      activeSessionTimers.delete(sessionId);
      console.log(`⏱️ Stopped points deduction timer for session ${sessionId}`);
    }

    // Update session status
    await query(
      `UPDATE chat_sessions 
       SET status = 'ended', ended_at = NOW()
       WHERE id = $1`,
      [sessionId]
    );
  } catch (error) {
    console.error("End session error:", error);
  }
}

async function broadcastActiveUsers() {
  if (!io) return;

  try {
    const sockets = await io.fetchSockets();

    await Promise.all(
      sockets.map(async (socket) => {
        const userId = socket.data.userId;
        if (!userId) return;

        const result = await query<{
          id: number;
          name: string;
          image: string | null;
          is_online: boolean;
          last_seen: Date | null;
          is_ai: boolean;
          last_message_at: Date | null;
        }>(
          `SELECT 
              u.id,
              u.name,
              u.image,
              uos.is_online,
              uos.last_seen,
              CASE WHEN dai.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_ai,
              lm.last_message_at
           FROM users u
           LEFT JOIN user_online_status uos ON u.id = uos.user_id
           LEFT JOIN dummy_ai_users dai ON u.id = dai.user_id
           LEFT JOIN LATERAL (
             SELECT MAX(m.created_at) AS last_message_at
             FROM messages m
             WHERE (m.sender_id = u.id AND m.receiver_id = $1)
                OR (m.sender_id = $1 AND m.receiver_id = u.id)
           ) lm ON TRUE
           WHERE uos.is_online = TRUE AND u.id != $1
           ORDER BY 
             CASE WHEN lm.last_message_at IS NULL THEN 1 ELSE 0 END,
             lm.last_message_at DESC NULLS LAST,
             uos.last_seen DESC NULLS LAST,
             u.name`,
          [userId]
        );

        const users = result.rows.filter((user) => user.id !== userId);

        socket.emit("active_users_update", users);
      })
    );
  } catch (error) {
    console.error("Broadcast active users error:", error);
  }
}

async function getSocketByUserId(userId: number) {
  if (!io) return null;

  const sockets = await io.fetchSockets();
  return sockets.find((s) => s.data.userId === userId) || null;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}
