import "dotenv/config";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const personalities = [
  "Enthusiastic tech enthusiast who loves discussing gadgets and programming",
  "Friendly bookworm who enjoys literature and creative writing",
  "Cheerful fitness enthusiast who loves sports and healthy living",
  "Curious traveler who enjoys sharing stories about different places",
  "Witty movie buff who can discuss films for hours",
  "Creative artist who loves talking about art and design",
  "Passionate foodie who enjoys discussing recipes and cuisines",
  "Philosophical thinker who enjoys deep conversations",
  "Music lover who can talk about various genres and artists",
  "Gaming enthusiast who enjoys discussing video games and strategies",
];

const dummyUsers = [
  { name: "Alex Chen", email: "alex@ai.chat" },
  { name: "Sarah Johnson", email: "sarah@ai.chat" },
  { name: "Michael Park", email: "michael@ai.chat" },
  { name: "Emma Wilson", email: "emma@ai.chat" },
  { name: "David Kim", email: "david@ai.chat" },
  { name: "Lisa Anderson", email: "lisa@ai.chat" },
  { name: "Ryan Martinez", email: "ryan@ai.chat" },
  { name: "Nina Patel", email: "nina@ai.chat" },
  { name: "James Taylor", email: "james@ai.chat" },
  { name: "Sophia Lee", email: "sophia@ai.chat" },
];

async function seedAIUsers() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not defined in .env.local");
    console.error("Please create a .env.local file with DATABASE_URL");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("🌱 Starting AI users seed...");

    // Check if AI users already exist
    const existingAI = await pool.query(
      "SELECT COUNT(*) as count FROM dummy_ai_users"
    );
    const count = parseInt(existingAI.rows[0].count);

    if (count > 0) {
      console.log(`⚠️  ${count} AI users already exist. Skipping seed.`);
      console.log("To re-seed, first run: DELETE FROM dummy_ai_users;");
      await pool.end();
      return;
    }

    console.log("Creating 10 AI users...");

    const passwordHash = await bcrypt.hash("dummy123", 10);

    for (let i = 0; i < dummyUsers.length; i++) {
      const user = dummyUsers[i];
      const personality = personalities[i];

      // Check if user email already exists
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [user.email]
      );

      let userId;

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        console.log(`  ↺ User ${user.name} already exists (ID: ${userId})`);
      } else {
        // Create user
        const userResult = await pool.query(
          "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id",
          [user.email, user.name, passwordHash]
        );
        userId = userResult.rows[0].id;
        console.log(`  ✓ Created user: ${user.name} (ID: ${userId})`);
      }

      // Create dummy AI user entry
      const aiExists = await pool.query(
        "SELECT user_id FROM dummy_ai_users WHERE user_id = $1",
        [userId]
      );

      if (aiExists.rows.length === 0) {
        await pool.query(
          "INSERT INTO dummy_ai_users (user_id, personality) VALUES ($1, $2)",
          [userId, personality]
        );
        console.log(`    → Added AI personality`);
      }

      // Create wallet with unlimited points
      const walletExists = await pool.query(
        "SELECT user_id FROM wallet_balance WHERE user_id = $1",
        [userId]
      );

      if (walletExists.rows.length === 0) {
        await pool.query(
          "INSERT INTO wallet_balance (user_id, points) VALUES ($1, 1000000)",
          [userId]
        );
        console.log(`    → Created wallet (1,000,000 points)`);
      }

      // Mark as online
      await pool.query(
        `INSERT INTO user_online_status (user_id, is_online, updated_at)
         VALUES ($1, TRUE, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET is_online = TRUE, updated_at = NOW()`,
        [userId]
      );
      console.log(`    → Set online status\n`);
    }

    console.log("✨ AI users seed completed successfully!");
    console.log(`\n📊 Summary:`);
    console.log(`   • 10 AI users ready`);
    console.log(`   • All users are online`);
    console.log(`   • Each has 1,000,000 points`);
    console.log(`   • Ready to chat!\n`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAIUsers();
