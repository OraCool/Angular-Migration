/**
 * Utilities exports
 */

export {
  parseNodeRequirements,
  compareVersions,
  isVersionCompatible,
  getCurrentNodeVersion,
  isNvmAvailable,
  getRecommendedNodeVersion,
  listNvmVersions,
  findBestMatch,
  switchNodeVersion,
} from './node-version.js';

export type { NodeVersionRequirement } from './node-version.js';
