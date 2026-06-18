export interface ScraperTask {
  id: string;
  name: string;
  url: string;
  category: 'jobs' | 'prices' | 'news' | 'custom';
  schedule: 'everyHour' | 'every6Hours' | 'everyDay' | 'manual';
  wrapperSelector: string;
  titleSelector: string;
  subtitleSelector: string;
  linkSelector: string;
  valueSelector: string; // Used for price, salary, or score
  targetCount: number;
  createdAt: string;
}

export interface ScraperRun {
  id: string;
  scraperId: string;
  scraperName: string;
  status: 'success' | 'failed';
  durationMs: number;
  itemsCount: number;
  runTime: string;
  errorMessage?: string;
}

export interface ExtractedItem {
  id: string;
  runId: string;
  scraperId: string;
  title: string;
  subtitle: string; // e.g. company, description, or site domain
  link: string;
  value: string | number; // numerical values parse into charts nicely
  category: string;
  scrapedAt: string;
}

export interface DatabaseState {
  scrapers: ScraperTask[];
  runs: ScraperRun[];
  items: ExtractedItem[];
}
