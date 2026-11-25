// Bakes static JSON and syncs identity across the portfolio from portfolio.config.json.
// Usage:
//   node scripts/build-data.mjs                 # offline mode: applies portfolio.config.json using sample/existing GitHub stats
//   node scripts/build-data.mjs --fetch-github  # online mode: also fetches live GitHub stats, calendar & code wall via `gh` CLI
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "portfolio.config.json"), "utf8"));
const FETCH_GH = process.argv.includes("--fetch-github");

const ID = CONFIG.identity;
const OWNER = ID.github;
const now = new Date();
const iso = now.toISOString();
const YEAR = now.getUTCFullYear();
const TODAY = iso.slice(0, 10);

const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const readJson = (file) => JSON.parse(read(file));
const write = (file, value) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), typeof value === "string" ? value : JSON.stringify(value, null, 1));
  console.log("wrote", file);
};
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
const wrap = (text, width = 76) => {
  const out = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line + " " + word).trim().length > width) {
      out.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) out.push(line);
  return out;
};

// ---------- 1. Sync HTML / JS / SVG identity ----------
function syncIdentity() {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const domain = esc(ID.domain);
  const tagline = esc(ID.tagline);
  const ghUrl = `https://github.com/${encodeURIComponent(OWNER)}`;
  const barTitle = esc(ID.barTitle || ID.name.toUpperCase());

  // favicon.svg
  let fav = read("favicon.svg");
  fav = fav.replace(/<title>[^<]*<\/title>/, `<title>${domain}</title>`);
  write("favicon.svg", fav);

  // index.html
  let idx = read("index.html");
  idx = idx
    .replace(/<title>[^<]*<\/title>/, `<title>${domain}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${domain} — a quiet wall of code. ${tagline}">`)
    .replace(/(<a class="brand"[^>]*>.*?<span>)[^<]*(<\/span><\/a>)/s, `$1${domain}$2`)
    .replace(/<a href="https:\/\/github\.com\/[^"]*" rel="me">github<\/a>/, `<a href="${ghUrl}" rel="me">github</a>`)
    .replace(/<h1 class="sr-only">[^<]*<\/h1>/, `<h1 class="sr-only">${domain} — ${tagline}</h1>`)
    .replace(/<p class="note" aria-hidden="true">\/\/ [^<]*<\/p>/, `<p class="note" aria-hidden="true">// ${tagline}</p>`);
  write("index.html", idx);

  // site/index.html
  let sIdx = read("site/index.html");
  sIdx = sIdx
    .replace(/<title>[^<]*<\/title>/, `<title>${domain}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${domain} — work, projects, talks and themes, opened in an editor.">`)
    .replace(/(<a class="brand"[^>]*>.*?<span>)[^<]*(<\/span><\/a>)/s, `$1${domain}$2`)
    .replace(/<a href="https:\/\/github\.com\/[^"]*" rel="me">github<\/a>/, `<a href="${ghUrl}" rel="me">github</a>`)
    .replace(/<h1 class="sr-only">[^<]*<\/h1>/, `<h1 class="sr-only">${domain} — work, projects, talks and themes.</h1>`)
    .replace(/<span class="bar-title">[^<]*<\/span>/, `<span class="bar-title">${barTitle}</span>`);
  write("site/index.html", sIdx);

  // glimpse.js
  let glimpse = read("glimpse.js");
  glimpse = glimpse.replace(/const NOTE_TEXT = "[^"]*";/, `const NOTE_TEXT = "// ${ID.tagline.replace(/"/g, '\\"')}";`);
  write("glimpse.js", glimpse);

  // site/terminal.js
  let term = read("site/terminal.js");
  term = term
    .replace(/return \[\["[^"]*", "t-user"\], \["@dev", "t-host"\]/, `return [[${JSON.stringify(ID.terminalUser || "dev")}, "t-user"], ["@dev", "t-host"]`)
    .replace(/item\.owner !== "[^"]*"/, `item.owner !== ${JSON.stringify(OWNER)}`);
  write("site/terminal.js", term);

  // site/editor.js
  const prefix = ID.storagePrefix || "portfolio";
  let ed = read("site/editor.js");
  ed = ed
    .replace(/const THEME_KEY = "[^"]*";/, `const THEME_KEY = "${prefix}.scheme";`)
    .replace(/const WORM_KEY = "[^"]*";/, `const WORM_KEY = "${prefix}.worm";`);
  write("site/editor.js", ed);
}

syncIdentity();

// ---------- 2. Themes ----------
const mixHex = (a, b, t) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");
const T = (name, description, light, bg, fg, accent, kw, str, num, fn, type, comment) => ({
  name,
  description,
  light,
  bg,
  fg,
  accent,
  kinds: { keyword: kw, string: str, number: num, function: fn, type, comment, text: fg, ident: mixHex(fg, kw, 0.3), member: fn, punct: mixHex(fg, bg, 0.45) },
});
const THEME_DEFS = [
  T("Blackmoney", "Warm paper on near-black", false, "#0b0b0a", "#ebe6db", "#e7c58a", "#7fd1a0", "#e6c37a", "#f0885b", "#8fd0ee", "#c9a0e8", "#7a766a"),
  T("Paper", "Light, ink on cream", true, "#f6f2e9", "#1d1c1a", "#b4532a", "#2f6f4f", "#8a5a1a", "#b4532a", "#2c5d8a", "#5a4a8a", "#8c887c"),
  T("Sora", "Cool steel and teal", false, "#0b1015", "#d9e4ee", "#4cc9f0", "#4cc9f0", "#a9d6e5", "#ffa94d", "#9fb4ff", "#6ee7b7", "#56687a"),
  T("Circuit", "Board green, phosphor on black", false, "#07110c", "#d3f0dd", "#3ddc84", "#3ddc84", "#ffd166", "#ff8f70", "#59c3f0", "#c792ea", "#4d6b5a"),
  T("Amber", "Warm amber on ink", false, "#0e0c08", "#f1e6cc", "#f7931a", "#f7931a", "#e8d9a0", "#ff7a59", "#ffcf6b", "#9ad1d4", "#7a6a4a"),
  T("Indigo", "Violet on deep indigo", false, "#0d0b14", "#e2dcf2", "#a97bff", "#a97bff", "#c7b8f0", "#ff9ecb", "#8fb2ff", "#7ad9d0", "#665f80"),
  T("Crimson", "Warm terracotta and charcoal", false, "#140a0a", "#f4e3d0", "#ff8f1f", "#ff8f1f", "#e8c39e", "#ffd27a", "#7fd1c8", "#e08a96", "#7a5a52"),
  T("Slate", "Neutral graphite", false, "#111214", "#d6d8dc", "#9aa5b1", "#9ab0c4", "#b9c4b0", "#d3a37a", "#c4b8d6", "#a3c4c0", "#666b73"),
];
const shade = (hex, f) =>
  "#" + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f))).toString(16).padStart(2, "0")).join("");
const palettes = THEME_DEFS.map((t) => ({
  ...t,
  cursorline: shade(t.bg, t.light ? 0.96 : 1.5),
  ansi: [t.bg, t.kinds.keyword, t.kinds.string, t.kinds.number, t.kinds.function, t.kinds.type, t.accent, t.fg, t.kinds.comment, t.kinds.keyword, t.kinds.string, t.kinds.number, t.kinds.function, t.kinds.type, t.accent, t.fg],
  color1: t.kinds.keyword,
}));
const themes = palettes.map((t) => ({
  slug: slug(t.name),
  name: t.name,
  description: t.description,
  image: `/site/assets/themes/${slug(t.name)}.svg`,
  palette: t.ansi.slice(0, 8),
  repo: `https://github.com/${OWNER}`,
  included: true,
  source: "built-in palette",
}));
for (const t of palettes) {
  const k = t.kinds;
  const row = (y, w, c) => `<rect x="14" y="${y}" width="${w}" height="5" rx="2" fill="${c}" opacity=".9"/>`;
  write(
    `site/assets/themes/${slug(t.name)}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect width="160" height="100" fill="${t.bg}"/><rect y="0" width="160" height="9" fill="${t.cursorline}"/>${row(18, 50, k.keyword)}${row(30, 90, k.string)}${row(42, 36, k.function)}${row(54, 70, t.fg)}${row(66, 28, k.number)}${row(78, 100, k.comment)}<rect x="130" y="30" width="16" height="16" rx="3" fill="${t.accent}"/></svg>`
  );
}

// ---------- 3. GitHub helpers (only used with --fetch-github) ----------
const gh = (...args) => JSON.parse(execFileSync("gh", ["api", ...args], { encoding: "utf8", maxBuffer: 1 << 28 }));
const ghTry = (...args) => { try { return gh(...args); } catch { return null; } };
const ghRaw = (url) => execFileSync("gh", ["api", url, "-H", "Accept: application/vnd.github.raw"], { encoding: "utf8", maxBuffer: 1 << 26 });
const gql = (query) => gh("graphql", "-f", `query=${query}`).data;

function repoFacts(full) {
  if (!FETCH_GH || !full) return {};
  const r = ghTry(`repos/${full}`);
  if (!r) return {};
  let commits = null;
  try {
    const out = execFileSync("gh", ["api", `repos/${full}/commits?per_page=1`, "--include"], { encoding: "utf8", maxBuffer: 1 << 24 });
    const m = out.match(/page=(\d+)>; rel="last"/i);
    commits = m ? Number(m[1]) : 1;
  } catch {}
  const tree = ghTry(`repos/${full}/git/trees/${r.default_branch}?recursive=1`);
  return {
    stars: r.stargazers_count,
    forks: r.forks_count,
    watchers: r.subscribers_count ?? r.watchers_count,
    issues: r.open_issues_count,
    license: r.license?.spdx_id ?? null,
    language: r.language,
    pushed: r.pushed_at.slice(0, 10),
    created: r.created_at.slice(0, 10),
    branch: r.default_branch,
    commits,
    files: tree?.tree?.filter((n) => n.type === "blob").length ?? null,
  };
}

// ---------- 4. Projects ----------
const MORE = [];
const projects = CONFIG.projects.map((p) => {
  const id = slug(p.name);
  if (p.more) MORE.push(id);
  const full = p.githubRepo || (p.url?.startsWith("https://github.com/") ? p.url.replace("https://github.com/", "").replace(/\/$/, "") : null);
  const facts = repoFacts(full);
  const images = (p.shots || []).map((s, i) => ({
    file: s.startsWith("shots/") ? s : `shots/${path.basename(s)}`,
    source: s,
    alt: `${p.name} screenshot ${i + 1}`,
    xray: false,
  }));
  const lines = [
    `# ${p.name}`,
    "",
    ...images.slice(0, 1).map((_, i) => `\u0001IMG${i}\u0001`),
    "",
    `### ${p.desc}`,
    "",
    ...wrap(p.long || p.desc),
    "",
    ...(p.stack?.length ? ["Built with " + p.stack.join(" · "), ""] : []),
    ...images.slice(1).flatMap((_, i) => [`\u0001IMG${i + 1}\u0001`, ""]),
    ...(p.url ? [`[Visit](${p.url})`] : []),
    ...(p.links || []).map((l) => `[${l.label}](${l.url})`),
  ];
  return {
    repo: id,
    url: p.url || null,
    description: p.desc,
    tag: p.tag || null,
    stars: facts.stars ?? p.stars ?? null,
    language: facts.language ?? p.stack?.[0] ?? null,
    pushed: facts.pushed ?? null,
    forks: facts.forks ?? null,
    watchers: facts.watchers ?? null,
    issues: facts.issues ?? null,
    license: facts.license ?? null,
    created: facts.created ?? null,
    branch: facts.branch ?? "main",
    commits: facts.commits ?? null,
    files: facts.files ?? null,
    counts: {},
    github: full ? `https://github.com/${full}` : null,
    stack: p.stack || [],
    images,
    lines,
  };
});

// ---------- 5. GitHub Stats, Months, Wall ----------
const ICON_SLUG = { "C#": "csharp", "C++": "cplusplus", HTML: "html5", "Jupyter Notebook": "jupyter", "Objective-C": "apple", Shell: "gnubash", Vue: "vuedotjs", "Next.js": "nextdotjs", "Node.js": "nodedotjs", "React Native": "react", "Socket.io": "socketdotio", Rails: "rubyonrails", "Three.js": "threedotjs", Vercel: "vercel", Android: "android", Flutter: "flutter", PostgreSQL: "postgresql", Prisma: "prisma", Express: "express", React: "react", "Vanilla JS": "javascript", "Canvas 2D": "html5" };
const iconCache = new Map();
async function icon(name) {
  const s = ICON_SLUG[name] || name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (iconCache.has(s)) return iconCache.get(s);
  let out = null;
  try {
    const r = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/${s}.svg`);
    if (r.ok) {
      const m = (await r.text()).match(/<path d="([^"]+)"/);
      if (m) out = { slug: s, path: m[1] };
    }
  } catch {}
  iconCache.set(s, out);
  return out;
}

if (FETCH_GH) {
  const owned = gh("--paginate", `users/${OWNER}/repos?per_page=100&type=owner`).filter((r) => !r.fork);
  const langBytes = new Map();
  for (const r of owned.slice(0, 80)) {
    const l = ghTry(`repos/${r.full_name}/languages`) || {};
    for (const [name, bytes] of Object.entries(l)) {
      const e = langBytes.get(name) || { name, bytes: 0, repos: 0 };
      e.bytes += bytes;
      e.repos += 1;
      langBytes.set(name, e);
    }
  }
  const totalBytes = [...langBytes.values()].reduce((s, l) => s + l.bytes, 0) || 1;
  const languages = [];
  for (const l of [...langBytes.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 12)) {
    languages.push({ ...l, share: l.bytes / totalBytes, icon: await icon(l.name) });
  }
  const toolCount = new Map();
  for (const p of CONFIG.projects) for (const s of p.stack || []) toolCount.set(s, (toolCount.get(s) || 0) + 1);
  const tools = [];
  for (const [name, repos] of [...toolCount].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 18)) {
    tools.push({ name, repos, via: ["projects"], icon: await icon(name) });
  }
  const site = [];
  for (const s of CONFIG.siteStack || []) site.push({ ...s, icon: await icon(s.name) });
  write("site/stack.json", { fetchedAt: iso, owner: OWNER, repos: Math.min(owned.length, 80), languages, tools, ai: [], site, source: "GitHub languages API + project stacks" });

  const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const cal = gql(`{user(login:"${OWNER}"){followers{totalCount} contributionsCollection(from:"${YEAR}-01-01T00:00:00Z",to:"${iso}"){contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`).user;
  const days = cal.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays).filter((d) => d.date <= TODAY).map((d) => ({ date: d.date, count: d.contributionCount, level: LEVEL[d.contributionLevel] ?? 0 }));
  const starRepos = owned.filter((r) => r.stargazers_count > 0).sort((a, b) => b.stargazers_count - a.stargazers_count);
  const ownStars = starRepos.reduce((s, r) => s + r.stargazers_count, 0);
  const snapshot = {
    account: OWNER,
    followers: cal.followers.totalCount,
    profile: `https://github.com/${OWNER}`,
    stars: { total: ownStars, own: ownStars, marketplace: 0, repositoryCount: owned.length, scope: "Public owned non-fork repositories", repositories: starRepos.map((r) => ({ name: r.full_name, url: r.html_url, stars: r.stargazers_count, extra: false })) },
    contributions: { from: `${YEAR}-01-01`, to: TODAY, year: YEAR, total: cal.contributionsCollection.contributionCalendar.totalContributions, source: "GitHub GraphQL contributionCalendar", days },
    sources: ["GitHub REST + GraphQL via gh"],
    fetchedAt: iso,
  };
  write("github-snapshot.json", snapshot);

  const months = [];
  for (let m = 0; m <= now.getUTCMonth(); m++) {
    const from = new Date(Date.UTC(YEAR, m, 1)).toISOString();
    const to = new Date(Math.min(Date.UTC(YEAR, m + 1, 1) - 1, now.getTime())).toISOString();
    const r = gql(`{user(login:"${OWNER}"){contributionsCollection(from:"${from}",to:"${to}"){commitContributionsByRepository(maxRepositories:5){repository{name owner{login}} contributions{totalCount}}}}}`).user.contributionsCollection.commitContributionsByRepository;
    months.push({ month: from.slice(0, 7), top: r.map((x) => ({ repo: x.repository.name, owner: x.repository.owner.login, commits: x.contributions.totalCount })) });
  }
  write("site/months.json", { from: snapshot.contributions.from, to: TODAY, fetchedAt: iso, scope: "GitHub-attributed public commit contributions per repository and month", months });

  const LANG = { ts: "js", tsx: "js", js: "js", jsx: "js", mjs: "js", rs: "rust", go: "c", cs: "c", kt: "c", java: "c", rb: "ruby", py: "python" };
  const wallRepos = CONFIG.wallRepos?.length ? CONFIG.wallRepos : owned.slice(0, 5).map((r) => [r.full_name, 2]);
  const files = [];
  for (const [full, n] of wallRepos) {
    const r = ghTry(`repos/${full}`);
    if (!r) continue;
    const tree = ghTry(`repos/${full}/git/trees/${r.default_branch}?recursive=1`)?.tree || [];
    const pick = tree.filter((f) => f.type === "blob" && LANG[f.path.split(".").pop()] && f.size > 800 && f.size < 8000 && !/test|spec|mock|node_modules|dist|vendor|\.min\.|generated/i.test(f.path)).slice(0, n);
    for (const f of pick) {
      const text = ghRaw(`repos/${full}/git/blobs/${f.sha}`);
      files.push({ repo: full.split("/")[1], path: f.path, sha: f.sha, lang: LANG[f.path.split(".").pop()], firstLine: 1, url: `https://github.com/${full}/blob/${f.sha}/${f.path}`, lines: text.replace(/\t/g, "  ").split("\n").slice(0, 80).map((l) => l.replace(/\s+$/, "")) });
    }
  }
  const wallThemes = palettes.map((t) => ({ name: slug(t.name), light: t.light, source: "built-in palette", accent: t.accent, bg: t.bg, fg: t.fg, selection: t.accent, selectionText: t.bg, kinds: t.kinds, cursorline: t.cursorline }));
  if (files.length) {
    write("wall.json", { files, themes: wallThemes });
    write("wall.txt", files.flatMap((f) => f.lines).filter(Boolean).join("\n"));
  }
} else {
  // Offline mode: update wall.json themes + keep existing/sample code wall
  const wall = readJson("wall.json");
  wall.themes = palettes.map((t) => ({ name: slug(t.name), light: t.light, source: "built-in palette", accent: t.accent, bg: t.bg, fg: t.fg, selection: t.accent, selectionText: t.bg, kinds: t.kinds, cursorline: t.cursorline }));
  write("wall.json", wall);
}

// ---------- 6. content.json & themes.json ----------
const aboutLines = [
  `# ${ID.name}`,
  "",
  CONFIG.about.bio,
  ...(CONFIG.about.extra ? ["", CONFIG.about.extra] : []),
  "",
  ...CONFIG.links.filter((l) => !l.url.startsWith("mailto:")).map((l) => `[${l.label}](${l.url})`),
];
const about = { repo: OWNER, lines: aboutLines };
const themeThumbs = Object.fromEntries(themes.map((t) => [t.slug, `assets/themes/${t.slug}.svg`]));
write("site/content.json", {
  owner: OWNER,
  fetchedAt: iso,
  about,
  projects,
  palettes,
  themeStats: {},
  themeThumbs,
  work: CONFIG.work || [],
  talks: CONFIG.talks || [],
  links: CONFIG.links || [],
  more: MORE,
});
write("themes.json", { source: "built-in palettes", snapshot: TODAY, themes });
console.log(`done (${FETCH_GH ? "online" : "offline"}): ${projects.length} projects, ${themes.length} themes`);
