import React, { useEffect, useState } from "react";
import { Sparkles, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import FactHub from "./pages/FactHub";
import Home from "./pages/Home";
import EditStudio from "./pages/EditStudio";
import { ServerInfoProvider, useServerInfo } from "./serverInfo";

// Site ka naam yahan se badlo
export const SITE_NAME = "Automake Studio";

type Route = "/" | "/fact" | "/edit";

const parseRoute = (): Route => {
  const h = window.location.hash.replace(/^#/, "");
  return h === "/fact" || h === "/edit" ? h : "/";
};

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseRoute());
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

// Kisi bhi page me kuch fate to poora app white-screen na ho, sirf ye card dikhe.
// "Reset this page" sirf usi page ko naya bana deta hai (baaki studio ka data safe rehta hai).
class AppBoundary extends React.Component<
  { children: React.ReactNode; label: string },
  { error: string | null; resetKey: number }
> {
  state = { error: null as string | null, resetKey: 0 };
  static getDerivedStateFromError(e: any) {
    return { error: String(e?.message || e) };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="max-w-xl mx-auto mt-24 glass rounded-2xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <div className="font-display text-xl font-bold mb-2">Something went wrong in {this.props.label}</div>
          <div className="text-xs text-red-300 bg-red-950/30 rounded-lg p-3 mb-5 break-words">{this.state.error}</div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }))}
              className="px-4 py-2.5 rounded-lg font-bold text-sm bg-white text-black"
            >
              Reset this page
            </button>
            <a href="#/" className="px-4 py-2.5 rounded-lg font-bold text-sm glass hover:bg-white/10">
              Go to Home
            </a>
          </div>
        </div>
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

const NAV: { to: Route; label: string }[] = [
  { to: "/", label: "Home" },
  { to: "/fact", label: "Fact Studio" },
  { to: "/edit", label: "Edit Studio" },
];

function ShellInner() {
  const route = useRoute();
  const info = useServerInfo();

  // Jo studio ek baar khul gaya wo mounted rehta hai (sirf chhupa hota hai),
  // isliye page badalne pe data, images, music aur chalta hua render sab safe rehta hai.
  const [visited, setVisited] = useState({ fact: false, edit: false });
  useEffect(() => {
    if (route === "/fact") setVisited((v) => (v.fact ? v : { ...v, fact: true }));
    if (route === "/edit") setVisited((v) => (v.edit ? v : { ...v, edit: true }));
  }, [route]);
  const showFact = visited.fact || route === "/fact";
  const showEdit = visited.edit || route === "/edit";

  const online = info.status === "online" || info.status === "outdated";

  return (
    <div className="min-h-screen bg-aurora text-white">
      <header className="sticky top-0 z-40 h-14 glass border-x-0 border-t-0 flex items-center justify-between px-4 md:px-8">
        <a href="#/" className="flex items-center gap-2 font-display font-bold text-lg tracking-tight">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#39FF14] to-[#22d3ee] text-black">
            <Sparkles className="w-4 h-4" />
          </span>
          {SITE_NAME}
        </a>

        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <a
              key={n.to}
              href={`#${n.to}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                route === n.to
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div
          title={
            info.status === "online"
              ? "Render server connected"
              : info.status === "outdated"
                ? "Server is running old code. Close its window and run: npm run server"
                : "Render server offline. In the terminal run: npm run server"
          }
          className={`hidden sm:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${
            info.status === "checking"
              ? "border-gray-700 text-gray-500"
              : info.status === "online"
                ? "border-[#39FF14]/40 text-[#39FF14] bg-[#39FF14]/10"
                : info.status === "outdated"
                  ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                  : "border-red-500/40 text-red-400 bg-red-500/10"
          }`}
        >
          {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {info.status === "checking"
            ? "Checking..."
            : info.status === "online"
              ? "Server online"
              : info.status === "outdated"
                ? "Server needs restart"
                : "Server offline"}
        </div>
      </header>

      {info.status === "outdated" && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs text-center px-4 py-2">
          The render server is running old code. Close the server window and run{" "}
          <code className="font-bold">npm run server</code> again, otherwise new features (like render time)
          will not work.
        </div>
      )}

      <main>
        {route === "/" && (
          <AppBoundary label="Home">
            <Home siteName={SITE_NAME} serverOnline={online} />
          </AppBoundary>
        )}

        {showFact && (
          <div style={{ display: route === "/fact" ? "block" : "none" }}>
            <AppBoundary label="Fact Studio">
              <FactHub active={route === "/fact"} />
            </AppBoundary>
          </div>
        )}

        {showEdit && (
          <div style={{ display: route === "/edit" ? "block" : "none" }}>
            <AppBoundary label="Edit Studio">
              <EditStudio active={route === "/edit"} />
            </AppBoundary>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Shell() {
  return (
    <ServerInfoProvider>
      <ShellInner />
    </ServerInfoProvider>
  );
}
