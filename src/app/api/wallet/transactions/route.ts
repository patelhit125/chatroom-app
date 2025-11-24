import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const beforeParam = searchParams.get('before');

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
          { error: 'Invalid before parameter' },
          { status: 400 }
        );
      }
      beforeDate = parsed;
    }

    const fetchLimit = limit + 1; // fetch one extra to determine if more pages exist
    const params: Array<number | Date> = [parseInt(session.user.id)];

    let cursorClause = '';
    if (beforeDate) {
      params.push(beforeDate);
      cursorClause = ` AND created_at < $${params.length}`;
    }

    params.push(fetchLimit);
    const limitPosition = params.length;

    const result = await query<{
      id: number;
      amount: number;
      points: number;
      type: string;
      description: string;
      created_at: Date;
    }>(
      `SELECT id, amount, points, type, description, created_at
       FROM wallet_transactions
       WHERE user_id = $1${cursorClause}
       ORDER BY created_at DESC
       LIMIT $${limitPosition}`,
      params
    );

    let rows = result.rows;
    let hasMore = false;

    if (rows.length > limit) {
      hasMore = true;
      rows = rows.slice(0, limit);
    }

    return NextResponse.json({ transactions: rows, hasMore });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

