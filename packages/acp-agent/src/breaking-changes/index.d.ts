/**
 * Breaking Changes Fixers
 *
 * TypeScript implementations of breaking changes fixes for Angular migrations.
 * Cross-platform compatible (Windows, macOS, Linux).
 */
export { fixAngular15BreakingChanges } from './fix-angular-15';
export { fixAngular16BreakingChanges } from './fix-angular-16';
export { fixAngular17BreakingChanges } from './fix-angular-17';
export { fixAngular19BreakingChanges } from './fix-angular-19';
export { fixAngular20BreakingChanges } from './fix-angular-20';
export interface FixResult {
    success: boolean;
    message: string;
    details: string[];
    warnings: string[];
    errors: string[];
}
export type BreakingChangesFixer = (projectPath: string) => Promise<FixResult>;
//# sourceMappingURL=index.d.ts.map