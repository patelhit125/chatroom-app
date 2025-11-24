import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const currentUserId = parseInt(session.user.id, 10);
    const limit = Math.min(
      Math.max(parseInt(limitParam || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );
    const offset = Math.max(parseInt(offsetParam || '0', 10) || 0, 0);
    const fetchLimit = limit + 1;

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
         u.name
       LIMIT $2 OFFSET $3`,
      [currentUserId, fetchLimit, offset]
    );

    const rows = result.rows;
    const hasMore = rows.length > limit;
    const users = hasMore ? rows.slice(0, limit) : rows;
    const nextOffset = hasMore ? offset + limit : null;

    return NextResponse.json({ users, hasMore, nextOffset });
  } catch (error) {
    console.error('Get active users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active users' },
      { status: 500 }
    );
  }
}

