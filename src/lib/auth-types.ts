// Shared auth types — safe to import in both server and client code.

export interface SessionData {
  userId: string;
  username: string;
  role: "admin" | "chair";
  conferenceId: string;
  committeeId: string | null;
  displayName: string;
}
