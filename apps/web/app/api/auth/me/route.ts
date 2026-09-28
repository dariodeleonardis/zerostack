import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { rootDomain } from "../../../../lib/publications";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, rootDomain: rootDomain() }, { status: 401 });
  }
  return NextResponse.json({ user: { name: user.name, handle: user.handle, role: user.role }, rootDomain: rootDomain() });
}
