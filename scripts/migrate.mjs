import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const STORIES_SRC = path.join(ROOT, 'content-source/Stories.md');
const ESSAYS_SRC  = path.join(ROOT, 'content-source/text.markdown');
const ESSAYS_OUT  = path.join(ROOT, 'src/content/essays');
const STORIES_OUT = path.join(ROOT, 'src/content/stories');
const QUOTES_OUT  = path.join(ROOT, 'src/content/quotes');

const report = { essays: [], stories: [], quotes: [], warnings: [] };

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(title) {
  return title
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')   // strip emoji
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function stripEmoji(str) {
  return str.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
}

// Extract date from common patterns in the text
function inferDate(text) {
  const patterns = [
    // "Created - July 24" or "Created July 24"
    /[Cc]reated\s*[-–]?\s*(\w+ \d{1,2}(?:,?\s*\d{4})?)/,
    // "Created - November 27, 2022"
    /[Cc]reated\s*[-–]?\s*(\w+ \d{1,2},\s*\d{4})/,
    // "May 2024" or "April 2024" as section headers
    /^(?:#{1,3}\s*)?(\w+ \d{4})\s*[🌦️🍂🔥]?$/m,
    // ISO-ish: "July 24"  → assume current year
    /(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s*\d{4})?)\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const raw = m[1].trim();
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        // If no year was captured, try appending current year
        const withYear = raw.match(/\d{4}/) ? d : new Date(raw + ', 2024');
        return isNaN(withYear.getTime()) ? null : withYear.toISOString().split('T')[0];
      }
    }
  }
  return null;
}

// Rewrite image paths from Stories.assets/ or assets/ → /images/...
function rewriteImagePaths(body) {
  return body
    .replace(/!\[([^\]]*)\]\(Stories\.assets\/([^)]+)\)/g, '![$1](/images/stories-assets/$2)')
    .replace(/!\[([^\]]*)\]\(assets\/([^)]+)\)/g, '![$1](/images/essays-assets/$2)');
}

// Extract standalone blockquote aphorisms (1–3 lines, no surrounding paragraph)
function extractQuotes(body, sourceSlug) {
  const extracted = [];
  // Match blockquotes that are short (1-3 lines) and look aphoristic
  const bqRe = /^>\s*(.+)$/gm;
  let match;
  while ((match = bqRe.exec(body)) !== null) {
    const text = match[1]
      .replace(/^[#*_`]+/, '').replace(/[#*_`]+$/, '')
      .trim();
    // Only take short ones (under 200 chars) that aren't headers or section markers
    if (
      text.length > 10 &&
      text.length < 200 &&
      !text.startsWith('#') &&
      !text.startsWith('!') &&
      !/^(PLOT|STORY|CONTEXT|MORAL|Moral|Personal jab)/.test(text)
    ) {
      extracted.push({ text, source: sourceSlug });
    }
  }
  return extracted;
}

// Write a markdown file with frontmatter
function writeMd(outDir, slug, frontmatter, body) {
  const fm = Object.entries(frontmatter)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (typeof v === 'string' && v.includes('\n')) return `${k}: |\n  ${v.replace(/\n/g, '\n  ')}`;
      if (typeof v === 'string') return `${k}: "${v.replace(/"/g, '\\"')}"`;
      if (Array.isArray(v)) return v.length === 0 ? `${k}: []` : `${k}:\n${v.map(i => `  - ${i}`).join('\n')}`;
      return `${k}: ${v}`;
    })
    .join('\n');

  const content = `---\n${fm}\n---\n\n${body.trim()}\n`;
  fs.writeFileSync(path.join(outDir, `${slug}.md`), content, 'utf8');
}

// ── Split a file into sections on top-level # headings ──────────────────────

function splitOnH1(raw) {
  const lines = raw.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (/^# /.test(line)) {
      if (current) sections.push(current);
      current = { title: line.replace(/^# /, '').trim(), body: '' };
    } else if (current) {
      current.body += line + '\n';
    }
  }
  if (current) sections.push(current);
  return sections;
}

// ── Migrate Stories ──────────────────────────────────────────────────────────

function migrateStories() {
  const raw = fs.readFileSync(STORIES_SRC, 'utf8');
  const sections = splitOnH1(raw);

  // Skip the first section which is just the file header "# Stories"
  const stories = sections.filter(s => {
    const slug = slugify(s.title);
    return slug && slug !== 'stories';
  });

  // Detect tradition from content
  function detectTradition(title, body) {
    const t = (title + body).toLowerCase();
    if (/rumi|sufi|دervish|faqir|merchant.*clown|crying circus/.test(t)) return 'sufi';
    if (/adam|noah|joseph|moses|harut|marut|prophet|god told|god said/.test(t)) return 'prophetic';
    if (/screenplay|ext\.|int\.|sheriff|inspector|priest/.test(t)) return 'screenplay';
    return 'original';
  }

  for (const s of stories) {
    const cleanTitle = stripEmoji(s.title);
    // Split native title if present (e.g. "Story of Adam - حکایت ادم")
    const dashIdx = cleanTitle.search(/\s[-–]\s[\u0600-\u06FF]/);
    const titleEn = dashIdx > -1 ? cleanTitle.slice(0, dashIdx).trim() : cleanTitle;
    const titleNative = dashIdx > -1 ? cleanTitle.slice(dashIdx + 3).trim() : undefined;

    const slug = slugify(titleEn);
    if (!slug) continue;

    const isInProgress = /IN PROGRESS/i.test(s.title);
    const date = inferDate(s.body);
    const tradition = detectTradition(cleanTitle, s.body);

    // Extract inspired-by
    let inspiredBy;
    const inspMatch = s.body.match(/inspired by\s+([^\n]+)/i);
    if (inspMatch) inspiredBy = inspMatch[1].replace(/[*_]/g, '').trim();

    const body = rewriteImagePaths(s.body)
      // Remove "Created ..." date lines that were inline headers
      .replace(/^>\s*#{1,4}\s*Created[^\n]*/gm, '')
      // Remove "IN PROGRESS" from body
      .replace(/^IN PROGRESS\s*-?\s*/im, '')
      // Remove the religion/category section headers that are just dividers
      .replace(/^>\s*#\s*(Religion and Spirituality|Story|Motivational Stories.*)\s*$/gm, '')
      .trim();

    const quotes = extractQuotes(body, slug);
    report.quotes.push(...quotes);

    if (!date) report.warnings.push(`[story] "${titleEn}" — no date found`);

    const frontmatter = {
      title: titleEn,
      ...(titleNative ? { titleNative } : {}),
      date: date || '2024-01-01',
      status: isInProgress ? 'in-progress' : 'complete',
      tradition,
      ...(inspiredBy ? { inspiredBy } : {}),
      draft: false,
    };

    writeMd(STORIES_OUT, slug, frontmatter, body);
    report.stories.push({ slug, title: titleEn, date, tradition });
  }
}

// ── Migrate Essays ───────────────────────────────────────────────────────────

// Essays to skip (about page, file header, link sections)
const SKIP_TITLES = new Set([
  'the truth', 'the truth - حقیقت', 'who am i', 'who am i and why i am doing it'
]);

// Infer category from content
function inferCategory(title, body) {
  const t = (title + body).toLowerCase();
  if (/satir|clown|circus|dog.*lion|lion.*dog|bones.*throne/.test(t)) return 'satire';
  if (/god|spiritual|subconscious|soul|scripture|scripture|divine/.test(t)) return 'philosophy';
  if (/personal|myself|my life|my journey|my homie|i was/.test(t)) return 'personal';
  return 'observation';
}

function migrateEssays() {
  const raw = fs.readFileSync(ESSAYS_SRC, 'utf8');
  const sections = splitOnH1(raw);

  for (const s of sections) {
    const cleanTitle = stripEmoji(s.title);
    const slug = slugify(cleanTitle);
    if (!slug) continue;

    // Skip file header and about page (will be built as static page)
    const normalised = cleanTitle.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    if (SKIP_TITLES.has(normalised)) continue;

    // Skip if body is essentially empty (just links or one liner)
    const bodyText = s.body.replace(/>\s*.*\n/g, '').replace(/\[.*\]\(.*\)/g, '').trim();
    if (bodyText.length < 100) {
      report.warnings.push(`[essay] "${cleanTitle}" — body too short, skipped`);
      continue;
    }

    const date = inferDate(s.body);
    const category = inferCategory(cleanTitle, s.body);

    const body = rewriteImagePaths(s.body)
      // Remove month/year section banners like "> ### May 2024 🌦️"
      .replace(/^>\s*#{1,3}\s*\w+ \d{4}[^\n]*/gm, '')
      // Remove bare Substack/external links
      .replace(/^https?:\/\/[^\s\n]+$/gm, '')
      .trim();

    const quotes = extractQuotes(body, slug);
    report.quotes.push(...quotes);

    if (!date) report.warnings.push(`[essay] "${cleanTitle}" — no date found`);

    const frontmatter = {
      title: cleanTitle,
      date: date || '2024-01-01',
      category,
      tags: [],
      draft: false,
    };

    writeMd(ESSAYS_OUT, slug, frontmatter, body);
    report.essays.push({ slug, title: cleanTitle, date, category });
  }
}

// ── Write Quotes ─────────────────────────────────────────────────────────────

function writeQuotes() {
  // Deduplicate by text
  const seen = new Set();
  const unique = report.quotes.filter(q => {
    if (seen.has(q.text)) return false;
    seen.add(q.text);
    return true;
  });

  unique.forEach((q, i) => {
    const filename = `quote-${String(i + 1).padStart(3, '0')}.json`;
    fs.writeFileSync(
      path.join(QUOTES_OUT, filename),
      JSON.stringify(q, null, 2),
      'utf8'
    );
  });

  report.quotes = unique;
}

// ── Run ──────────────────────────────────────────────────────────────────────

migrateStories();
migrateEssays();
writeQuotes();

console.log('\n── Migration Report ──────────────────────────────────────────\n');
console.log(`  Essays:  ${report.essays.length}`);
report.essays.forEach(e => console.log(`    [${e.date || 'NO DATE'}] ${e.slug} (${e.category})`));

console.log(`\n  Stories: ${report.stories.length}`);
report.stories.forEach(s => console.log(`    [${s.date || 'NO DATE'}] ${s.slug} (${s.tradition})`));

console.log(`\n  Quotes:  ${report.quotes.length}`);

if (report.warnings.length) {
  console.log(`\n  Warnings (${report.warnings.length}):`);
  report.warnings.forEach(w => console.log(`    ⚠  ${w}`));
}

console.log('\n──────────────────────────────────────────────────────────────\n');
