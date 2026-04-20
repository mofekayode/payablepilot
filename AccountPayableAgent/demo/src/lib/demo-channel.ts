"use client";

export type DemoMessage =
  | { type: "invoice_sent"; invoiceId: string; emailId: string; at: number }
  | { type: "reset"; at: number };

const CHANNEL_NAME = "payablepilot-demo";
const LS_KEY = "payablepilot:demo-bus";

type Listener = (msg: DemoMessage) => void;

export function subscribeDemo(listener: Listener): () => void {
  if (typeof window === "undefined") return () => {};

  const unsubs: Array<() => void> = [];

  // BroadcastChannel — same-origin cross-tab communication.
  if ("BroadcastChannel" in window) {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    const onMessage = (ev: MessageEvent<DemoMessage>) => listener(ev.data);
    bc.addEventListener("message", onMessage);
    unsubs.push(() => {
      bc.removeEventListener("message", onMessage);
      bc.close();
    });
  }

  // localStorage fallback — fires the storage event in other tabs.
  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== LS_KEY || !ev.newValue) return;
    try {
      const msg = JSON.parse(ev.newValue) as DemoMessage;
      listener(msg);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("storage", onStorage);
  unsubs.push(() => window.removeEventListener("storage", onStorage));

  return () => unsubs.forEach((u) => u());
}

export function publishDemo(msg: DemoMessage) {
  if (typeof window === "undefined") return;
  const payload: DemoMessage = { ...msg, at: Date.now() };

  if ("BroadcastChannel" in window) {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage(payload);
    bc.close();
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    // clear it quickly so repeated sends of the same payload still fire the storage event
    setTimeout(() => localStorage.removeItem(LS_KEY), 50);
  } catch {
    /* ignore */
  }
}
