import { useState, useMemo } from "react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell
} from "recharts";
import { ScraperTask, ScraperRun, ExtractedItem } from "../types.js";
import { Database, Plus, RefreshCw, BarChart2, Briefcase, Tag, FileText, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";

interface VisualDashboardProps {
  scrapers: ScraperTask[];
  runs: ScraperRun[];
  items: ExtractedItem[];
  onTriggerScrape: (id: string) => Promise<void>;
  isLoading: boolean;
}

export default function VisualDashboard({
  scrapers,
  runs,
  items,
  onTriggerScrape,
  isLoading,
}: VisualDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Filter items based on Category
  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return items;
    return items.filter(
      (item) => item.category?.toLowerCase() === selectedCategory.toLowerCase() || 
                scrapers.find(s => s.id === item.scraperId)?.category === selectedCategory
    );
  }, [items, selectedCategory, scrapers]);

  // Metric summaries
  const stats = useMemo(() => {
    const totalScrapers = scrapers.length;
    const totalRuns = runs.length;
    const successRuns = runs.filter((r) => r.status === "success").length;
    const totalItems = items.length;
    
    // Average numerical value (salary, points, prices)
    const numericalItems = items.filter(i => typeof i.value === "number");
    const avgValue = numericalItems.length > 0
      ? Math.round(numericalItems.reduce((acc, curr) => acc + (curr.value as number), 0) / numericalItems.length)
      : 0;

    return { totalScrapers, totalRuns, successRuns, totalItems, avgValue };
  }, [scrapers, runs, items]);

  // Chart data 1: Category Averages
  const categoryChartData = useMemo(() => {
    const groups: { [key: string]: { sum: number; count: number } } = {};
    items.forEach((item) => {
      if (typeof item.value === "number") {
        const cat = item.category || "General";
        if (!groups[cat]) {
          groups[cat] = { sum: 0, count: 0 };
        }
        groups[cat].sum += item.value;
        groups[cat].count += 1;
      }
    });

    return Object.keys(groups).map((key) => ({
      name: key,
      average: Math.round(groups[key].sum / groups[key].count),
      count: groups[key].count
    })).sort((a, b) => b.average - a.average);
  }, [items]);

  // Chart data 2: Run success logs history
  const runsHistoryData = useMemo(() => {
    return runs.slice(0, 10).reverse().map((run) => ({
      name: run.scraperName.length > 15 ? run.scraperName.substring(0, 15) + ".." : run.scraperName,
      items: run.itemsCount,
      duration: Math.round(run.durationMs)
    }));
  }, [runs]);

  const categoryColors = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-slate-990 text-emerald-400 rounded-lg">
            <Database className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">Active Pipelines</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight mt-0.5">{stats.totalScrapers}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-slate-990 text-sky-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">Successful ETLs</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
              {stats.successRuns} <span className="text-xs font-normal text-slate-400">/ {stats.totalRuns}</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-slate-990 text-indigo-400 rounded-lg">
            <FileText className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">Stored SQL Rows</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight mt-0.5">{stats.totalItems}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-slate-990 text-amber-500 rounded-lg">
            <BarChart2 className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">Avg Extracted Val</p>
            <p className="text-3xl font-bold text-slate-100/10 text-slate-900 tracking-tight mt-0.5">
              {stats.avgValue ? stats.avgValue.toLocaleString() : "0"}
              <span className="text-xs font-normal text-slate-400 ml-1 font-mono">avg</span>
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Value distribution per category */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">Scraped Value Density</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Average metrics separated by structural HTML tags</p>
            </div>
            <div className="p-1.5 bg-slate-100 rounded text-[10px] text-slate-500 font-mono">
              AVG() query
            </div>
          </div>
          <div className="h-64">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#F8FAFC" }} 
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <Bar dataKey="average" fill="#6366F1" radius={[4, 4, 0, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <BarChart2 className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
                <p className="text-xs">No data logged. Run a scraper to load records!</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Run Performance logs */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">Pipeline Performance Metrics</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Latency of previous BeautifulSoup/Cheerio loads (ms)</p>
            </div>
            <div className="p-1.5 bg-slate-100 rounded text-[10px] text-slate-500 font-mono">
              LATENCY(ms)
            </div>
          </div>
          <div className="h-64">
            {runsHistoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={runsHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#F8FAFC" }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line 
                    type="monotone" 
                    name="Speed (ms)" 
                    dataKey="duration" 
                    stroke="#6366F1" 
                    strokeWidth={2.5}
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    type="monotone" 
                    name="Items Load Count" 
                    dataKey="items" 
                    stroke="#10B981" 
                    strokeWidth={2.5} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <RefreshCw className="w-10 h-10 stroke-1 mb-2 animate-spin text-emerald-500" />
                <p className="text-xs">Database loading ...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Target Scrapers Quick Run Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">Fast Launch Scrapers</h3>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Click any target below to execute the live fetch and run the ETL parsing pipeline, saving rows directly to SQLite tables.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scrapers.map((scraper) => {
            const lastRun = runs.find((r) => r.scraperId === scraper.id);
            const count = items.filter((i) => i.scraperId === scraper.id).length;

            return (
              <div 
                key={scraper.id}
                className="border border-slate-200 bg-slate-50/20 rounded-xl p-5 hover:border-indigo-400 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                      {scraper.category}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Loaded: <span className="font-bold text-slate-700">{count}</span> rows
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-1">{scraper.name}</h4>
                  <p className="text-xs text-slate-400 truncate mb-4 font-mono" title={scraper.url}>
                    {scraper.url}
                  </p>
                </div>
                <button
                  onClick={() => onTriggerScrape(scraper.id)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 border border-slate-200 hover:bg-slate-900 bg-white text-slate-700 rounded text-xs font-bold hover:text-white transition-colors disabled:opacity-50 uppercase tracking-wider"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-500" : ""}`} />
                  <span>Execute Scrape ETL</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stored SQL Items Browser */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 pb-4 mb-4 gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">Database SQL Record Browser (sqlite3)</h3>
            <p className="text-xs text-slate-400">Live view of current rows written to relational tables in SQLite</p>
          </div>

          {/* Filter badges */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                selectedCategory === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Rows
            </button>
            <button
              onClick={() => setSelectedCategory("jobs")}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                selectedCategory === "jobs" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Jobs
            </button>
            <button
              onClick={() => setSelectedCategory("prices")}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                selectedCategory === "prices" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setSelectedCategory("news")}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                selectedCategory === "news" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tech Stories
            </button>
          </div>
        </div>

        {/* SQL Table browser list */}
        <div className="overflow-hidden border border-slate-200 rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="text-[10px] text-slate-400 font-bold tracking-wider bg-slate-50 border-b border-slate-200 uppercase font-sans">
                <tr>
                  <th className="py-3 px-5">id</th>
                  <th className="py-3 px-5">Title</th>
                  <th className="py-3 px-5">Label/Subtitle</th>
                  <th className="py-3 px-5">Numeric Match</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 text-xs">
                      <td className="py-3.5 px-5 font-mono text-slate-400">{item.id}</td>
                      <td className="py-3.5 px-5 font-medium text-slate-900 break-normal max-w-xs">{item.title}</td>
                      <td className="py-3.5 px-5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium leading-none">
                          {item.subtitle || "N/A"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-mono font-semibold text-slate-700">
                        {typeof item.value === "number" ? (
                          item.value >= 1000 ? (
                            `$${item.value.toLocaleString()}`
                          ) : (
                            `${item.value} points/rating`
                          )
                        ) : (
                          item.value || "[EMPTY]"
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-bold text-[11px] uppercase tracking-wider"
                        >
                          <span>Inspect Source</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                      No matching database items found. Use fast executing scraper above to load items!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
