import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const siteUrl = process.env.APP_URL || "https://zerostack.it";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Tech &amp; Futuro Italia Podcast</title>
    <link>${siteUrl}/p/${slug}</link>
    <language>it</language>
    <itunes:author>Dario De Leonardis</itunes:author>
    <itunes:summary>L'osservatorio indipendente su IA, creator economy e innovazione tecnologica in Italia.</itunes:summary>
    <description>Conversazioni con creator, tecnici ed esperti del settore digitale.</description>
    <itunes:owner>
      <itunes:name>Dario De Leonardis</itunes:name>
      <itunes:email>dario@zerostack.it</itunes:email>
    </itunes:owner>
    <itunes:explicit>no</itunes:explicit>
    <itunes:category text="Technology"/>
    
    <item>
      <title>Ep. 01: L'evoluzione dell'AI applicata allo sviluppo web e il self-hosting</title>
      <itunes:episode>1</itunes:episode>
      <itunes:season>1</itunes:season>
      <description>Conversazione approfondita sui limiti delle piattaforme chiuse e la nascita di ZeroStack.</description>
      <enclosure url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" length="5938472" type="audio/mpeg"/>
      <guid>${siteUrl}/podcasts/ep-1</guid>
      <pubDate>Thu, 25 Sep 2026 08:00:00 GMT</pubDate>
      <itunes:duration>372</itunes:duration>
      <itunes:explicit>no</itunes:explicit>
    </item>
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate"
    }
  });
}
