import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");
    const otherUserId = searchParams.get("userId");
    const limitParam = searchParams.get("limit");
    const beforeParam = searchParams.get("before");

    if (!sessionId && !otherUserId) {
      return NextResponse.json(
        { error: "sessionId or userId required" },
        { status: 400 }
      );
    }

    const currentUserId = parseInt(session.user.id, 10);
    const limit = Math.min(
      Math.max(
        parseInt(limitParam || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT,
        1
      ),
      MAX_LIMIT
    );

    let beforeDate: Date | null = null;
    if (beforeParam) {
      const parsed = new Date(beforeParam);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid before parameter" },
          { status: 400 }
        );
      }
      beforeDate = parsed;
    }

    const fetchLimit = limit + 1; // fetch one extra to determine if more pages exist
    const params: Array<number | Date> = [];
    let whereClause = "";

    if (sessionId) {
      const sessionIdNumber = parseInt(sessionId, 10);
      if (isNaN(sessionIdNumber)) {
        return NextResponse.json(
          { error: "Invalid sessionId" },
          { status: 400 }
        );
      }
      params.push(sessionIdNumber);
      whereClause = "m.session_id = $1";
    } else if (otherUserId) {
      const otherId = parseInt(otherUserId, 10);
      if (isNaN(otherId)) {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
      params.push(currentUserId, otherId);
      whereClause = `(m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)`;
    }

    let cursorClause = "";
    if (beforeDate) {
      params.push(beforeDate);
      cursorClause = ` AND m.created_at < $${params.length}`;
    }

    params.push(fetchLimit);
    const limitPosition = params.length;

    const result = await query(
      `SELECT m.*, u.name as sender_name, u.image as sender_image
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE ${whereClause}${cursorClause}
         ORDER BY m.created_at DESC
         LIMIT $${limitPosition}`,
      params
    );

    let rows = result.rows;
    let hasMore = false;

    if (rows.length > limit) {
      hasMore = true;
      rows = rows.slice(0, limit);
    }

    const messages = rows.reverse();

    return NextResponse.json({ messages, hasMore });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
