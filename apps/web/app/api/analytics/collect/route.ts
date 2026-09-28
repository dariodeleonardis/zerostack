import { NextResponse } from "next/server";
import { generateDailyVisitorHash, parseDeviceType } from "../../../../lib/analytics";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // Il corpo arriva dal browser: campi non stringa facevano esplodere .slice() con un 500.
    const str = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
    const path = str(body?.path, "/").slice(0, 512);
    const referrer = str(body?.referrer, "");
    const publicationSlug = str(body?.publicationSlug, "default").slice(0, 253);

    // Recupera IP anonimizzato e user agent dagli header HTTP
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Genera hash effimero a 24 ore
    const visitorHash = generateDailyVisitorHash(ip, userAgent, publicationSlug);
    const deviceType = parseDeviceType(userAgent);

    const event = {
      path,
      referrer: referrer.slice(0, 255),
      publicationSlug,
      visitorHash,
      deviceType,
      timestamp: new Date().toISOString()
    };

    // In produzione: inserimento aggregato su PostgreSQL / Prisma
    // es: await prisma.analyticsEvent.create({ data: event });

    return NextResponse.json({ success: true, recorded: true, visitorHash });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Analytics collection error" }, { status: 500 });
  }
}
