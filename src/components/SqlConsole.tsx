import { useState } from "react";
import { Play, Database, Table, HelpCircle, Code, FileText, CheckCircle2, AlertTriangle, Terminal } from "lucide-react";

interface SqlConsoleProps {
  onExecuteSql: (query: string) => Promise<{ success: boolean; results?: any[]; error?: string }>;
}

const TEMPLATE_QUERIES = [
  {
    name: "Latest Extracted Items",
    sql: "SELECT id, title, subtitle, value, category FROM items ORDER BY scrapedAt DESC LIMIT 8"
  },
  {
    name: "Average Salary / Price Grouping",
    sql: "SELECT category, AVG(value) as avg_value, MIN(value) as min_value, MAX(value) as max_value, COUNT(*) as row_count FROM items GROUP BY category"
  },
  {
    name: "Highest Paying Remote Jobs",
    sql: "SELECT title, subtitle as company, value as salary_usd FROM items WHERE value >= 100000 ORDER BY value DESC"
  },
  {
    name: "Performance Join Metrics",
    sql: "SELECT items.title, items.value, runs.scraperName, runs.status, runs.durationMs FROM items JOIN runs ON items.runId = runs.id ORDER BY runs.durationMs ASC LIMIT 10"
  },
  {
    name: "Run Latency Summary",
    sql: "SELECT scraperName, AVG(durationMs) as avg_duration, COUNT(*) as total_runs FROM runs GROUP BY scraperName"
  }
];

export default function SqlConsole({ onExecuteSql }: SqlConsoleProps) {
  const [query, setQuery] = useState(TEMPLATE_QUERIES[0].sql);
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);

  const runQuery = async (sqlToRun: string) => {
    setIsExecuting(true);
    setError("");
    setResults([]);
    setColumns([]);
    
    const startTime = Date.now();
    try {
      const res = await onExecuteSql(sqlToRun);
      if (res.success && res.results) {
        const rows = res.results;
        setResults(rows);
        if (rows.length > 0) {
          // If the return is a nested array or plain objects, extract headers
          const firstRow = rows[0];
          if (typeof firstRow === "object" && firstRow !== null) {
            setColumns(Object.keys(firstRow));
          } else {
            setColumns(["value"]);
          }
        }
        setExecTimeMs(Date.now() - startTime);
      } else {
        setError(res.error || "An unknown SQLite shell syntax error occurred");
      }
    } catch (err: any) {
      setError(err?.message || "SQL Exec failed");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Relational Schema outline and Templates */}
      <div className="space-y-6">
        {/* Table schema definition cards */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span>SQLite Database Schema</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* Table 1: Scrapers */}
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-gray-700 font-semibold font-mono">
                <Table className="w-3.5 h-3.5 text-gray-400" />
                <span>scrapers</span>
              </div>
              <ul className="pl-5 space-y-0.5 font-mono text-[10px] text-gray-500 list-disc">
                <li>id <span className="text-gray-350">STRING (PK)</span></li>
                <li>name <span className="text-gray-350">STRING</span></li>
                <li>url <span className="text-gray-350">STRING</span></li>
                <li>category <span className="text-gray-350">STRING</span></li>
                <li>schedule <span className="text-gray-350">STRING</span></li>
              </ul>
            </div>

            {/* Table 2: Runs */}
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-gray-700 font-semibold font-mono">
                <Table className="w-3.5 h-3.5 text-gray-400" />
                <span>runs</span>
              </div>
              <ul className="pl-5 space-y-0.5 font-mono text-[10px] text-gray-500 list-disc">
                <li>id <span className="text-gray-350">STRING (PK)</span></li>
                <li>scraperId <span className="text-gray-350">STRING</span></li>
                <li>scraperName <span className="text-gray-350">STRING</span></li>
                <li>status <span className="text-gray-350">STRING</span></li>
                <li>durationMs <span className="text-gray-350">INT</span></li>
                <li>itemsCount <span className="text-gray-350">INT</span></li>
              </ul>
            </div>

            {/* Table 3: Items */}
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-gray-700 font-semibold font-mono">
                <Table className="w-3.5 h-3.5 text-gray-400" />
                <span>items</span>
              </div>
              <ul className="pl-5 space-y-0.5 font-mono text-[10px] text-gray-500 list-disc">
                <li>id <span className="text-gray-350">STRING (PK)</span></li>
                <li>runId <span className="text-gray-350">STRING (FK)</span></li>
                <li>scraperId <span className="text-gray-350">STRING (FK)</span></li>
                <li>title <span className="text-gray-350">STRING</span></li>
                <li>subtitle <span className="text-gray-350">STRING</span></li>
                <li>value <span className="text-gray-350">REAL/NUMBER</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Template selections list */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Pre-built SQL Queries</h3>
          <div className="space-y-2">
            {TEMPLATE_QUERIES.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(t.sql);
                  runQuery(t.sql);
                }}
                className="w-full text-left p-2 border border-gray-100 hover:border-blue-100 rounded-lg hover:bg-slate-50 text-xs font-medium text-gray-600 hover:text-blue-600 transition-all flex flex-col gap-0.5"
              >
                <span>{t.name}</span>
                <span className="font-mono text-[9px] text-gray-350 truncate">{t.sql}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Column: Workbench SQL Query Terminal and Data tables */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-slate-900 border border-slate-950 rounded-2xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-slate-950 px-4 py-3 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center space-x-2 text-slate-100">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-xs font-semibold">SQLite Shell: sqlite_db.db</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
                PRAGMA foreign_keys=ON;
              </span>
            </div>
          </div>

          {/* Prompt Entry block */}
          <div className="p-4 space-y-3">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. SELECT * FROM items WHERE category='Engineering'"
              rows={4}
              className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-3.5 border border-slate-810 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-hidden resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500 font-mono">
                Press Run to execute standard sqlite3 standard operators syntax.
              </span>

              <button
                type="button"
                onClick={() => runQuery(query)}
                disabled={isExecuting || !query.trim()}
                className="inline-flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 py-1.5 px-4 rounded-lg text-xs font-bold font-mono transition-all uppercase tracking-wider"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Command</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results Pane */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Query Results Table</h3>
              <p className="text-xs text-gray-500">Output rows generated by compiled Relational Executor</p>
            </div>
            
            {execTimeMs !== null && !error && (
              <span className="text-[10px] font-mono text-gray-400 bg-gray-50 p-1 rounded">
                {results.length} rows returned in {execTimeMs}ms
              </span>
            )}
          </div>

          {/* Table display */}
          <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
            {isExecuting ? (
              <div className="py-20 text-center text-gray-400 space-y-2">
                <Database className="w-8 h-8 stroke-1 mx-auto animate-bounce text-emerald-500" />
                <p className="text-xs font-mono text-gray-500">Querying SQLite tables ...</p>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-50 text-red-700 flex items-start space-x-3 text-xs leading-relaxed font-mono">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1 uppercase text-[10px]">sqlite3 Syntax Error:</h4>
                  <p>{error}</p>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100 uppercase tracking-wider font-mono text-gray-500 text-[10px] border-b border-gray-200 sticky top-0">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="p-3 font-semibold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {results.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 font-mono text-gray-700 text-[11px]">
                        {columns.map((col) => {
                          const val = row[col];
                          return (
                            <td key={col} className="p-3 truncate max-w-xs" title={String(val)}>
                              {typeof val === "object" && val !== null ? (
                                JSON.stringify(val)
                              ) : typeof val === "number" ? (
                                val.toLocaleString()
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-gray-400 space-y-1">
                <Terminal className="w-8 h-8 stroke-1 mx-auto text-gray-300" />
                <p className="text-xs">Console idling. Enter a SQL query and click Run Command to display records!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
