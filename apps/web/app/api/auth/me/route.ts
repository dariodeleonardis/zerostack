import { NextResponse } from "next/server";
import { getCurrentUser, isPlatformAdmin } from "../../../../lib/auth";
import { getCourtesy } from "../../../../lib/courtesy";
import { rootDomain } from "../../../../lib/publications";
import { unreadCount } from "../../../../lib/inbox";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, rootDomain: rootDomain() }, { status: 401 });
  }
  // Agli amministratori si dice se il sito è chiuso ai visitatori: la barra lo mostra, così non lo si dimentica.
  const courtesy = isPlatformAdmin(user) ? (await getCourtesy().catch(() => null))?.enabled ?? false : undefined;
  // Articoli da leggere nella Posta: il numero accanto alla voce della barra.
  const unread = await unreadCount(user).catch(() => 0);
  return NextResponse.json({ user: { name: user.name, handle: user.handle, role: user.role }, rootDomain: rootDomain(), courtesy, unread });
}
