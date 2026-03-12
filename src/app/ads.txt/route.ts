const ADS_TXT_CONTENT =
  "google.com, pub-3027565303141354, DIRECT, f08c47fec0942fa0";

export const dynamic = "force-static";
export const revalidate = 86400;

export function GET() {
  return new Response(`${ADS_TXT_CONTENT}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, must-revalidate",
    },
  });
}
