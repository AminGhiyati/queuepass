import { isApplePassConfigured } from "../../lib/passes/applePassConfiguration.js";
import { isGoogleWalletConfigured } from "../../lib/passes/googleWalletConfiguration.js";
import { publicProcedure } from "../../trpc/procedures.js";

export const getWalletAvailability = publicProcedure.query(() => ({
  applePass: isApplePassConfigured(),
  googleWallet: isGoogleWalletConfigured(),
}));
