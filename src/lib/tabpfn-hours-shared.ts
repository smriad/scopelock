import type { ChangeOrderFeatures } from "./tabpfn-hours";

export function featuresToRow(f: ChangeOrderFeatures) {
  return [
    f.oauthProvider ? 1 : 0,
    f.rushDeadlineDays,
    f.integrationCount,
    f.scopeCreepMessages,
  ].join(",");
}
