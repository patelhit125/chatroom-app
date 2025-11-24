import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const otherUserId = searchParams.get('userId');

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'userId required' },
        { status: 400 }
      );
    }

    const currentUserId = parseInt(session.user.id);
    const targetUserId = parseInt(otherUserId);

    // Get active session between users
    // Only return session if current user is the initiator (user1_id)
    // This ensures only the initiator has an active session and timer running
    const result = await query<{
      id: number;
      user1_id: number;
      user2_id: number;
      started_at: Date;
      ended_at: Date | null;
      points_consumed: number;
      duration_seconds: number;
      status: string;
    }>(
      `SELECT * FROM chat_sessions
       WHERE user1_id = $1 AND user2_id = $2
         AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1`,
      [currentUserId, targetUserId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({ session: result.rows[0] });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

