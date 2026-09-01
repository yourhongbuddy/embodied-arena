export const LOCAL_ONLY_ANALYTICS_PATHS=["/experiments/assignment-lab","/experiments/design-lab","/experiments/registration-lab","/experiments/decision-lab"]as const;
export function isLocalOnlyAnalyticsPath(path:unknown){return typeof path==="string"&&LOCAL_ONLY_ANALYTICS_PATHS.some(localPath=>path===localPath||path.startsWith(`${localPath}/`))}
