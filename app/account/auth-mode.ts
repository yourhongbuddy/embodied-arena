// Only the Sites build may trust identity headers injected by Sites dispatch.
// Never enable this for a directly reachable Node/DigitalOcean server.
declare const __SITES_DISPATCH_AUTH__: boolean;

export function sitesAuthEnabled(): boolean {
  return typeof __SITES_DISPATCH_AUTH__ !== "undefined" && __SITES_DISPATCH_AUTH__;
}
