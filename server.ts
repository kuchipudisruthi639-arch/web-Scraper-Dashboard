import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";
import alasql from "alasql";
import { fileURLToPath } from "url";
import { SANDBOX_PAGES } from "./src/data/sandboxHtml.js";
import { DatabaseState, ScraperTask, ScraperRun, ExtractedItem } from "./src/types.js";

// Utility for ESM __dirname equivalence
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE_PATH = path.join(process.cwd(), "scraper_db.json");

// Safe helper to build the AI SDK
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Initial robust seed data representable of historic scrapes
const SEED_SCRAPERS: ScraperTask[] = [
  {
    id: "apex-jobs",
    name: "Apex Startup Careers",
    url: "https://sandbox.apexjobs.io",
    category: "jobs",
    schedule: "everyHour",
    wrapperSelector: ".job-card",
    titleSelector: ".job-title",
    subtitleSelector: ".company-name",
    linkSelector: "a.apply-btn",
    valueSelector: ".salary-tag",
    targetCount: 6,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "g-prices",
    name: "MacroGadget Price Deals",
    url: "https://sandbox.macrogadget.com",
    category: "prices",
    schedule: "every6Hours",
    wrapperSelector: ".product-item",
    titleSelector: ".product-title",
    subtitleSelector: ".category-badge",
    linkSelector: "a.p-link",
    valueSelector: ".current-price",
    targetCount: 6,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "tc-news",
    name: "Hacker Community TechChronicle",
    url: "https://sandbox.techchronicle.org",
    category: "news",
    schedule: "manual",
    wrapperSelector: ".story-row",
    titleSelector: ".story-title",
    subtitleSelector: ".author",
    linkSelector: "a.story-title",
    valueSelector: ".score",
    targetCount: 5,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  }
];

const SEED_RUNS: ScraperRun[] = [
  {
    id: "run-jobs-1",
    scraperId: "apex-jobs",
    scraperName: "Apex Startup Careers",
    status: "success",
    durationMs: 840,
    itemsCount: 6,
    runTime: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "run-prices-1",
    scraperId: "g-prices",
    scraperName: "MacroGadget Price Deals",
    status: "success",
    durationMs: 620,
    itemsCount: 6,
    runTime: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "run-news-1",
    scraperId: "tc-news",
    scraperName: "Hacker Community TechChronicle",
    status: "success",
    durationMs: 410,
    itemsCount: 5,
    runTime: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  }
];

const SEED_ITEMS: ExtractedItem[] = [
  // Job Seed Items
  {
    id: "item-j1",
    runId: "run-jobs-1",
    scraperId: "apex-jobs",
    title: "Senior Full-Stack Engineer (React & Go)",
    subtitle: "StripeFlow Technologies",
    link: "https://sandbox.apexjobs.io/jobs/senior-full-stack",
    value: 145000,
    category: "Engineering",
    scrapedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-j2",
    runId: "run-jobs-1",
    scraperId: "apex-jobs",
    title: "Staff AI Safety Researcher",
    subtitle: "Cognitive Mind Labs",
    link: "https://sandbox.apexjobs.io/jobs/staff-ai-safety",
    value: 210000,
    category: "Engineering",
    scrapedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-j3",
    runId: "run-jobs-1",
    scraperId: "apex-jobs",
    title: "Lead Product Designer (B2B SaaS)",
    subtitle: "LogiSaaS Automation",
    link: "https://sandbox.apexjobs.io/jobs/lead-product-designer",
    value: 115000,
    category: "Design",
    scrapedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-j4",
    runId: "run-jobs-1",
    scraperId: "apex-jobs",
    title: "Infrastructure Engineer (Kubernetes & AWS)",
    subtitle: "OrbitCloud Networks",
    link: "https://sandbox.apexjobs.io/jobs/inf-k8s-aws",
    value: 130000,
    category: "Engineering",
    scrapedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-j5",
    runId: "run-jobs-1",
    scraperId: "apex-jobs",
    title: "Lead Growth Marketing Manager",
    subtitle: "VibeCheck Labs",
    link: "https://sandbox.apexjobs.io/jobs/lead-growth-marketing",
    value: 95000,
    category: "Marketing",
    scrapedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-j6",
    runId: "run-jobs-1",
    scraperId: "apex-jobs",
    title: "Junior Developer Relations Engineer",
    subtitle: "SupaBaseFlow",
    link: "https://sandbox.apexjobs.io/jobs/junior-devrel-eng",
    value: 85000,
    category: "Engineering",
    scrapedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },

  // E-commerce Seed Items
  {
    id: "item-p1",
    runId: "run-prices-1",
    scraperId: "g-prices",
    title: "NextPixel Pro 15 Ultra",
    subtitle: "Phones",
    link: "https://sandbox.macrogadget.com/item/nextpixel-15",
    value: 899.99,
    category: "Phones",
    scrapedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-p2",
    runId: "run-prices-1",
    scraperId: "g-prices",
    title: "StudioPure Active Noise ANC Headphones",
    subtitle: "Audio",
    link: "https://sandbox.macrogadget.com/item/studiopure-anc",
    value: 189.50,
    category: "Audio",
    scrapedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-p3",
    runId: "run-prices-1",
    scraperId: "g-prices",
    title: "AeroFit Smart Watch Series X",
    subtitle: "Wearables",
    link: "https://sandbox.macrogadget.com/item/aerofit-watch-x",
    value: 320.00,
    category: "Wearables",
    scrapedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-p4",
    runId: "run-prices-1",
    scraperId: "g-prices",
    title: "SwiftBook Elite Air 14.5\" M3",
    subtitle: "Laptops",
    link: "https://sandbox.macrogadget.com/item/swiftbook-elite",
    value: 1249.99,
    category: "Laptops",
    scrapedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-p5",
    runId: "run-prices-1",
    scraperId: "g-prices",
    title: "TurboVolt 6-in-1 Compact GaN Charger",
    subtitle: "Accessories",
    link: "https://sandbox.macrogadget.com/item/turbovolt-gan-6in1",
    value: 45.00,
    category: "Accessories",
    scrapedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-p6",
    runId: "run-prices-1",
    scraperId: "g-prices",
    title: "BassBuds Pro Waterproof Earbuds",
    subtitle: "Audio",
    link: "https://sandbox.macrogadget.com/item/bassbuds-pro",
    value: 69.99,
    category: "Audio",
    scrapedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },

  // News Seed Items
  {
    id: "item-n1",
    runId: "run-news-1",
    scraperId: "tc-news",
    title: "Show TC: Pure JS Headless Parser for Extremely Hostile Bots",
    subtitle: "dan_abramov",
    link: "https://github.com/microsoft/playwright",
    value: 428,
    category: "Show TC",
    scrapedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-n2",
    runId: "run-news-1",
    scraperId: "tc-news",
    title: "Stable Room-Temperature Superconductor Achieved via High-Friction Squeezing",
    subtitle: "marie_curie_9",
    link: "https://blogs.nature.com/molecular-reactors",
    value: 311,
    category: "Physics",
    scrapedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-n3",
    runId: "run-news-1",
    scraperId: "tc-news",
    title: "SQLite compiles to 12KB WebAssembly with full WAL support",
    subtitle: "drh_sql",
    link: "https://sqlite.org/wasm/2026-release",
    value: 516,
    category: "Databases",
    scrapedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-n4",
    runId: "run-news-1",
    scraperId: "tc-news",
    title: "How the V8 team optimized Generator Unwinding by 35%",
    subtitle: "v8_fanatic",
    link: "https://v8.dev/blog/unwinding-generators",
    value: 189,
    category: "Compilers",
    scrapedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-n5",
    runId: "run-news-1",
    scraperId: "tc-news",
    title: "Rust Edition 2027 draft proposes type-level lifetime generators",
    subtitle: "steve_klabnik",
    link: "https://blog.rust-lang.org/edition2027",
    value: 253,
    category: "Languages",
    scrapedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  }
];

// Helper to load or initialize the mock DB state
function loadDatabaseState(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, "utf8");
      return JSON.parse(raw) as DatabaseState;
    }
  } catch (error) {
    console.error("Failed to read database file, seeding instead:", error);
  }

  // Seed file
  const state: DatabaseState = {
    scrapers: SEED_SCRAPERS,
    runs: SEED_RUNS,
    items: SEED_ITEMS,
  };
  saveDatabaseState(state);
  return state;
}

function saveDatabaseState(state: DatabaseState) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write to database file:", error);
  }
}

// Synchronizes alaSQL memory structure with local state before execution
function syncStateToAlasql(state: DatabaseState) {
  alasql("DROP TABLE IF EXISTS scrapers");
  alasql("DROP TABLE IF EXISTS runs");
  alasql("DROP TABLE IF EXISTS items");

  alasql("CREATE TABLE scrapers");
  alasql("CREATE TABLE runs");
  alasql("CREATE TABLE items");

  alasql.tables.scrapers.data = [...state.scrapers];
  alasql.tables.runs.data = [...state.runs];
  alasql.tables.items.data = [...state.items];
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Load state
  let dbState = loadDatabaseState();

  // API - Get Scrapers
  app.get("/api/scrapers", (req, res) => {
    res.json(dbState.scrapers);
  });

  // API - Create Scraper task
  app.post("/api/scrapers", (req, res) => {
    const { name, url, category, schedule, wrapperSelector, titleSelector, subtitleSelector, linkSelector, valueSelector } = req.body;
    
    if (!name || !url || !wrapperSelector || !titleSelector) {
      return res.status(400).json({ error: "Missing required scraper parameters" });
    }

    const newTask: ScraperTask = {
      id: "sc-" + Date.now().toString(36),
      name,
      url,
      category: category || "custom",
      schedule: schedule || "manual",
      wrapperSelector,
      titleSelector,
      subtitleSelector: subtitleSelector || "",
      linkSelector: linkSelector || "",
      valueSelector: valueSelector || "",
      targetCount: 10,
      createdAt: new Date().toISOString()
    };

    dbState.scrapers.push(newTask);
    saveDatabaseState(dbState);
    res.status(201).json(newTask);
  });

  // API - Delete Scraper
  app.delete("/api/scrapers/:id", (req, res) => {
    const { id } = req.params;
    dbState.scrapers = dbState.scrapers.filter(s => s.id !== id);
    dbState.items = dbState.items.filter(i => i.scraperId !== id);
    dbState.runs = dbState.runs.filter(r => r.scraperId !== id);
    saveDatabaseState(dbState);
    res.json({ success: true });
  });

  // API - Get Runs history
  app.get("/api/runs", (req, res) => {
    res.json(dbState.runs);
  });

  // API - Get Extracted database items
  app.get("/api/items", (req, res) => {
    res.json(dbState.items);
  });

  // API - Run Scraper Immediately (Cheerio Extraction + Load pipeline)
  app.post("/api/scrapers/:id/run", async (req, res) => {
    const { id } = req.params;
    const scraper = dbState.scrapers.find(s => s.id === id);
    if (!scraper) {
      return res.status(404).json({ error: "Scraper task not found" });
    }

    const startTime = Date.now();
    const runId = "run-" + Date.now().toString(36);
    
    let htmlContent = "";
    let finalUrl = scraper.url;

    // Check if the link matches our Sandbox domains
    if (scraper.url.includes("apexjobs.io") || scraper.category === "jobs") {
      htmlContent = SANDBOX_PAGES.jobs.html;
      finalUrl = "https://sandbox.apexjobs.io";
    } else if (scraper.url.includes("macrogadget.com") || scraper.category === "prices") {
      htmlContent = SANDBOX_PAGES.prices.html;
      finalUrl = "https://sandbox.macrogadget.com";
    } else if (scraper.url.includes("techchronicle.org") || scraper.category === "news") {
      htmlContent = SANDBOX_PAGES.news.html;
      finalUrl = "https://sandbox.techchronicle.org";
    } else {
      // Live URL fetch fallback
      try {
        console.log(`Attempting live scrape of: ${scraper.url}`);
        const response = await fetch(scraper.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          signal: AbortSignal.timeout(6000)
        });
        if (response.ok) {
          htmlContent = await response.text();
        } else {
          throw new Error(`HTTP Error ${response.status}`);
        }
      } catch (err: any) {
        // Fallback gracefully to prevent blockies
        console.warn(`Fallback to simulation for ${scraper.url} due to: ${err.message}`);
        // Let's grab the best matching categories sandbox
        const catStr = scraper.category as string;
        if (catStr === "prices") {
          htmlContent = SANDBOX_PAGES.prices.html;
        } else if (catStr === "news") {
          htmlContent = SANDBOX_PAGES.news.html;
        } else {
          htmlContent = SANDBOX_PAGES.jobs.html;
        }
      }
    }

    try {
      const $ = cheerio.load(htmlContent);
      const elements = $(scraper.wrapperSelector);
      const extractedList: ExtractedItem[] = [];

      elements.each((index, element) => {
        const titleText = $(element).find(scraper.titleSelector).first().text().trim();
        if (!titleText) return; // skip empty headers

        // Extracted features
        const subtitleText = scraper.subtitleSelector 
          ? $(element).find(scraper.subtitleSelector).first().text().trim()
          : "";

        let linkHref = scraper.linkSelector
          ? $(element).find(scraper.linkSelector).first().attr("href") || ""
          : "";
        
        // Resolve href relativity
        if (linkHref && !linkHref.startsWith("http")) {
          linkHref = new URL(linkHref, finalUrl).toString();
        }

        const rawValue = scraper.valueSelector 
          ? $(element).find(scraper.valueSelector).first().text().trim()
          : "";

        // Transform/clean numerical values automatically (BeautifulSoup ETL style)
        let cleanValue: string | number = rawValue;
        if (rawValue) {
          // Standard regex cleanup: e.g. "$145,000" -> 145000, "516 points" -> 516
          const stripped = rawValue.replace(/[$,\s]/g, "");
          const matchNumber = stripped.match(/[\d.]+/);
          if (matchNumber) {
            cleanValue = Number(matchNumber[0]);
          }
        }

        extractedList.push({
          id: "item-" + Math.random().toString(36).substring(2, 7) + "-" + index,
          runId,
          scraperId: scraper.id,
          title: titleText,
          subtitle: subtitleText,
          link: linkHref || finalUrl,
          value: cleanValue,
          category: scraper.category === "jobs" ? subtitleText : (scraper.category === "prices" ? subtitleText : "Articles"),
          scrapedAt: new Date().toISOString()
        });
      });

      const newRun: ScraperRun = {
        id: runId,
        scraperId: scraper.id,
        scraperName: scraper.name,
        status: "success",
        durationMs: Date.now() - startTime,
        itemsCount: extractedList.length,
        runTime: new Date().toISOString()
      };

      // Load into State
      dbState.runs.unshift(newRun);
      dbState.items = [...extractedList, ...dbState.items];

      // Keep database size healthy
      if (dbState.items.length > 500) {
        dbState.items = dbState.items.slice(0, 500);
      }
      if (dbState.runs.length > 100) {
        dbState.runs = dbState.runs.slice(0, 100);
      }

      saveDatabaseState(dbState);
      res.json({
        run: newRun,
        items: extractedList
      });

    } catch (err: any) {
      const failedRun: ScraperRun = {
        id: runId,
        scraperId: scraper.id,
        scraperName: scraper.name,
        status: "failed",
        durationMs: Date.now() - startTime,
        itemsCount: 0,
        runTime: new Date().toISOString(),
        errorMessage: err.message || "Failed to parse page elements"
      };
      
      dbState.runs.unshift(failedRun);
      saveDatabaseState(dbState);

      res.status(500).json({
        error: "Scraper execution failed",
        run: failedRun
      });
    }
  });

  // GET API to fetch details about sandbox URLs (helps testing selector combinations)
  app.get("/api/sandbox/pages", (req, res) => {
    res.json(SANDBOX_PAGES);
  });

  // POST API to run temporary selector extraction experiments without writing to DB
  app.post("/api/scrape/test", (req, res) => {
    const { url, category, wrapperSelector, titleSelector, subtitleSelector, linkSelector, valueSelector } = req.body;

    if (!wrapperSelector || !titleSelector) {
      return res.status(400).json({ error: "Wrapper and Title selectors are required" });
    }

    let htmlContent = "";
    let finalUrl = url || "https://sandbox.apexjobs.io";

    // Match appropriate sandbox content
    if (finalUrl.includes("macrogadget.com") || category === "prices") {
      htmlContent = SANDBOX_PAGES.prices.html;
    } else if (finalUrl.includes("techchronicle.org") || category === "news") {
      htmlContent = SANDBOX_PAGES.news.html;
    } else {
      htmlContent = SANDBOX_PAGES.jobs.html;
    }

    try {
      const $ = cheerio.load(htmlContent);
      const elements = $(wrapperSelector);
      const results: any[] = [];

      elements.each((index, el) => {
        const title = $(el).find(titleSelector).first().text().trim();
        const subtitle = subtitleSelector ? $(el).find(subtitleSelector).first().text().trim() : "";
        const href = linkSelector ? $(el).find(linkSelector).first().attr("href") || "" : "";
        const rawVal = valueSelector ? $(el).find(valueSelector).first().text().trim() : "";

        let parsedVal: string | number = rawVal;
        if (rawVal) {
          const stripped = rawVal.replace(/[$,\s]/g, "");
          const numMatch = stripped.match(/[\d.]+/);
          if (numMatch) {
            parsedVal = Number(numMatch[0]);
          }
        }

        results.push({
          index,
          title: title || "[NOT FOUND]",
          subtitle: subtitle || "[NOT FOUND]",
          link: href || "[NOT FOUND]",
          value: parsedVal || "[NOT FOUND]"
        });
      });

      res.json({
        wrapperCount: elements.length,
        items: results
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API - Execute interactive SQL queries
  app.post("/api/sql", (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "SQL Query is required" });
    }

    try {
      // Sync fresh records to alaSQL in-memory engine
      syncStateToAlasql(dbState);

      // Execute query using alasql
      const results = alasql(query);
      res.json({
        success: true,
        query,
        results
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "SQL Syntax Error"
      });
    }
  });

  // API - Gemini Selector Assistant (AI Selector extraction advisor)
  app.post("/api/gemini/suggest-selectors", async (req, res) => {
    const { htmlSegment, objective } = req.body;

    if (!htmlSegment) {
      return res.status(400).json({ error: "HTML segment is required to assist suggestion." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Graceful local heuristical fallback if API key is not present
      console.log("No Gemini API key available - running local heuristics advisor");
      
      const suggestedWrapper = htmlSegment.includes("job-card") ? ".job-card" : (htmlSegment.includes("product-item") ? ".product-item" : (htmlSegment.includes("story-row") ? ".story-row" : "div"));
      const suggestedTitle = htmlSegment.includes("job-title") ? ".job-title" : (htmlSegment.includes("product-title") ? ".product-title" : (htmlSegment.includes("story-title") ? ".story-title" : "h3, h4, a"));
      const suggestedSubtitle = htmlSegment.includes("company-name") ? ".company-name" : (htmlSegment.includes("category-badge") ? ".category-badge" : (htmlSegment.includes("author") ? ".author" : "span"));
      const suggestedValue = htmlSegment.includes("salary-tag") ? ".salary-tag" : (htmlSegment.includes("current-price") ? ".current-price" : (htmlSegment.includes("score") ? ".score" : "span"));

      return res.json({
        wrapperSelector: suggestedWrapper,
        titleSelector: suggestedTitle,
        subtitleSelector: suggestedSubtitle,
        valueSelector: suggestedValue,
        explanation: "Running in **Local Sandbox Mode** (No API Key set under Secrets). The assistant used structure matching and class heuristic maps of typical job lists, products, and news timelines to derive these classes. Connect your key to unlock live AI selection reasoning!",
        pythonSnippet: `# Local Heuristics Snippet\nimport requests\nfrom bs4 import BeautifulSoup\n\n# Scrape the page\nhtml = """${htmlSegment.slice(0, 300)}..."""\nsoup = BeautifulSoup(html, 'html.parser')\nitems = soup.select('${suggestedWrapper}')\nfor item in items:\n    title = item.select_one('${suggestedTitle}').text.strip()\n    print(title)`
      });
    }

    try {
      const prompt = `You are a professional Python BeautifulSoup scraping bot designer.
Given this HTML snippet representing a target webpage:
\`\`\`html
${htmlSegment}
\`\`\`

Objective to Scrape: ${objective || "Extract rows representing names, details, links, and price/values and metrics."}

Task: Output a precise CSS selector mapping to feed into BeautifulSoup (select/select_one) or Cheerio ($) queries.
You must output a JSON object strictly conforming to this schema (do NOT markdown wrap the JSON, or if you do, only output valid raw JSON keys inside the text block):
{
  "wrapperSelector": "CSS selector to find each item card/row",
  "titleSelector": "CSS selector INSIDE the wrapper to extract the primary text (title)",
  "subtitleSelector": "CSS selector INSIDE the wrapper to extract secondary info (e.g. author, label, company)",
  "linkSelector": "CSS selector / tag name inside wrapper to find application detail 'href'",
  "valueSelector": "CSS selector inside the wrapper finding prices, scores, or ratings",
  "explanation": "A concise explanation of why you selected these nodes and how the ETL parsing operates.",
  "pythonSnippet": "A snippet of clean Python code utilizing requests, BeautifulSoup (bs4), and sqlite3 to model this scrape"
}

Provide extremely clean, robust class-based or tag-based selectors preferring highly targeted classes.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const cleanedJson = JSON.parse(text);
      res.json(cleanedJson);

    } catch (err: any) {
      res.status(500).json({ error: "Gemini query failed: " + err.message });
    }
  });

  // Serve static assets & client routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully active on port ${PORT}`);
  });
}

startServer();
