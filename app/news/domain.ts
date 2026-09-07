export const defaultDispatchDomain = "shark-app-pqh5h.ondigitalocean.app";
export function isDispatchHost(host: string | null, configured = process.env.ROBOT_DISPATCH_DOMAIN ?? defaultDispatchDomain): boolean {
  if (!host || !configured) return false;
  const domain = configured.trim().toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) || domain.length > 253) return false;
  // Exact matching prevents a lookalike or arbitrary Host header selecting a site.
  const requested = host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  return requested === domain || requested === `www.${domain}`;
}

export function dispatchHref(host: string | null, configured = process.env.ROBOT_DISPATCH_DOMAIN ?? defaultDispatchDomain): string {
  if (host?.includes("localhost") || host?.startsWith("127.0.0.1")) return "/news";
  if (!isDispatchHost(configured, configured)) return "/news";
  return isDispatchHost(host, configured) ? "/" : `https://${configured.trim().toLowerCase()}/`;
}
