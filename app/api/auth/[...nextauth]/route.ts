import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
        },
      },
    }),
  ],
  callbacks: {
    // Yahan humne ': any' laga diya taaki TypeScript pareshaan na kare
    async signIn({ user, account }: any) { 
      
      // Agar kisi wajah se user ki email nahi aayi, toh error se bachne ke liye pehle hi rok do
      if (!user.email) return false;

      if (account?.provider === "google") {
        try {
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name,
              accessToken: account.access_token,
              ...(account.refresh_token && { refreshToken: account.refresh_token }),
            },
            create: {
              email: user.email,
              name: user.name,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
            },
          });
          return true; 
        } catch (error) {
          console.error("Database me user save karte waqt error:", error);
          return false; 
        }
      }
      return true;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };