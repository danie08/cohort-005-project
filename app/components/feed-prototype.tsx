// Compare a popover, a drawer and an inline feed on the existing course pages.
import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { Bell, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PrototypeItem } from "~/lib/feed-prototype.server";

const variants = ["Bell popover", "Side drawer", "Inline feed"];
function examples(role?: string, team?: boolean): PrototypeItem[] {
  const rows = role === "admin" ? [
    ["Refund needs review", "A buyer requested a refund for Introduction to TypeScript.", "/admin/refunds"],
    ["Refund payment failed", "A buyer’s approved refund needs follow-up.", "/admin/refunds"],
  ] : role === "instructor" ? [
    ["New lesson question", "A Student asked about the first TypeScript lesson.", "/instructor/questions"],
    ["Another lesson question", "A Student has a question about type annotations.", "/instructor/questions"],
  ] : [
    ["Someone replied to your question", "Introduction to TypeScript · Open the lesson discussion.", "/courses/introduction-to-typescript/lessons/1"],
    ["Refund Request received", "You can check your request in Settings.", "/settings"],
    ["Purchase confirmed", "Introduction to TypeScript is ready to take.", "/courses/introduction-to-typescript"],
  ];
  if (team) rows.unshift(["A Seat was claimed", "Introduction to TypeScript · 3 Seats remain.", "/team"]);
  return rows.map(([title, detail, href], i) => ({ id: "example-" + i, title, detail, href, time: ["8 min ago", "2 hours ago", "Yesterday", "Yesterday"][i], seen: i > 1, read: i > 1 }));
}

export function FeedPrototype({ feed, role, team, children }: {
  feed: { items: PrototypeItem[]; status: string }; role?: string; team: boolean; children: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const variant = Math.max(0, ["A","B","C"].indexOf(params.get("variant") ?? "A"));
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [read, setRead] = useState<Set<string>>(new Set());
  const items = live ? feed.items : examples(role, team);
  const unread = items.filter(i => !i.read && !read.has(i.id)).length;
  const unseen = items.filter(i => !i.seen && !seen.has(i.id)).length;
  function show() {
    setOpen(true);
    setSeen(prev => new Set([...prev, ...items.map(i => i.id)]));
  }
  function cycle(delta: number) {
    const next = new URLSearchParams(params);
    next.set("variant", ["A","B","C"][(variant + delta + 3) % 3]);
    setParams(next, { replace: true, preventScrollReset: true });
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const panel = open && <section aria-label="Notification Feed" className={
    "border border-border bg-background shadow-lg " + [
      "absolute right-3 top-14 z-40 max-h-[65vh] w-96 max-w-[94vw] overflow-auto rounded-xl",
      "fixed inset-y-0 right-0 z-40 w-[28rem] max-w-full overflow-auto pb-28",
      "mx-auto my-4 max-w-4xl rounded-xl",
    ][variant]}>
    <header className="flex items-center justify-between border-b p-4">
      <h2 className="font-semibold">Notification Feed <span className="text-sm text-muted-foreground">· {unread} unread</span></h2>
      <button aria-label="Close feed" onClick={() => setOpen(false)}><X size={18}/></button>
    </header>
    {items.length === 0 && <p className="p-5">{feed.status === "Knock Development" ? "You’re all caught up." : feed.status}</p>}
    {items.map(item => {
      const isRead = item.read || read.has(item.id);
      const content = <><span className="block text-xs text-muted-foreground">{isRead ? "Read" : "● Unread"} · {item.time}</span><strong className="block">{item.title}</strong><span className="text-sm text-muted-foreground">{item.detail}</span></>;
      function select() {
        setRead(prev => new Set([...prev, item.id]));
        if (item.href) setOpen(false);
      }
      const style = "block w-full border-b p-4 text-left hover:bg-muted";
      if (!item.href) return <button key={item.id} className={style} onClick={select}>{content}</button>;
      const destination = new URL(item.href, "http://prototype.local");
      destination.searchParams.set("variant", ["A","B","C"][variant]);
      return <Link key={item.id} className={style} to={destination.pathname + destination.search + destination.hash} onClick={select}>{content}</Link>;
    })}
  </section>;
  return <>
    <div className="relative flex justify-end border-b px-5 py-3">
      <button className="flex items-center gap-2 rounded-md border px-3 py-1" aria-expanded={open} aria-label={'Notification Feed, '+unread+' unread'} onClick={() => open ? setOpen(false) : show()}>
        <Bell size={18}/>{variant !== 0 && "Notification Feed"}{unread > 0 && <b>{unread}</b>}
      </button>
      {variant === 0 && panel}
    </div>
    {variant !== 0 && panel}
    {children}
    <div className="fixed bottom-4 left-1/2 z-50 max-w-[94vw] -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-xl">
      <div className="flex items-center justify-center gap-2">
        <button aria-label="Previous layout" onClick={() => cycle(-1)}><ChevronLeft size={18}/></button>
        <strong>{["A","B","C"][variant]} · {variants[variant]}</strong>
        <button aria-label="Next layout" onClick={() => cycle(1)}><ChevronRight size={18}/></button>
        <select aria-label="Prototype data" className="rounded bg-slate-800 p-1" value={live ? "live":"examples"} onChange={e => { setLive(e.target.value === "live"); setOpen(false); }}>
          <option value="examples">Examples</option><option value="live">Live Knock</option>
        </select>
      </div>
      <small aria-live="polite">{unread} unread · {unseen} unseen · {live ? feed.status : "Catalogue examples"}</small>
    </div>
  </>;
}
