import fs from "node:fs";

const TZ = "Asia/Shanghai";

export function getRetentionDays() {
  const n = Number(process.env.RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60;
}

/** @returns {string} YYYY-MM-DD in Asia/Shanghai */
export function todayShanghai(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseYmd(ymd) {
  return new Date(`${ymd}T12:00:00+08:00`);
}

/** Calendar days from `dateYmd` to `todayYmd` (0 = same day). */
export function dayAge(dateYmd, todayYmd) {
  const d = parseYmd(dateYmd);
  const t = parseYmd(todayYmd);
  return Math.floor((t - d) / 86_400_000);
}

export function isWithinRetention(dateYmd, todayYmd, retentionDays = getRetentionDays()) {
  return dayAge(dateYmd, todayYmd) <= retentionDays;
}

export function isExpired(dateYmd, todayYmd, retentionDays = getRetentionDays()) {
  return dayAge(dateYmd, todayYmd) > retentionDays;
}

export function discoverContentDates(contentDir) {
  if (!fs.existsSync(contentDir)) return [];
  const dates = new Set();
  for (const f of fs.readdirSync(contentDir)) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})-items\.json$/);
    if (m) dates.add(m[1]);
  }
  return [...dates].sort((a, b) => b.localeCompare(a));
}