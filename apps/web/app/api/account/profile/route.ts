import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { ProfileSchema } from "@zerostack/shared";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";

export async function PATCH(req: Request) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi prima" }, { status: 401 });
  const parsed = ProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const { name, bio, avatarUrl } = parsed.data;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name, bio: bio || null, ...(avatarUrl !== undefined ? { avatarUrl } : {}) },
    select: { name: true, bio: true, avatarUrl: true }
  });
  return NextResponse.json({ user: updated });
}
