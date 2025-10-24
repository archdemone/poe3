import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

interface KeywordData {
  id: string;
  name: string;
  description: string;
  relatedKeywords: string[];
}

async function scrapeKeywordsData(): Promise<KeywordData[]> {
  console.log('[Scraper] Attempting to scrape POE2DB keywords data from https://poe2db.tw/us/Keywords');

  try {
    const url = 'https://poe2db.tw/us/Keywords';
    console.log(`[Scraper] Fetching data from ${url}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('[Scraper] Successfully fetched POE2DB keywords page. Parsing HTML...');

    // Save the HTML to a file for analysis
    const debugFile = path.join(process.cwd(), 'poe2db_keywords_page.html');
    fs.writeFileSync(debugFile, html);
    console.log(`[Scraper] Saved HTML to ${debugFile} for analysis`);

    const keywords: KeywordData[] = [];

    // Each keyword is in a div with class structure like:
    // <div class="flex-grow-1 ms-2">
    //   <a href="Physical_Damage" class="strong fontinSmallCaps">Physical Damage</a>
    //   <div class="fontinRegular">Description...</div>
    // </div>

    $('.flex-grow-1.ms-2').each((index, element) => {
      const $keywordDiv = $(element);
      const $link = $keywordDiv.find('a.strong.fontinSmallCaps');
      const $description = $keywordDiv.find('div.fontinRegular');

      if ($link.length && $description.length) {
        const name = $link.text().trim();
        const href = $link.attr('href') || '';
        const rawDescription = $description.html() || '';

        // Extract related keywords from the description
        const relatedKeywords: string[] = [];
        $description.find('a.KeywordPopups').each((_, link) => {
          const keywordName = $(link).text().trim();
          if (keywordName && !relatedKeywords.includes(keywordName)) {
            relatedKeywords.push(keywordName);
          }
        });

        // Clean up the description by removing the data-hover attributes and converting links
        const cleanDescription = rawDescription
          .replace(/data-hover="[^"]*"/g, '')
          .replace(/class="[^"]*"/g, '')
          .replace(/<a([^>]*)>([^<]*)<\/a>/g, '$2')
          .replace(/\s+/g, ' ')
          .trim();

        const keyword: KeywordData = {
          id: href.replace('/', '').toLowerCase().replace(/\s+/g, '_'),
          name: name,
          description: cleanDescription,
          relatedKeywords: relatedKeywords
        };

        keywords.push(keyword);
        console.log(`[Scraper] Extracted keyword: ${name} (${relatedKeywords.length} related keywords)`);
      }
    });

    console.log(`[Scraper] Successfully extracted ${keywords.length} keywords from POE2DB`);

    return keywords;

  } catch (error) {
    console.error('[Scraper] Error scraping POE2DB keywords:', error);
    console.log('[Scraper] Could not fetch or parse the POE2DB keywords page');
    return [];
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('PoE2DB Keywords Scraper');
  console.log('='.repeat(60));

  const charCreateDataDir = path.join(process.cwd(), '..', 'src', 'features', 'characterCreation', 'data');

  // Ensure data directory exists
  if (!fs.existsSync(charCreateDataDir)) {
    fs.mkdirSync(charCreateDataDir, { recursive: true });
  }

  const keywords = await scrapeKeywordsData();

  // Write keywords data
  const keywordsPath = path.join(charCreateDataDir, 'keywords.json');
  fs.writeFileSync(keywordsPath, JSON.stringify(keywords, null, 2));
  console.log(`[Scraper] ✓ Updated keywords data: ${keywordsPath}`);

  console.log(`[Scraper] ✓ Successfully updated ${keywords.length} keywords`);
  console.log('='.repeat(60));
  console.log('[Scraper] Complete');
}

main().catch(err => {
  console.error('[Scraper] Fatal error:', err);
  process.exit(1);
});
