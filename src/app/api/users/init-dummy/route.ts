import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generatePersonality } from '@/lib/openai';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    // Check if any users exist
    const userCount = await query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    const count = parseInt(userCount.rows[0].count);

    if (count > 0) {
      return NextResponse.json({
        message: 'Users already exist',
        count,
      });
    }

    // Generate 10 AI dummy users
    const dummyUsers = [
      { name: 'Alex Chen', email: 'alex@ai.chat' },
      { name: 'Sarah Johnson', email: 'sarah@ai.chat' },
      { name: 'Michael Park', email: 'michael@ai.chat' },
      { name: 'Emma Wilson', email: 'emma@ai.chat' },
      { name: 'David Kim', email: 'david@ai.chat' },
      { name: 'Lisa Anderson', email: 'lisa@ai.chat' },
      { name: 'Ryan Martinez', email: 'ryan@ai.chat' },
      { name: 'Nina Patel', email: 'nina@ai.chat' },
      { name: 'James Taylor', email: 'james@ai.chat' },
      { name: 'Sophia Lee', email: 'sophia@ai.chat' },
    ];

    const createdUsers = [];

    for (const user of dummyUsers) {
      // Create user
      const passwordHash = await bcrypt.hash('dummy123', 10);
      const userResult = await query<{ id: number }>(
        `INSERT INTO users (email, name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.email, user.name, passwordHash]
      );

      const userId = userResult.rows[0].id;

      // Create dummy AI user entry
      const personality = generatePersonality();
      await query(
        `INSERT INTO dummy_ai_users (user_id, personality)
         VALUES ($1, $2)`,
        [userId, personality]
      );

      // Create wallet
      await query(
        `INSERT INTO wallet_balance (user_id, points)
         VALUES ($1, 1000000)`, // Give AI users unlimited points
        [userId]
      );

      // Mark as online
      await query(
        `INSERT INTO user_online_status (user_id, is_online)
         VALUES ($1, TRUE)`,
        [userId]
      );

      createdUsers.push({ id: userId, ...user, personality });
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdUsers.length} AI dummy users`,
      users: createdUsers,
    });
  } catch (error) {
    console.error('Init dummy users error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize dummy users' },
      { status: 500 }
    );
  }
}

