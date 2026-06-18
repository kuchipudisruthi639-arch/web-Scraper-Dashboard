import { useState, useMemo } from "react";
import { ScraperTask } from "../types.js";
import { Copy, Check, Download, Code, PlayCircle, Terminal, FileCode } from "lucide-react";

interface PythonGeneratorProps {
  scrapers: ScraperTask[];
}

export default function PythonGenerator({ scrapers }: PythonGeneratorProps) {
  const [selectedScraperId, setSelectedScraperId] = useState<string>(scrapers[0]?.id || "custom");
  const [copied, setCopied] = useState(false);

  const selectedScraper = useMemo(() => {
    return scrapers.find(s => s.id === selectedScraperId) || {
      name: "Custom Web Pipeline",
      url: "https://example.com/items",
      category: "custom",
      wrapperSelector: ".item-row",
      titleSelector: ".title-class",
      subtitleSelector: ".meta-class",
      valueSelector: ".price-class",
      linkSelector: "a.link-class",
      id: "custom"
    };
  }, [scrapers, selectedScraperId]);

  const generatedCode = useMemo(() => {
    const s = selectedScraper;
    
    // Determine category specific numeric parsing to render realistic Python parsing
    let cleanSnippet = "";
    if (s.category === "jobs") {
      cleanSnippet = `# Cleans salary figures, e.g. "$145,000" -> 145000
    cleaned_val = 0
    if raw_val:
        digits = ''.join(c for c in raw_val if c.isdigit() or c == '.')
        cleaned_val = float(digits) if '.' in digits else (int(digits) if digits else 0)`;
    } else if (s.category === "prices") {
      cleanSnippet = `# Cleans dollar pricing, e.g. "$899.99" -> 899.99
    cleaned_val = 0.0
    if raw_val:
        digits = ''.join(c for c in raw_val if c.isdigit() or c == '.')
        cleaned_val = float(digits) if digits else 0.0`;
    } else {
      cleanSnippet = `# Cleans points/scores count, e.g. "428 points" -> 428
    cleaned_val = 0
    if raw_val:
        digits = ''.join(c for c in raw_val if c.isdigit())
        cleaned_val = int(digits) if digits else 0`;
    }

    return `"""
====================================================================
  BeatifulSoup + SQLite + Streamlit ETL Pipeline Automation Script
  Generated dynamically for: ${s.name}
====================================================================

Requires libraries:
  $ pip install requests beautifulsoup4 streamlit pandas

Usage:
  1. Boot database and parse pages:
     $ python scrapers_pipeline.py run
  2. Launch visual dashboard:
     $ streamlit run scrapers_pipeline.py
"""

import os
import sys
import sqlite3
import requests
import pandas as pd
import streamlit as st
from datetime import datetime
from bs4 import BeautifulSoup

DB_FILE = 'scrapers_sqlite.db'
TARGET_URL = '${s.url}'

def init_database():
    """Create local SQLite tables conforming to relational dashboard schema"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. Create items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scraped_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            subtitle TEXT,
            link TEXT,
            extracted_value REAL,
            scraped_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

def extract_and_load():
    """BeautifulSoup Scraper and SQLite ETL loader pipeline"""
    print(f"[*] Starting Scraper ETL for: {TARGET_URL}...")
    init_database()
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(TARGET_URL, headers=headers, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"[!] Extraction failure: Network error - {e}")
        return
        
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract item card wrappers
    cards = soup.select('${s.wrapperSelector}')
    print(f"[*] HTML nodes matching wrapper select_all('${s.wrapperSelector}'): {len(cards)}")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    items_added = 0
    for card in cards:
        try:
            # Title extraction
            title_node = card.select_one('${s.titleSelector}')
            if not title_node:
                continue
            title = title_node.text.strip()
            
            # Optional attributes
            subtitle = ""
            if '${s.subtitleSelector}':
                sub_node = card.select_one('${s.subtitleSelector}')
                subtitle = sub_node.text.strip() if sub_node else ""
                
            link = ""
            if '${s.linkSelector}':
                link_node = card.select_one('${s.linkSelector}')
                link = link_node.get('href', '') if link_node else ""
                if link and not link.startswith('http'):
                    from urllib.parse import urljoin
                    link = urljoin(TARGET_URL, link)
            
            raw_val = ""
            if '${s.valueSelector}':
                val_node = card.select_one('${s.valueSelector}')
                raw_val = val_node.text.strip() if val_node else ""
                
            ${cleanSnippet}
            
            # Load into SQLite relational table
            cursor.execute('''
                INSERT INTO scraped_items (title, subtitle, link, extracted_value, scraped_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (title, subtitle, link, cleaned_val, datetime.now().isoformat()))
            items_added += 1
            
        except Exception as err:
            print(f"[!] Transform mismatch: Skipping item card details due to error: {err}")
            
    conn.commit()
    conn.close()
    print(f"[+] Loaded successfully! {items_added} rows written into SQLite '{DB_FILE}'")

def render_streamlit_dashboard():
    """Streamlit Visual Dashboard showing charts & raw records"""
    st.set_page_config(page_title="Scraper Metrics Dashboard", layout="wide")
    
    st.title("📊 Web Scraper & SQL Metrics Dashboard")
    st.write("Dynamic dashboard visualizing ETL runs extracted from **BeautifulSoup & sqlite3**.")
    
    # Check if database has rows
    if not os.path.exists(DB_FILE):
        st.warning("⚠️ SQLite database not created yet. Put some rows in by running the scraper pipeline CLI first!")
        if st.button("▶️ Execute Scraper Load"):
            extract_and_load()
            st.rerun()
        return

    # Load Database into Pandas Dataframe
    conn = sqlite3.connect(DB_FILE)
    df = pd.read_sql_query("SELECT * FROM scraped_items ORDER BY scraped_at DESC", conn)
    conn.close()
    
    if df.empty:
        st.info("ℹ️ Database is empty. Execute Scrape ETL above to load metrics.")
        return

    # 1. Total KPI counters
    col1, col2, col3 = st.columns(3)
    col1.metric("Total Extracted Rows", len(df))
    col2.metric("Average Numeric Metric", f"\${df['extracted_value'].mean():,.2f}" if df['extracted_value'].max() > 1000 else f"{df['extracted_value'].mean():.1f}")
    col3.metric("Latest Load Scrape", df['scraped_at'].max().split('T')[0] if len(df) > 0 else "N/A")

    # 2. Recharts equivalent streamlits charts
    st.subheader("📈 Scrape Trend Visualizations")
    chart_tab, data_tab = st.tabs(["Trends & Distribution", "Browse SQL Rows"])
    
    with chart_tab:
        col_c1, col_c2 = st.columns(2)
        with col_c1:
            st.write("**Extracted Metric Breakdown (by Group/Category)**")
            if 'subtitle' in df.columns and len(df) > 0:
                cat_summary = df.groupby('subtitle')['extracted_value'].mean().reset_index()
                st.bar_chart(data=cat_summary, x='subtitle', y='extracted_value')
        
        with col_c2:
            st.write("**Metric value load history timeline**")
            st.line_chart(data=df, x='scraped_at', y='extracted_value')
            
    with data_tab:
        st.write("**Current SQLite Tables Records**")
        st.dataframe(df, use_container_width=True)

if __name__ == '__main__':
    # CLI Router command dispatcher
    if len(sys.argv) > 1 and sys.argv[1] == 'run':
        extract_and_load()
    else:
        render_streamlit_dashboard()
`;
  }, [selectedScraper]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scrapers_pipeline.py";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Selector sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-orange-500" />
            <span>Select Target Base</span>
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Choose a scheduled target to compile custom Python requests, BeautifulSoup, and sqlite3 relational setup code blocks.
          </p>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Crawl pipeline TARGET</label>
            <select
              value={selectedScraperId}
              onChange={(e) => setSelectedScraperId(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-white focus:outline-hidden text-gray-700"
            >
              {scrapers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="custom">Generic Scraper Blueprint</option>
            </select>
          </div>
        </div>

        {/* Local installation guides */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3">
          <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wide">Quick local launch</h4>
          
          <div className="space-y-2 text-xs text-gray-500 font-mono">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold mb-1">1. Install requirements</p>
              <pre className="p-1.5 bg-gray-50 text-[10px] text-gray-700 border rounded select-all">
                pip install requests beautifulsoup4 streamlit pandas
              </pre>
            </div>

            <div>
              <p className="text-[10px] text-gray-400 font-semibold mb-1">2. Run crawler load</p>
              <pre className="p-1.5 bg-gray-50 text-[10px] text-gray-700 border rounded select-all">
                python scrapers_pipeline.py run
              </pre>
            </div>

            <div>
              <p className="text-[10px] text-gray-400 font-semibold mb-1">3. Start streamlit app</p>
              <pre className="p-1.5 bg-gray-50 text-[10px] text-gray-700 border rounded select-all">
                streamlit run scrapers_pipeline.py
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Code Editor block */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-slate-900 border border-slate-950 rounded-2xl shadow-md overflow-hidden">
          {/* Editor header bar */}
          <div className="bg-slate-950 px-4 py-3 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center space-x-2 text-slate-100">
              <FileCode className="w-4 h-4 text-orange-400" />
              <span className="font-mono text-xs font-semibold">scrapers_pipeline.py</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>

              <button
                onClick={downloadFile}
                className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .py</span>
              </button>
            </div>
          </div>

          {/* Scrolling text script */}
          <div className="p-1 max-h-[500px] overflow-y-auto">
            <pre className="p-4 text-slate-300 font-mono text-[11px] leading-relaxed select-text overflow-x-auto whitespace-pre">
              {generatedCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
