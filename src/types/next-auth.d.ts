import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
    };
  }

  interface User {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string;
    tenantName?: string;
    tenantSlug?: string;
  }
}
