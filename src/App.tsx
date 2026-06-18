import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Settings, 
  Database, 
  Code, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from "lucide-react";
import VisualDashboard from "./components/VisualDashboard";
import CrawlerSetup from "./components/CrawlerSetup";
import SqlConsole from "./components/SqlConsole";
import PythonGenerator from "./components/PythonGenerator";
import AiAssistant from "./components/AiAssistant";
import { ScraperTask, ScraperRun, ExtractedItem } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "pipelines" | "sql" | "sandbox" | "python">("dashboard");
  const [scrapers, setScrapers] = useState<ScraperTask[]>([]);
  const [runs, setRuns] = useState<ScraperRun[]>([]);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successBanner, setSuccessBanner] = useState("");

  // Load database state from full-stack api
  const refreshAllState = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    setErrorText("");
    try {
      const [scrapersRes, runsRes, itemsRes] = await Promise.all([
        fetch("/api/scrapers"),
        fetch("/api/runs"),
        fetch("/api/items")
      ]);

      if (scrapersRes.ok && runsRes.ok && itemsRes.ok) {
        const sData = await scrapersRes.json();
        const rData = await runsRes.json();
        const iData = await itemsRes.json();
        setScrapers(sData);
        setRuns(rData);
        setItems(iData);
      } else {
        throw new Error("HTTP error retrieving scraping records");
      }
    } catch (err: any) {
      setErrorText("Full-stack service loading... Please wait or refresh standard container connection.");
      console.error("Error refreshing dashboard state:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAllState();
    
    // Auto sync state once every 30 seconds silently
    const timer = setInterval(() => {
      refreshAllState(true);
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Action: Add new Scraper Pipeline Task
  const handleAddScraper = async (payload: Omit<ScraperTask, "id" | "createdAt" | "targetCount">) => {
    setErrorText("");
    try {
      const response = await fetch("/api/scrapers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setSuccessBanner("Scraper pipeline successfully configured and loaded!");
        setTimeout(() => setSuccessBanner(""), 4000);
        await refreshAllState();
      } else {
        const errObj = await response.json();
        throw new Error(errObj.error || "Failed to create scraper task");
      }
    } catch (err: any) {
      setErrorText(err.message || "Endpoint connection failed");
    }
  };

  // Action: Delete Scraper Pipeline
  const handleDeleteScraper = async (id: string) => {
    setErrorText("");
    try {
      const response = await fetch(`/api/scrapers/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await refreshAllState();
      } else {
        throw new Error("Failed to delete scraper configuration");
      }
    } catch (err: any) {
      setErrorText(err.message || "Deletion api request failed");
    }
  };

  // Action: Run Scraper Immediately
  const handleTriggerScrape = async (id: string) => {
    setIsScraping(true);
    setErrorText("");
    try {
      const response = await fetch(`/api/scrapers/${id}/run`, {
        method: "POST"
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccessBanner(`Successfully completed ETL! Extracted ${data.items?.length || 0} items in ${data.run?.durationMs || 0}ms.`);
        setTimeout(() => setSuccessBanner(""), 4500);
        await refreshAllState();
      } else {
        throw new Error(data.error || "Execution failed on target wrapper query");
      }
    } catch (err: any) {
      setErrorText(err.message || "Failed to contact scraper execution worker");
    } finally {
      setIsScraping(false);
    }
  };

  // Action: Execute standard SQL commands via alaSQL SQLite layer
  const handleExecuteSql = async (query: string) => {
    try {
      const response = await fetch("/api/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, results: data.results };
      } else {
        return { success: false, error: data.error || "Syntax error" };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "SQL connection timed out" };
    }
  };

  // Action: Ask Gemini to recommend crawler selections
  const handleSuggestSelectors = async (htmlSegment: string, objective: string) => {
    const response = await fetch("/api/gemini/suggest-selectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ htmlSegment, objective })
    });
    if (response.ok) {
      return await response.json();
    } else {
      const err = await response.json();
      throw new Error(err.error || "Gemini query unsuccessful");
    }
  };

  // Action: Dry-run selectors on a target page
  const handleTestSelectors = async (payload: any) => {
    const response = await fetch("/api/scrape/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      return await response.json();
    } else {
      const err = await response.json();
      throw new Error(err.error || "Test parser call failed");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Left Sidebar: Control Panel & Schedules */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">Scrape.io</h1>
          </div>
          <p className="text-slate-400 text-[10px] font-mono tracking-widest uppercase">ETL Pipeline Active</p>
        </div>

        {/* Navigation list in sidebar */}
        <div className="flex-1 p-5 space-y-6 overflow-y-auto">
          <div>
            <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Workspaces</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs transition-all ${
                  activeTab === "dashboard" ? "bg-slate-850 text-emerald-400 font-semibold border-l-2 border-emerald-400" : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard View</span>
              </button>

              <button
                onClick={() => setActiveTab("pipelines")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs transition-all ${
                  activeTab === "pipelines" ? "bg-slate-850 text-emerald-400 font-semibold border-l-2 border-emerald-400" : "text-slate-400 hover:text-white"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Pipelines Config</span>
              </button>

              <button
                onClick={() => setActiveTab("sql")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs transition-all ${
                  activeTab === "sql" ? "bg-slate-850 text-emerald-400 font-semibold border-l-2 border-emerald-400" : "text-slate-400 hover:text-white"
                }`}
              >
                <Database className="w-4 h-4" />
                <span>SQL Terminal</span>
              </button>

              <button
                onClick={() => setActiveTab("sandbox")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs transition-all ${
                  activeTab === "sandbox" ? "bg-slate-850 text-emerald-400 font-semibold border-l-2 border-emerald-400" : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Selector Sandbox</span>
              </button>

              <button
                onClick={() => setActiveTab("python")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs transition-all ${
                  activeTab === "python" ? "bg-slate-850 text-emerald-400 font-semibold border-l-2 border-emerald-400" : "text-slate-400 hover:text-white"
                }`}
              >
                <Code className="w-4 h-4" />
                <span>Streamlit Exporter</span>
              </button>
            </nav>
          </div>

          {/* Quick SQLite DB Stats panel mimicking Design style */}
          <div>
            <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Storage Health</h2>
            <div className="font-mono text-xs text-slate-400 space-y-1">
              <div className="flex justify-between py-1">
                <span>SQLite DB</span>
                <span className="text-white">sqlite_db.db</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-800">
                <span>Rows Count</span>
                <span className="text-emerald-400">{items.length}</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-800">
                <span>Uptime</span>
                <span className="text-sky-400">99.98%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 bg-slate-950/80 shrink-0 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 font-mono text-center mb-2">RUNNING ON PORT 3000</p>
          <button 
            type="button" 
            onClick={() => refreshAllState()}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded text-xs transition-colors uppercase tracking-wider font-sans focus:outline-hidden"
          >
            REFRESH METRICS
          </button>
        </div>
      </aside>

      {/* Right Content: Dashboard views */}
      <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-12">
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Workspace</span>
              <span className="font-mono text-xs text-slate-700 font-bold flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {activeTab.toUpperCase()} PANEL
              </span>
            </div>
            <div className="hidden md:block">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sync State</span>
              <span className="font-sans text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? "animate-spin text-blue-500" : ""}`} />
                <span>Autosync (30s)</span>
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scrape Success</span>
              <span className="font-sans text-xs text-emerald-600 font-bold block mt-0.5">98.4% (35 runs)</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => refreshAllState()}
              disabled={isRefreshing}
              className="bg-slate-105 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-slate-500" : ""}`} />
              <span>Sync All</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
              JD
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          {/* Alerts / Success banners drawer */}
          {successBanner && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl text-xs flex items-center space-x-2.5 animate-fadeIn font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {errorText && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs flex items-center space-x-2.5 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Selected View router */}
          <div className="flex-1">
            {activeTab === "dashboard" && (
              <VisualDashboard 
                scrapers={scrapers} 
                runs={runs} 
                items={items} 
                onTriggerScrape={handleTriggerScrape}
                isLoading={isScraping}
              />
            )}

            {activeTab === "pipelines" && (
              <CrawlerSetup
                scrapers={scrapers}
                onAddScraper={handleAddScraper}
                onDeleteScraper={handleDeleteScraper}
                isLoading={isRefreshing}
              />
            )}

            {activeTab === "sql" && (
              <SqlConsole 
                onExecuteSql={handleExecuteSql}
              />
            )}

            {activeTab === "sandbox" && (
              <AiAssistant
                onSuggestSelectors={handleSuggestSelectors}
                onTestSelectors={handleTestSelectors}
              />
            )}

            {activeTab === "python" && (
              <PythonGenerator 
                scrapers={scrapers}
              />
            )}
          </div>
        </div>

        {/* Standard humble Footer */}
        <footer className="bg-white border-t border-slate-200 py-3 px-8 shrink-0 flex flex-col md:flex-row justify-between items-center text-[10.5px] font-mono text-slate-400 gap-2">
          <p>© 2026 SQLite Scraper Dashboard. Complete server-side crawler execution pipeline.</p>
          <p className="flex items-center space-x-1">
            <span>Server status:</span>
            <span className="inline-block w-2 bg-emerald-500 rounded-full h-2"></span>
            <span className="text-gray-500">running (port 3000)</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
