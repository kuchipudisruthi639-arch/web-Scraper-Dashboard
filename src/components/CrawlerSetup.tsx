import { useState, FormEvent } from "react";
import { ScraperTask } from "../types.js";
import { Database, Plus, Trash2, Calendar, Link2, Settings, HelpCircle, Code, Play } from "lucide-react";

interface CrawlerSetupProps {
  scrapers: ScraperTask[];
  onAddScraper: (scraper: Omit<ScraperTask, "id" | "createdAt" | "targetCount">) => Promise<void>;
  onDeleteScraper: (id: string) => Promise<void>;
  isLoading: boolean;
}

export default function CrawlerSetup({
  scrapers,
  onAddScraper,
  onDeleteScraper,
  isLoading,
}: CrawlerSetupProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<ScraperTask["category"]>("jobs");
  const [schedule, setSchedule] = useState<ScraperTask["schedule"]>("everyHour");

  // CSS Selectors state
  const [wrapperSelector, setWrapperSelector] = useState("");
  const [titleSelector, setTitleSelector] = useState("");
  const [subtitleSelector, setSubtitleSelector] = useState("");
  const [valueSelector, setValueSelector] = useState("");
  const [linkSelector, setLinkSelector] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Quick fill presets to teach scraping concepts
  const loadPreset = (preset: "jobs" | "prices" | "news") => {
    if (preset === "jobs") {
      setName("Apex Startup Careers");
      setUrl("https://sandbox.apexjobs.io");
      setCategory("jobs");
      setSchedule("everyHour");
      setWrapperSelector(".job-card");
      setTitleSelector(".job-title");
      setSubtitleSelector(".company-name");
      setValueSelector(".salary-tag");
      setLinkSelector("a.apply-btn");
    } else if (preset === "prices") {
      setName("MacroGadget Electronics Store");
      setUrl("https://sandbox.macrogadget.com");
      setCategory("prices");
      setSchedule("every6Hours");
      setWrapperSelector(".product-item");
      setTitleSelector(".product-title");
      setSubtitleSelector(".category-badge");
      setValueSelector(".current-price");
      setLinkSelector("a.p-link");
    } else if (preset === "news") {
      setName("TechChronicle Hacker News");
      setUrl("https://sandbox.techchronicle.org");
      setCategory("news");
      setSchedule("manual");
      setWrapperSelector(".story-row");
      setTitleSelector(".story-title");
      setSubtitleSelector(".author");
      setValueSelector(".score");
      setLinkSelector("a.story-title");
    }
    setErrorMsg("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name || !url || !wrapperSelector || !titleSelector) {
      setErrorMsg("Please fill in Name, Target URL, Wrapper Selector, and Title Selector.");
      return;
    }

    onAddScraper({
      name,
      url,
      category,
      schedule,
      wrapperSelector,
      titleSelector,
      subtitleSelector,
      valueSelector,
      linkSelector,
    });

    // Reset Form
    setName("");
    setUrl("");
    setWrapperSelector("");
    setTitleSelector("");
    setSubtitleSelector("");
    setValueSelector("");
    setLinkSelector("");
    setFormOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 column: Active pipelines and Preset loading */}
      <div className="lg:col-span-2 space-y-6">
        {/* Presets Cards Jumbotron */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-1/4 translate-x-1/4">
            <Code className="w-64 h-64" />
          </div>

          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">BeatifulSoup Boilerplate Templates</h3>
            <p className="text-slate-350 text-xs max-w-lg mb-4">
              Pre-built css rule layouts for our sandbox mirrors. Click a preset below to instantly compile BeautifulSoup extraction definitions.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setFormOpen(true); loadPreset("jobs"); }}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-medium border border-slate-750 transition-colors flex items-center space-x-1.5"
              >
                <span>📦 Job Directory</span>
              </button>
              <button
                onClick={() => { setFormOpen(true); loadPreset("prices"); }}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-medium border border-slate-750 transition-colors flex items-center space-x-1.5"
              >
                <span>🏷️ E-Commerce Sales</span>
              </button>
              <button
                onClick={() => { setFormOpen(true); loadPreset("news"); }}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-medium border border-slate-750 transition-colors flex items-center space-x-1.5"
              >
                <span>📰 Hacker News Board</span>
              </button>
            </div>
          </div>
        </div>

        {/* List of active pipelines */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Configured Scraping Pipelines</h3>
              <p className="text-xs text-gray-500">Active crawlers scheduled for BeautifulSoup ETL processing</p>
            </div>
            {!formOpen && (
              <button
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Pipeline</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {scrapers.length > 0 ? (
              scrapers.map((task) => (
                <div 
                  key={task.id} 
                  className="p-4 border border-gray-100 rounded-xl hover:border-blue-100 hover:shadow-xs transition-all bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-medium tracking-wide uppercase bg-white px-2 py-0.5 rounded border border-gray-150 text-gray-500">
                        {task.category}
                      </span>
                      <h4 className="font-semibold text-gray-900 text-sm">{task.name}</h4>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <Link2 className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-xs">{task.url}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>Schedule: {task.schedule}</span>
                      </span>
                    </div>

                    {/* SELECTOR SUB-TAGS VIEW */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="text-[10px] font-mono bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-100" title="Wrapper node">
                        Wrapper: <span className="text-blue-600 font-medium">{task.wrapperSelector}</span>
                      </span>
                      <span className="text-[10px] font-mono bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-100" title="Title element">
                        Title: <span className="text-emerald-600 font-medium">{task.titleSelector}</span>
                      </span>
                      {task.valueSelector && (
                        <span className="text-[10px] font-mono bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-100" title="Numerical metric value">
                          Value: <span className="text-violet-600 font-medium">{task.valueSelector}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0">
                    <button
                      onClick={() => onDeleteScraper(task.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete pipeline config"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl text-gray-400">
                <Settings className="w-8 h-8 stroke-1 mx-auto mb-2 animate-spin-slow" />
                <p className="text-xs">No active pipelines scheduled. Create a new one or load a preset above!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Add Form */}
      <div>
        {formOpen ? (
          <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Configure Scraper Pipeline</h3>
              <button 
                onClick={() => setFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-medium"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-2.5 rounded-lg text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Step 1: Identifier info */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 block">Pipeline Match Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Apex Engineering Jobs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 block">Target URL</label>
                <input 
                  type="url"
                  placeholder="e.g. https://sandbox.apexjobs.io"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="jobs">Tech Jobs</option>
                    <option value="prices">E-Commerce Prices</option>
                    <option value="news">Hacker News</option>
                    <option value="custom">Custom Selector</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 block">Schedule</label>
                  <select
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value as any)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="everyHour">Every Hour</option>
                    <option value="every6Hours">Every 6 Hours</option>
                    <option value="everyDay">Every Day</option>
                    <option value="manual">Manual Scrape</option>
                  </select>
                </div>
              </div>

              {/* Step 2: Custom Selecors block */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-3">
                <h4 className="text-xs font-semibold text-gray-700 flex items-center space-x-1">
                  <span>CSS Selector Definition (BeautifulSoup Rules)</span>
                  <HelpCircle className="w-3 h-3 text-gray-400" title="Identify CSS classes using browser inspector" />
                </h4>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-mono text-gray-500 block">Item Card Wrapper (e.g. .job-card)</label>
                    <input 
                      type="text" 
                      placeholder=".job-card or div.product-box"
                      value={wrapperSelector}
                      onChange={(e) => setWrapperSelector(e.target.value)}
                      className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2 bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-500 block">Title Element Selector (e.g. .job-title)</label>
                    <input 
                      type="text" 
                      placeholder="h3.title or .product-name"
                      value={titleSelector}
                      onChange={(e) => setTitleSelector(e.target.value)}
                      className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2 bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-500 block">Subtitle/Meta Selector (Optional)</label>
                    <input 
                      type="text" 
                      placeholder=".company-name or span.badge"
                      value={subtitleSelector}
                      onChange={(e) => setSubtitleSelector(e.target.value)}
                      className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-500 block">Metric Value/Price Selector (Optional)</label>
                    <input 
                      type="text" 
                      placeholder=".price-tag or span.score"
                      value={valueSelector}
                      onChange={(e) => setValueSelector(e.target.value)}
                      className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-500 block">Detail Href Link Tag (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="a.apply-btn or h3 > a"
                      value={linkSelector}
                      onChange={(e) => setLinkSelector(e.target.value)}
                      className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-xs transition-colors"
              >
                Compile and Load Pipeline
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center space-y-3 shadow-xs">
            <Database className="w-8 h-8 text-blue-500 mx-auto" />
            <h4 className="font-semibold text-gray-800 text-sm">Add New Scraper Task</h4>
            <p className="text-xs text-gray-500">
              Configure scraping configurations for custom portals, setting specific schedules, wrappers, and attributes.
            </p>
            <button
              onClick={() => setFormOpen(true)}
              className="text-white bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-xl text-xs font-medium w-full transition-all"
            >
              Configure Custom Custom Rules
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
