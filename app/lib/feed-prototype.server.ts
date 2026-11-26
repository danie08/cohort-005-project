import { sign } from "node:crypto";

export type PrototypeItem = {
  id: string;
  title: string;
  detail: string;
  href: string | null;
  time: string;
  read: boolean;
  seen: boolean;
};
type KnockEntry = {
  id: string;
  data?: { title?: string; href?: string };
  blocks: { content?: string }[];
  inserted_at: string;
  read_at?: string;
  seen_at?: string;
};

// Read-only. Sign for the DevUI session user; never send signing material to the browser.
export async function loadPrototypeFeed(userId: number | null) {
  const items: PrototypeItem[] = [];
  if (!userId) return { items, status: "Select a DevUI user for live data." };
  const { KNOCK_PUBLIC_API_KEY: key, KNOCK_SIGNING_KEY: signingKey, KNOCK_FEED_CHANNEL_ID: channel } = process.env;
  if (!key || !signingKey || !channel) return { items, status: "Live feed needs development keys and a channel ID." };
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  try {
    const now = Math.floor(Date.now() / 1000);
    const claims = encode({ alg: "RS256", typ: "JWT" }) + "." + encode({ sub: String(userId), iat: now, exp: now + 60 });
    const signature = sign("RSA-SHA256", Buffer.from(claims), Buffer.from(signingKey, "base64")).toString("base64url");
    const result = await fetch("https://api.knock.app/v1/users/" + userId + "/feeds/" + encodeURIComponent(channel), {
      headers: { Authorization: "Bearer " + key, "X-Knock-User-Token": claims + "." + signature },
      signal: AbortSignal.timeout(4000),
    });
    if (!result.ok) return { items, status: "Live feed returned HTTP " + result.status + "." };
    const feed = await result.json() as { entries: KnockEntry[] };
    for (const entry of feed.entries) {
      const href = entry.data?.href;
      items.push({
        id: entry.id, title: entry.data?.title ?? "Notification",
        detail: entry.blocks.map(block => block.content).filter(Boolean).join(" "),
        href: typeof href === "string" && /^\/(courses|team|settings|admin|instructor)(\/|\?|$)/.test(href) ? href : null,
        time: new Date(entry.inserted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        read: !!entry.read_at, seen: !!entry.seen_at,
      });
    }
    return { items, status: "Knock Development" };
  } catch {
    return { items, status: "Live feed unavailable." };
  }
}
