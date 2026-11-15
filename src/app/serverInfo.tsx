import React, { createContext, useContext, useEffect, useState } from "react";
import { API } from "./config";

export type ServerInfo = {
  status: "checking" | "offline" | "online" | "outdated";
  bundleWarm: boolean | null; // true = pichla bundle cache me hai, render ka setup nahi lagega
  startedAt: number | null;
};

const Ctx = createContext<ServerInfo>({ status: "checking", bundleWarm: null, startedAt: null });
export const useServerInfo = () => useContext(Ctx);

// Har 5 sec me server se poochta hai. "outdated" = server purana code chala raha hai
// (ya to /api/info route hi nahi hai, ya server.mjs file server start ke baad badli hai).
export const ServerInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [info, setInfo] = useState<ServerInfo>({ status: "checking", bundleWarm: null, startedAt: null });

  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        const res = await fetch(`${API}/api/info`);
        if (!alive) return;
        if (res.status === 404) {
          setInfo({ status: "outdated", bundleWarm: null, startedAt: null });
          return;
        }
        const d = (await res.json()) as { stale?: boolean; bundleWarm?: boolean; startedAt?: number };
        setInfo({
          status: d.stale ? "outdated" : "online",
          bundleWarm: typeof d.bundleWarm === "boolean" ? d.bundleWarm : null,
          startedAt: d.startedAt ?? null,
        });
      } catch {
        if (alive) setInfo({ status: "offline", bundleWarm: null, startedAt: null });
      }
    };
    ping();
    const id = window.setInterval(ping, 5000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return <Ctx.Provider value={info}>{children}</Ctx.Provider>;
};
