import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { query } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const result = await query<{
          id: number;
          email: string;
          name: string;
          password_hash: string | null;
          image: string | null;
        }>(
          'SELECT * FROM users WHERE email = $1',
          [credentials.email]
        );

        const user = result.rows[0];

        if (!user || !user.password_hash) {
          throw new Error('Invalid credentials');
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isValidPassword) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          image: user.image || undefined,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Check if user exists, if not create
        const existingUser = await query<{ id: number }>(
          'SELECT * FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length === 0) {
          const newUser = await query<{ id: number }>(
            'INSERT INTO users (email, name, image, email_verified) VALUES ($1, $2, $3, NOW()) RETURNING *',
            [user.email, user.name, user.image]
          );
          
          // Create wallet for new user
          await query(
            'INSERT INTO wallet_balance (user_id, points) VALUES ($1, 0)',
            [newUser.rows[0].id]
          );
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

