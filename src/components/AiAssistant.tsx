import { useState, useMemo } from "react";
import { Play, Sparkles, Code, Terminal, Eye, AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { SANDBOX_PAGES } from "../data/sandboxHtml.js";

interface AiAssistantProps {
  onSuggestSelectors: (htmlSegment: string, objective: string) => Promise<{
    wrapperSelector: string;
    titleSelector: string;
    subtitleSelector: string;
    linkSelector: string;
    valueSelector: string;
    explanation: string;
    pythonSnippet?: string;
  }>;
  onTestSelectors: (payload: {
    url: string;
    category: string;
    wrapperSelector: string;
    titleSelector: string;
    subtitleSelector: string;
    linkSelector: string;
    valueSelector: string;
  }) => Promise<{ wrapperCount: number; items: any[] }>;
}

export default function AiAssistant({ 
  onSuggestSelectors, 
  onTestSelectors 
}: AiAssistantProps) {
  const [selectedMock, setSelectedMock] = useState<"jobs" | "prices" | "news">("jobs");
  
  // Custom manual testing targets
  const [testWrapper, setTestWrapper] = useState(".job-card");
  const [testTitle, setTestTitle] = useState(".job-title");
  const [testSubtitle, setTestSubtitle] = useState(".company-name");
  const [testValue, setTestValue] = useState(".salary-tag");
  const [testLink, setTestLink] = useState("a.apply-btn");

  const [testResults, setTestResults] = useState<any[]>([]);
  const [testWrapperCount, setTestWrapperCount] = useState<number | null>(null);
  const [testError, setTestError] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  // Gemini state triggers
  const [objective, setObjective] = useState("Extract job titles, hiring company name, and salary bounds");
  const [geminiResult, setGeminiResult] = useState<any>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState("");

  const rawHtml = useMemo(() => {
    return SANDBOX_PAGES[selectedMock].html;
  }, [selectedMock]);

  // Handle template mock switches
  const handleMockSwitch = (key: "jobs" | "prices" | "news") => {
    setSelectedMock(key);
    setTestError("");
    setTestResults([]);
    setTestWrapperCount(null);
    setGeminiResult(null);

    if (key === "jobs") {
      setTestWrapper(".job-card");
      setTestTitle(".job-title");
      setTestSubtitle(".company-name");
      setTestValue(".salary-tag");
      setTestLink("a.apply-btn");
      setObjective("Extract job titles, hiring company names, and salary ranges");
    } else if (key === "prices") {
      setTestWrapper(".product-item");
      setTestTitle(".product-title");
      setTestSubtitle(".category-badge");
      setTestValue(".current-price");
      setTestLink("a.p-link");
      setObjective("Extract gadget specific product names, price parameters, and category names");
    } else if (key === "news") {
      setTestWrapper(".story-row");
      setTestTitle(".story-title");
      setTestSubtitle(".author");
      setTestValue(".score");
      setTestLink("a.story-title");
      setObjective("Extract news headline rows, column counts, links, points score, and authors");
    }
  };

  const handleRunManualTest = async () => {
    setIsTesting(true);
    setTestError("");
    setTestResults([]);
    setTestWrapperCount(null);

    const payload = {
      url: SANDBOX_PAGES[selectedMock].url,
      category: selectedMock,
      wrapperSelector: testWrapper,
      titleSelector: testTitle,
      subtitleSelector: testSubtitle,
      valueSelector: testValue,
      linkSelector: testLink,
    };

    try {
      const data = await onTestSelectors(payload);
      setTestWrapperCount(data.wrapperCount);
      setTestResults(data.items);
    } catch (err: any) {
      setTestError(err.message || "Manual element extraction test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunGeminiQuery = async () => {
    setIsGeminiLoading(true);
    setGeminiError("");
    setGeminiResult(null);

    // Limit segment to first 1000 chars to avoid token inflation
    const segment = rawHtml.substring(0, 1500) + "\n<!-- HTML TRUNCATED BY CLIENT -->";

    try {
      const data = await onSuggestSelectors(segment, objective);
      setGeminiResult(data);
    } catch (err: any) {
      setGeminiError(err.message || "Gemini CSS Selector Query failed");
    } finally {
      setIsGeminiLoading(false);
    }
  };

  const loadGeminiSelectorsToTest = () => {
    if (geminiResult) {
      setTestWrapper(geminiResult.wrapperSelector || "");
      setTestTitle(geminiResult.titleSelector || "");
      setTestSubtitle(geminiResult.subtitleSelector || "");
      setTestValue(geminiResult.valueSelector || "");
      setTestLink(geminiResult.linkSelector || "");
    }
  };

  return (
    <div className="space-y-6">
      {/* Jumbotron Page Intro */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
        <h3 className="font-semibold text-gray-950 text-sm mb-1.5 flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-violet-500 fill-violet-200" />
          <span>Extraction Selector Sandbox & AI Assistant</span>
        </h3>
        <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
          Inspect raw structured HTML templates from our servers, test CSS selection mapping interactively with our trial browser, or consult Gemini on how to extract specific attributes safely into BeautifulSoup parsers.
        </p>

        {/* Mock HTML selectors switcher tabs */}
        <div className="flex border-b border-gray-150 pb-1 mt-4 gap-4 text-xs font-semibold">
          <button
            onClick={() => handleMockSwitch("jobs")}
            className={`pb-2.5 transition-colors ${
              selectedMock === "jobs" ? "border-b-2 border-blue-650 text-blue-600" : "text-gray-450 hover:text-gray-900"
            }`}
          >
            Apex Job Portal DOM
          </button>
          <button
            onClick={() => handleMockSwitch("prices")}
            className={`pb-2.5 transition-colors ${
              selectedMock === "prices" ? "border-b-2 border-emerald-650 text-emerald-600" : "text-gray-450 hover:text-gray-900"
            }`}
          >
            MacroGadget Electronics Store DOM
          </button>
          <button
            onClick={() => handleMockSwitch("news")}
            className={`pb-2.5 transition-colors ${
              selectedMock === "news" ? "border-b-2 border-amber-650 text-amber-600" : "text-gray-450 hover:text-gray-900"
            }`}
          >
            Hacker News FEED DOM
          </button>
        </div>
      </div>

      {/* Code Editor showing DOM Node Grid & Option Block Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Beautiful Scrollable Raw HTML Preview panel */}
        <div className="bg-slate-900 border border-slate-950 rounded-2xl shadow-sm flex flex-col h-[520px]">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center shrink-0">
            <span className="font-mono text-xs font-semibold text-slate-100 flex items-center space-x-1.5">
              <Code className="w-4 h-4 text-blue-400" />
              <span>Target Source: {SANDBOX_PAGES[selectedMock].name}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              HTML View ({rawHtml.length} chars)
            </span>
          </div>

          <div className="p-4 overflow-y-auto font-mono text-[10.5px] text-slate-350 leading-relaxed bg-slate-950/20 select-text flex-1">
            <pre className="whitespace-pre-wrap">{rawHtml}</pre>
          </div>
        </div>

        {/* Right Tabbed Actions Column: Sandbox Tester & Gemini advisor */}
        <div className="space-y-6">
          {/* Action Module 1: CSS parsing trial testbed */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-gray-50 pb-3">
              <Eye className="w-5 h-5 text-blue-500" />
              <div>
                <h4 className="font-semibold text-gray-800 text-sm">Selector Manual Testbed</h4>
                <p className="text-[10px] text-gray-400">Validate BeautifulSoup selection rules against mock web sources</p>
              </div>
            </div>

            {/* Selection Text entries */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="col-span-2">
                <label className="text-[10px] text-gray-500 font-bold block mb-1">Wrapper Node Select (required)</label>
                <input 
                  type="text" 
                  value={testWrapper}
                  onChange={(e) => setTestWrapper(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 focus:ring-1 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1">Title select (required)</label>
                <input 
                  type="text" 
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1">Subtitle selector</label>
                <input 
                  type="text" 
                  value={testSubtitle}
                  onChange={(e) => setTestSubtitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1">Price/Value selector</label>
                <input 
                  type="text" 
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1">Atribute Href selector</label>
                <input 
                  type="text" 
                  value={testLink}
                  onChange={(e) => setTestLink(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              onClick={handleRunManualTest}
              disabled={isTesting}
              className="w-full bg-slate-900 text-slate-100 hover:bg-slate-800 disabled:opacity-50 py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all font-mono"
            >
              <Play className="w-3 h-3 fill-slate-100 animate-pulse" />
              <span>{isTesting ? "Executing Extractor Test..." : "Execute Test Parse"}</span>
            </button>

            {/* Manual test outcomes output drawer */}
            {(testWrapperCount !== null || testError) && (
              <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 max-h-56 overflow-y-auto space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-400 font-mono pb-1 border-b border-gray-200">
                  <span>Results terminal:</span>
                  {testWrapperCount !== null && (
                    <span className="text-emerald-600 font-semibold">{testWrapperCount} element blocks parsed</span>
                  )}
                </div>

                {testError ? (
                  <div className="text-red-650 text-xs font-mono flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{testError}</span>
                  </div>
                ) : testResults.length > 0 ? (
                  <div className="space-y-1.5">
                    {testResults.map((itm) => (
                      <div key={itm.index} className="text-[10px] font-mono text-gray-600 border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                        <span className="text-blue-500 font-medium">#{itm.index + 1}:</span>{" "}
                        <span className="text-gray-900 font-semibold">{itm.title}</span>{" "}
                        {itm.subtitle && <span className="text-gray-400 text-[9px] bg-white border px-1 rounded ml-1">{itm.subtitle}</span>}
                        {itm.value !== "[NOT FOUND]" && String(itm.value) && (
                          <span className="text-violet-600 font-medium ml-1">({itm.value})</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 text-center py-2">Test completed, but zero elements match selectors. Try tweaking your selector hierarchy classes!</p>
                )}
              </div>
            )}
          </div>

          {/* Action Module 2: AI Gemini Advisor */}
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex space-x-2">
                <div className="p-1 text-indigo-700">
                  <Sparkles className="w-5 h-5 fill-indigo-100 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm">Gemini Relational AI Advisor</h4>
                  <p className="text-[10px] text-gray-400">Analyze DOM elements to extract custom structured parameters</p>
                </div>
              </div>
              <span className="text-[9px] bg-indigo-100/60 text-indigo-700 font-bold px-2 rounded-full font-mono uppercase tracking-wide">
                gemini-3.5-flash
              </span>
            </div>

            {/* Object box */}
            <div className="space-y-1 text-xs">
              <label className="text-[10px] text-gray-600 font-semibold block">Target scraping objective</label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={2}
                placeholder="e.g. Find product listings, their coupon prices and ratings"
                className="w-full text-xs font-sans border border-gray-200 rounded-lg p-2 bg-white focus:outline-hidden"
              />
            </div>

            <button
              onClick={handleRunGeminiQuery}
              disabled={isGeminiLoading || !objective.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 animate-bounce" />
              <span>{isGeminiLoading ? "AI analyzing DOM structure..." : "Generate AI Selectors"}</span>
            </button>

            {/* AI outcome display drawer */}
            {(geminiResult || geminiError) && (
              <div className="bg-white border border-indigo-100 rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto">
                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-100 font-medium">
                  <span className="text-indigo-600 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Gemini evaluation ready!</span>
                  </span>
                  
                  {geminiResult && (
                    <button
                      onClick={loadGeminiSelectorsToTest}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                    >
                      Fill In Testbed Selectors
                    </button>
                  )}
                </div>

                {geminiError ? (
                  <div className="text-red-650 text-xs font-mono flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{geminiError}</span>
                  </div>
                ) : (
                  <div className="space-y-3 font-sans text-xs text-gray-700 leading-relaxed">
                    {/* Class lists mapping table */}
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-150 font-mono text-[10px]">
                      <div>
                        <span className="text-slate-400 block uppercase">Wrapper Node:</span>
                        <span className="text-indigo-600 font-bold font-mono">{geminiResult.wrapperSelector}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase">Title Match:</span>
                        <span className="text-emerald-600 font-bold font-mono">{geminiResult.titleSelector}</span>
                      </div>
                      {geminiResult.subtitleSelector && (
                        <div>
                          <span className="text-slate-400 block uppercase">Subtitle/Label:</span>
                          <span className="text-amber-600 font-bold font-mono">{geminiResult.subtitleSelector}</span>
                        </div>
                      )}
                      {geminiResult.valueSelector && (
                        <div>
                          <span className="text-slate-400 block uppercase">Metric/Price:</span>
                          <span className="text-red-600 font-bold font-mono">{geminiResult.valueSelector}</span>
                        </div>
                      )}
                    </div>

                    {/* Explanations text block */}
                    <div>
                      <h5 className="font-semibold text-gray-900 border-b pb-0.5 mb-1 text-[11px] uppercase tracking-wide">AI Recommendation notes:</h5>
                      <p className="text-gray-600 text-xs leading-relaxed">{geminiResult.explanation}</p>
                    </div>

                    {/* Extracted python segments if exists */}
                    {geminiResult.pythonSnippet && (
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] text-gray-400 block uppercase">Generated BeautifulSoup rules:</span>
                        <pre className="p-2.5 bg-slate-900 text-slate-300 font-mono text-[9.5px] rounded-lg overflow-x-auto leading-relaxed max-h-40">
                          {geminiResult.pythonSnippet}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
