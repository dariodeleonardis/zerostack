import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";

export const dynamic = "force-dynamic";

/** Per l'healthcheck del container: il sito risponde e vede il database. Worker e backup non c'entrano. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "fail" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
