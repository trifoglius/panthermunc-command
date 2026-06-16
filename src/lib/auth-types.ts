// Shared auth types — safe to import in both server and client code.

import type { Permission, UserRole } from "./permissions";

export interface SessionData {
  userId: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  conferenceId: string;
  committeeId: string | null;
  displayName: string;
}
