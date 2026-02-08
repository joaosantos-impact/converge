"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});

// Export commonly used functions for convenience
export const {
  signIn,
  signUp,
  signOut,
  updateUser,
  useSession,
  getSession,
  twoFactor,
} = authClient;
