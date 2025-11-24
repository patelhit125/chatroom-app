# ChatApp - Production-Ready Real-time Chat Application

A modern, full-stack Next.js 14 chat application with real-time messaging, AI-powered dummy users, and a wallet-based points system.

## 🎯 Features

### Core Features
- ✅ **One-to-One Chat Only** - No rooms or groups, direct user-to-user messaging
- ✅ **Real-time Communication** - WebSocket-powered instant messaging
- ✅ **Active Users List** - See who's online with green dot indicators
- ✅ **AI Dummy Users** - OpenAI-powered chatbots when no real users are available
- ✅ **Wallet System** - Points-based chat time (₹50 = 50 Points = 5 Minutes)
- ✅ **Timed Chat** - Automatic points deduction per minute
- ✅ **Message Confirmation** - Messages appear only after backend acknowledgment
- ✅ **Typing Indicators** - See when someone is typing
- ✅ **Read Receipts** - Delivered and read status for messages
- ✅ **Mobile-First Design** - Fully responsive UI

### Technical Features
- 🎨 Clean, minimal UI with Tailwind CSS and shadcn/ui
- 🚀 Next.js 14 with App Router
- 🔐 NextAuth.js authentication (email/password + Google OAuth ready)
- 🗄️ Pure PostgreSQL with manual migrations (no Prisma)
- 🔌 Socket.io for WebSocket communication
- 🤖 OpenAI GPT-3.5 integration for AI responses
- ⚡ Optimized for low-end devices
- 📱 Smooth Framer Motion animations

## 🏗 Architecture

### WebSocket Flow (Critical Implementation)
```
User types message → Frontend sends via WebSocket
                  ↓
              Backend receives
                  ↓
         Validates session & points
                  ↓
         Inserts to PostgreSQL
                  ↓
    Broadcasts to both users via WebSocket
                  ↓
         Frontend displays message
```

**Important**: Messages are NEVER inserted directly from frontend. All writes go through WebSocket → Backend → Database → Broadcast.

### File Structure
```
chatting-app/
├── db/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── migrate.js
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── wallet/
│   │   │   ├── chat/
│   │   │   └── users/
│   │   ├── auth/
│   │   │   ├── signin/
│   │   │   └── signup/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── chat/         # Chat-specific components
│   │   ├── wallet/       # Wallet components
│   │   ├── layout/       # Layout components
│   │   └── providers/
│   ├── lib/
│   │   ├── db.ts         # PostgreSQL client
│   │   ├── auth.ts       # NextAuth config
│   │   ├── openai.ts     # OpenAI integration
│   │   ├── utils.ts      # Utility functions
│   │   └── websocket/
│   │       ├── server.ts # WebSocket server
│   │       └── client.ts # WebSocket client hook
│   └── types/
│       └── next-auth.d.ts
├── server.js             # Custom server with WebSocket
├── package.json
├── next.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL 12+
- OpenAI API key

### 1. Clone and Install
```bash
cd chatting-app
pnpm install
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb chatting_app

# Or using psql
psql -U postgres
CREATE DATABASE chatting_app;
\q
```

### 3. Environment Configuration
Copy `env.example.txt` to `.env.local` and configure:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/chatting_app

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Generate secret with:
# openssl rand -base64 32

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Wallet Configuration
WALLET_RUPEES_PER_POINT=1
WALLET_POINTS_PER_MINUTE=10
# This means: ₹50 = 50 Points = 5 Minutes

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Migrations
```bash
pnpm run db:migrate
```

This will create all necessary tables:
- `users` - User accounts
- `accounts`, `sessions`, `verification_tokens` - NextAuth tables
- `dummy_ai_users` - AI bot users
- `user_online_status` - Online/offline tracking
- `wallet_balance` - User wallet points
- `wallet_transactions` - Transaction history
- `chat_sessions` - Active chat sessions
- `messages` - Chat messages

### 5. Start Development Server
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## 📖 Usage Guide

### First Run - AI Dummy Users
On first visit, the app automatically creates 10 AI dummy users with different personalities:
- Alex Chen - Tech enthusiast
- Sarah Johnson - Bookworm
- Michael Park - Fitness enthusiast
- Emma Wilson - Traveler
- David Kim - Movie buff
- Lisa Anderson - Artist
- Ryan Martinez - Foodie
- Nina Patel - Philosopher
- James Taylor - Music lover
- Sophia Lee - Gaming enthusiast

### Creating an Account
1. Navigate to `http://localhost:3000`
2. Click "Sign up"
3. Enter name, email, and password
4. You'll be redirected to sign in

### Chatting
1. **Sign in** to your account
2. **Recharge Wallet** - Click "Recharge" button in the wallet card
   - Enter amount (₹50 minimum recommended)
   - ₹50 gives you 50 points = 5 minutes of chat time
3. **Select Active User** - Click any online user from the left sidebar
4. **Start Chatting** - Type and send messages
5. **Monitor Points** - Watch your points decrease every minute
6. **Points Exhausted** - Chat will auto-disconnect when points reach 0

### Wallet System
- **Conversion Rate**: ₹1 = 1 Point = 0.1 Minutes (6 seconds)
- **Deduction**: 10 points per minute (configurable via env)
- **Real-time Updates**: Points update live every minute
- **Auto-disconnect**: Chat ends when points reach zero

## 🔧 Configuration

### Wallet Settings
Modify in `.env.local`:

```bash
# Example: ₹100 = 50 Points = 10 Minutes
WALLET_RUPEES_PER_POINT=2
WALLET_POINTS_PER_MINUTE=5

# Example: ₹10 = 100 Points = 10 Minutes
WALLET_RUPEES_PER_POINT=0.1
WALLET_POINTS_PER_MINUTE=10
```

### OpenAI Settings
Change model or temperature in `src/lib/openai.ts`:

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo', // or 'gpt-4'
  temperature: 0.9, // Higher = more creative
  max_tokens: 150,
});
```

## 🎨 UI Components

All UI components are built with shadcn/ui and fully customizable:
- `Button` - Multiple variants (default, outline, ghost)
- `Input` - Form inputs with validation
- `Avatar` - User profile images
- `Dialog` - Modals and popups
- `Toast` - Notifications
- `ScrollArea` - Custom scrollbars

## 🐛 Troubleshooting

### WebSocket Connection Issues
If WebSocket doesn't connect:
1. Ensure custom server is running (`server.js`)
2. Check browser console for errors
3. Verify `NEXT_PUBLIC_APP_URL` matches your dev URL

### Database Connection Errors
```bash
# Test PostgreSQL connection
psql -U postgres -d chatting_app -c "SELECT 1"

# Check DATABASE_URL format
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

### AI Responses Not Working
1. Verify `OPENAI_API_KEY` is set correctly
2. Check OpenAI API quota and billing
3. AI users fallback to generic responses if API fails

## 📦 Production Deployment

### Build for Production
```bash
pnpm build
pnpm start
```

### Environment Variables
Ensure all production values are set:
- `DATABASE_URL` - Production PostgreSQL URL
- `NEXTAUTH_URL` - Production domain
- `NEXTAUTH_SECRET` - Strong secret key
- `OPENAI_API_KEY` - Production API key

### Recommended Hosting
- **App**: Vercel, Railway, or DigitalOcean
- **Database**: Supabase, Neon, or managed PostgreSQL
- **WebSocket**: Ensure hosting supports WebSocket connections

## 🔒 Security Notes

- All API routes are protected with NextAuth sessions
- Database queries use parameterized statements (SQL injection safe)
- Passwords hashed with bcryptjs
- WebSocket authentication required before any operations
- Input validation with Zod schemas

## 📊 Performance

- Optimized bundle size with tree-shaking
- Lazy-loaded components where appropriate
- Efficient WebSocket event handling
- Database indexes on frequently queried columns
- Minimal re-renders with proper React patterns

## 🤝 Contributing

This is a production-ready template. Feel free to:
- Add group chat functionality
- Implement file/image sharing
- Add voice/video calling
- Create admin dashboard
- Add more payment gateways

## 📝 License

MIT License - Free to use for personal and commercial projects.

## 🙏 Acknowledgments

Built with:
- Next.js 15
- React 18
- Socket.io
- OpenAI GPT-3.5
- PostgreSQL
- Tailwind CSS
- shadcn/ui
- Framer Motion

---

**Built with ❤️ for production use**

For issues or questions, please check the troubleshooting section or create an issue.
