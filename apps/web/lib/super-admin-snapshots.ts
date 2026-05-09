import 'server-only';

/**
 * Fetch /api/super-admin/snapshot from each registered instance, in parallel.
 * Used by the super-admin portal to render a cross-instance overview.
 */

export interface InstanceSnapshot {
  ok: boolean;
  /** Slug from the SUPER_ADMIN_INSTANCES env-var entry (display label). */
  slug: string;
  /** Public URL of the instance — useful for "open this site's admin" links. */
  url: string;
  /** Site config metadata returned by the instance, when reachable. */
  site?: {
    slug: string;
    siteName: string;
    platformName: string;
  };
  capturedAt?: string;
  counts?: {
    pendingVendors: number;
    approvedVendors: number;
    pendingRiders: number;
    approvedRiders: number;
    pendingCampaigns: number;
    pendingChanges: number;
    activeOrders: number;
    todayPlaced: number;
    todayDeliveredCount: number;
    totalCustomers: number;
  };
  todayGmvInr?: number;
  recentActivity?: Array<{
    id: string;
    actorRole: string;
    actorName: string;
    action: string;
    summary: string;
    createdAt: string;
  }>;
  /** Set when fetch failed — tells the UI which row to grey out. */
  error?: string;
}

interface InstanceConfig {
  slug: string;
  url: string;
}

/**
 * Parses SUPER_ADMIN_INSTANCES env var: comma-separated `slug=url` pairs.
 * Example:
 *   SUPER_ADMIN_INSTANCES=magarpatta=https://web-eta-ebon-80.vercel.app,amanora=https://amanora-go.vercel.app
 */
export function parseInstanceList(): InstanceConfig[] {
  const raw = process.env.SUPER_ADMIN_INSTANCES?.trim() ?? '';
  if (!raw) return [];
  return raw.split(',').map((entry) => {
    const [slug, url] = entry.split('=').map((s) => s.trim());
    return { slug, url };
  }).filter((e) => e.slug && e.url);
}

export async function fetchInstanceSnapshot(cfg: InstanceConfig): Promise<InstanceSnapshot> {
  const secret = process.env.SUPER_ADMIN_SHARED_SECRET ?? '';
  if (!secret) {
    return { ok: false, slug: cfg.slug, url: cfg.url, error: 'SUPER_ADMIN_SHARED_SECRET not set on this deployment' };
  }
  try {
    const res = await fetch(`${cfg.url}/api/super-admin/snapshot`, {
      headers: { Authorization: `Bearer ${secret}` },
      // Each pull goes through Vercel's edge — no Next.js cache; we want fresh.
      cache: 'no-store',
      // Don't hang the dashboard if one instance is slow.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { ok: false, slug: cfg.slug, url: cfg.url, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    if (!json.ok) {
      return { ok: false, slug: cfg.slug, url: cfg.url, error: json.error ?? 'snapshot returned ok:false' };
    }
    return {
      ok: true,
      slug: cfg.slug,
      url: cfg.url,
      site: json.site,
      capturedAt: json.capturedAt,
      counts: json.counts,
      todayGmvInr: json.todayGmvInr,
      recentActivity: json.recentActivity,
    };
  } catch (e) {
    return { ok: false, slug: cfg.slug, url: cfg.url, error: (e as Error).message };
  }
}

export async function fetchAllSnapshots(): Promise<InstanceSnapshot[]> {
  const list = parseInstanceList();
  if (list.length === 0) return [];
  return Promise.all(list.map(fetchInstanceSnapshot));
}

export async function fetchSnapshotBySlug(slug: string): Promise<InstanceSnapshot | null> {
  const cfg = parseInstanceList().find((e) => e.slug === slug);
  if (!cfg) return null;
  return fetchInstanceSnapshot(cfg);
}
