import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { authErrorResponse, getSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim().toLowerCase()))
      .limit(1);

    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.role = user.role as "admin" | "chair";
    session.conferenceId = user.conferenceId;
    session.committeeId = user.committeeId ?? null;
    session.displayName = user.displayName;
    await session.save();

    return Response.json({
      userId: user.id,
      username: user.username,
      role: user.role,
      committeeId: user.committeeId ?? null,
      displayName: user.displayName,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
