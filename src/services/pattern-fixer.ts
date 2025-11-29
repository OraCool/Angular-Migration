/**
 * Pattern-based automatic fixes for common migration errors
 * These are fast, deterministic fixes that don't require LLM
 */

export interface PatternFix {
  name: string;
  description: string;
  detect: (error: string, context?: any) => boolean;
  fix: (projectRoot: string, error: string) => Promise<string[]>; // Returns commands to execute
}

export const PATTERN_FIXES: PatternFix[] = [
  {
    name: 'fix-schematics-not-supported',
    description: 'Fix "does not support schematics" error by verifying Angular version and reinstalling',
    detect: (error) => /does not support schematics|Package.*was found but does not support schematics/i.test(error),
    fix: async (projectRoot) => [
      // Check current Angular version
      `cd ${projectRoot} && npx ng version`,
      
      // The issue is often that the previous upgrade didn't complete properly
      // Force reinstall of all Angular packages at latest compatible version
      `cd ${projectRoot} && npm install @angular/core@latest @angular/cli@latest @angular/compiler-cli@latest --save-dev --legacy-peer-deps --force`,
      
      // Clear all caches
      `rm -rf ${projectRoot}/.angular ${projectRoot}/node_modules/.cache`,
      `npm cache clean --force`,
      
      // Reinstall all dependencies
      `cd ${projectRoot} && npm install --legacy-peer-deps`,
    ],
  },
  
  {
    name: 'fix-peer-dependency-v15',
    description: 'Fix peer dependency conflicts when upgrading to Angular 15',
    detect: (error) => /incompatible peer dependency|requires a peer.*would install|ts\.getDecorators is not a function/i.test(error),
    fix: async (projectRoot) => [
      // 1. Synchronize Angular CDK/Material with Core version (downgrade if needed)
      `cd ${projectRoot} && npm install @angular/cdk@14.2.7 @angular/material@14.2.7 @angular/material-moment-adapter@14.2.7 --save --legacy-peer-deps`,
      
      // 2. Upgrade ngx-graph to version with relaxed peer deps
      `cd ${projectRoot} && npm install @swimlane/ngx-graph@8.4.0 --save --legacy-peer-deps`,
      
      // 3. Verify synchronized versions
      `cd ${projectRoot} && npm list @angular/core @angular/cdk @angular/material --depth=0`,
    ],
  },
  
  {
    name: 'fix-polyfills-v15',
    description: 'Fix polyfills configuration for Angular 15',
    detect: (error) => /polyfills.*missing from.*TypeScript compilation|polyfills.*must be.*string|Data path.*polyfills/i.test(error),
    fix: async (projectRoot) => [
      // 1. Ensure polyfills.ts exists
      `test -f ${projectRoot}/src/polyfills.ts || echo "// Angular polyfills for IE11 and other browsers\\n" > ${projectRoot}/src/polyfills.ts`,
      
      // 2. Update angular.json to use polyfills array format
      `node -e "const fs=require('fs');const p='${projectRoot}/angular.json';const c=JSON.parse(fs.readFileSync(p,'utf8'));const proj=Object.keys(c.projects)[0];const opts=c.projects[proj].architect.build.options;if(typeof opts.polyfills==='string'||!opts.polyfills){opts.polyfills=['src/polyfills.ts'];}fs.writeFileSync(p,JSON.stringify(c,null,2));"`,
      
      // 3. Add to tsconfig.app.json AND tsconfig.spec.json files array (tests need it too!)
      `node -e "const fs=require('fs');const p='${projectRoot}/tsconfig.app.json';if(fs.existsSync(p)){const c=JSON.parse(fs.readFileSync(p,'utf8'));if(!c.files)c.files=[];if(!c.files.includes('src/polyfills.ts'))c.files.push('src/polyfills.ts');fs.writeFileSync(p,JSON.stringify(c,null,2));}}"`,
      `node -e "const fs=require('fs');const p='${projectRoot}/tsconfig.spec.json';if(fs.existsSync(p)){const c=JSON.parse(fs.readFileSync(p,'utf8'));if(!c.files)c.files=[];if(!c.files.includes('src/polyfills.ts'))c.files.push('src/polyfills.ts');fs.writeFileSync(p,JSON.stringify(c,null,2));}}"`,
    ],
  },
  
  {
    name: 'fix-test-constructor-args',
    description: 'Fix test spec files with missing constructor arguments',
    detect: (error) => /Expected \d+ arguments?, but got 0|An argument for.*was not provided/i.test(error),
    fix: async (projectRoot) => [
      // Extract the file path from error if available
      `find ${projectRoot}/src -name "*.spec.ts" -type f -print0 | xargs -0 sed -i '' -E 's/new ([A-Z][a-zA-Z]*Directive)\\(\\)/new \\1(null as any, null as any, null as any)/g' 2>/dev/null || true`,
      
      // Fix pipe specs - they need TestBed
      `find ${projectRoot}/src -name "*pipe.spec.ts" -type f -print0 | xargs -0 sed -i '' -E 's/new ([A-Z][a-zA-Z]*Pipe)\\(\\)/TestBed.inject(\\1)/g' 2>/dev/null || true`,
    ],
  },
  
  {
    name: 'fix-material-chips-v15',
    description: 'Migrate Material chips API from v14 to v15+ (mat-chip-list → mat-chip-set)',
    detect: (error) => /mat-chip-list.*is not a known element|mat-chip-list.*not.*Angular component|mat-chip-list.*not.*part of this module/i.test(error),
    fix: async (projectRoot) => [
      // Replace mat-chip-list with mat-chip-set (for display/input chips)
      `find ${projectRoot}/src -type f \\( -name "*.html" -o -name "*.component.html" \\) -print0 | xargs -0 sed -i '' 's/<mat-chip-list/<mat-chip-set/g' 2>/dev/null || true`,
      `find ${projectRoot}/src -type f \\( -name "*.html" -o -name "*.component.html" \\) -print0 | xargs -0 sed -i '' 's/<\\/mat-chip-list>/<\\/mat-chip-set>/g' 2>/dev/null || true`,
      
      // Update template references: #chipList → #chipSet
      `find ${projectRoot}/src -type f \\( -name "*.html" -o -name "*.component.html" \\) -print0 | xargs -0 sed -i '' 's/mat-chip-set #chipList/mat-chip-set #chipSet/g' 2>/dev/null || true`,
      
      // Update TypeScript references to match
      `find ${projectRoot}/src -type f -name "*.ts" -print0 | xargs -0 sed -i '' 's/@ViewChild.*chipList.*MatChipList/@ViewChild("chipSet") chipSet!: MatChipSet/g' 2>/dev/null || true`,
      `find ${projectRoot}/src -type f -name "*.ts" -print0 | xargs -0 sed -i '' 's/chipList\\./chipSet./g' 2>/dev/null || true`,
      
      // Update matChipInputFor references
      `find ${projectRoot}/src -type f \\( -name "*.html" -o -name "*.component.html" \\) -print0 | xargs -0 sed -i '' 's/\\[matChipInputFor\\]="chipList"/[matChipInputFor]="chipSet"/g' 2>/dev/null || true`,
    ],
  },
  
  {
    name: 'clear-cache-module-not-found',
    description: 'Clear build cache for module resolution errors',
    detect: (error) => /Cannot find module|Module not found|ENOENT.*node_modules/i.test(error),
    fix: async (projectRoot) => [
      `rm -rf ${projectRoot}/node_modules ${projectRoot}/.angular ${projectRoot}/dist`,
      `cd ${projectRoot} && npm install --legacy-peer-deps`,
    ],
  },
  
  {
    name: 'fix-material-legacy-imports',
    description: 'Remove MatLegacy imports (must be done before v17)',
    detect: (error) => /MatLegacy|@angular\/material.*legacy/i.test(error),
    fix: async (projectRoot) => [
      // Run Material migration schematic
      `cd ${projectRoot} && npx ng generate @angular/material:mdc-migration`,
      
      // Find and replace any remaining legacy imports
      `find ${projectRoot}/src -name "*.ts" -type f -print0 | xargs -0 sed -i '' 's/@angular\\/material\\/legacy-/\\/material\\//g' 2>/dev/null || true`,
      `find ${projectRoot}/src -name "*.ts" -type f -print0 | xargs -0 sed -i '' 's/MatLegacy/Mat/g' 2>/dev/null || true`,
    ],
  },
  
  {
    name: 'fix-http-client-module',
    description: 'Migrate HttpClientModule to provideHttpClient',
    detect: (error) => /HttpClientModule.*deprecated|provideHttpClient/i.test(error),
    fix: async (projectRoot) => [
      // Replace HttpClientModule with provideHttpClient in app.config.ts
      `find ${projectRoot}/src -name "app.config.ts" -type f -exec sed -i '' 's/HttpClientModule/provideHttpClient()/g' {} +`,
      
      // Update imports
      `find ${projectRoot}/src -name "*.ts" -type f -exec sed -i '' "s/import { HttpClientModule } from '@angular\\/common\\/http'/import { provideHttpClient } from '@angular\\/common\\/http'/g" {} +`,
    ],
  },
  
  {
    name: 'fix-topromise-deprecation',
    description: 'Replace toPromise() with lastValueFrom()',
    detect: (error) => /toPromise.*deprecated|Use.*lastValueFrom/i.test(error),
    fix: async (projectRoot) => [
      // Replace .toPromise() with lastValueFrom()
      `find ${projectRoot}/src -name "*.ts" -type f -exec sed -i '' 's/\\.toPromise()/)/g' {} +`,
      `find ${projectRoot}/src -name "*.ts" -type f -exec sed -i '' 's/observable)/lastValueFrom(observable)/g' {} +`,
      
      // Add import
      `find ${projectRoot}/src -name "*.ts" -type f -exec sed -i '' "1s/^/import { lastValueFrom } from 'rxjs';\\n/" {} +`,
    ],
  },
  
  {
    name: 'fix-template-in-keyword',
    description: 'Fix template "in" keyword reserved word error (v20)',
    detect: (error) => /{{ in }}|Identifier.*in.*reserved/i.test(error),
    fix: async (projectRoot) => [
      // Replace {{ in }} with {{ this.in }}
      `find ${projectRoot}/src -name "*.html" -type f -exec sed -i '' 's/{{ in }}/{{ this.in }}/g' {} +`,
      `find ${projectRoot}/src -name "*.html" -type f -exec sed -i '' 's/{{in}}/{{ this.in }}/g' {} +`,
    ],
  },
  
  {
    name: 'fix-standalone-component-imports',
    description: 'Add CommonModule/FormsModule to standalone component imports',
    detect: (error) => /standalone.*component.*missing.*import|NgIf.*NgFor.*not found/i.test(error),
    fix: async (projectRoot) => [
      // This requires file-specific analysis, so we'll provide a general command
      `cd ${projectRoot} && npx ng generate @angular/core:standalone`,
    ],
  },
  
  {
    name: 'fix-build-optimization-errors',
    description: 'Disable optimization for initial migration build',
    detect: (error) => /Optimization error|optimization.*failed|terser.*minification|SyntaxError.*Unexpected token/i.test(error),
    fix: async (projectRoot) => [
      // Update angular.json to disable optimization for ALL configurations
      `node -e "const fs=require('fs');const p='${projectRoot}/angular.json';const c=JSON.parse(fs.readFileSync(p,'utf8'));const proj=Object.keys(c.projects)[0];const build=c.projects[proj].architect.build;if(build.configurations.production){build.configurations.production.optimization=false;build.configurations.production.buildOptimizer=false;}if(build.configurations.development){build.configurations.development.optimization=false;build.configurations.development.buildOptimizer=false;}if(build.options){build.options.optimization=false;build.options.buildOptimizer=false;}fs.writeFileSync(p,JSON.stringify(c,null,2));"`,
    ],
  },
  
  {
    name: 'fix-circular-dependencies',
    description: 'Detect and suggest fixes for circular dependency warnings',
    detect: (error) => /Circular dependency|WARNING in.*cycle/i.test(error),
    fix: async (projectRoot) => [
      // Run the circular dependency detection script
      `cd ${projectRoot} && npx madge --circular --extensions ts ./src`,
    ],
  },
  
  {
    name: 'fix-commonjs-dependencies',
    description: 'Configure CommonJS dependencies in angular.json to suppress optimization warnings',
    detect: (error) => /depends on.*CommonJS.*optimization bailouts|allowedCommonJsDependencies/i.test(error),
    fix: async (projectRoot) => [
      // Extract package names from error and add to allowedCommonJsDependencies
      `node -e "const fs=require('fs');const p='${projectRoot}/angular.json';const c=JSON.parse(fs.readFileSync(p,'utf8'));const proj=Object.keys(c.projects)[0];const opts=c.projects[proj].architect.build.options;if(!opts.allowedCommonJsDependencies)opts.allowedCommonJsDependencies=[];const common=['moment','moment-timezone','dagre','webcola','luxon','highcharts'];common.forEach(pkg=>{if(!opts.allowedCommonJsDependencies.includes(pkg))opts.allowedCommonJsDependencies.push(pkg);});fs.writeFileSync(p,JSON.stringify(c,null,2));"`,
    ],
  },
  
  {
    name: 'fix-material-form-field-imports',
    description: 'Fix missing Material form field directive imports in standalone components',
    detect: (error) => /mat-form-field.*is not a known element|MatFormField.*not found/i.test(error),
    fix: async (projectRoot) => [
      // Add MatFormFieldModule to component imports
      `find ${projectRoot}/src -name "*.ts" -type f -exec grep -l "mat-form-field" {} \\; | xargs -I {} sed -i '' "s/imports: \\[/imports: [MatFormFieldModule, /g" {} 2>/dev/null || true`,
      `find ${projectRoot}/src -name "*.ts" -type f -exec grep -l "MatFormFieldModule" {} \\; | head -1 | xargs -I {} sed -i '' "1s/^/import { MatFormFieldModule } from '@angular\\/material\\/form-field';\\n/" {} 2>/dev/null || true`,
    ],
  },
  
  {
    name: 'fix-rxjs-imports',
    description: 'Fix deprecated RxJS import paths (rxjs/Rx → rxjs/operators)',
    detect: (error) => /rxjs\/Rx|rxjs\/add\/operator/i.test(error),
    fix: async (projectRoot) => [
      `find ${projectRoot}/src -name "*.ts" -type f -exec sed -i '' "s/import.*from 'rxjs\\/Rx'/import { Observable } from 'rxjs'/g" {} +`,
      `find ${projectRoot}/src -name "*.ts" -type f -exec sed -i '' "s/import 'rxjs\\/add\\/operator\\//import { /g" {} +`,
    ],
  },
  
  {
    name: 'fix-zone-js-test-errors',
    description: 'Fix zone.js test setup errors and Karma load errors',
    detect: (error) => /Expected to be running in.*ProxyZone|zone\.js.*test|Found \d+ load error|ERROR \[karma-server\]/i.test(error),
    fix: async (projectRoot) => [
      // Ensure zone.js/testing is imported in test.ts
      `test -f ${projectRoot}/src/test.ts && grep -q "zone.js/testing" ${projectRoot}/src/test.ts || echo "import 'zone.js';" >> ${projectRoot}/src/test.ts`,
      `test -f ${projectRoot}/src/test.ts && grep -q "zone.js/testing" ${projectRoot}/src/test.ts || echo "import 'zone.js/testing';" >> ${projectRoot}/src/test.ts`,
      
      // Ensure polyfills.ts includes zone.js
      `test -f ${projectRoot}/src/polyfills.ts && grep -q "zone.js" ${projectRoot}/src/polyfills.ts || echo "import 'zone.js';" >> ${projectRoot}/src/polyfills.ts`,
      
      // Update tsconfig.spec.json to include polyfills and test.ts
      `node -e "const fs=require('fs');const p='${projectRoot}/tsconfig.spec.json';if(fs.existsSync(p)){const c=JSON.parse(fs.readFileSync(p,'utf8'));if(!c.files)c.files=[];if(!c.files.includes('src/test.ts'))c.files.push('src/test.ts');if(!c.files.includes('src/polyfills.ts'))c.files.push('src/polyfills.ts');fs.writeFileSync(p,JSON.stringify(c,null,2));}"`,
    ],
  },
  
  {
    name: 'fix-ngx-perfect-scrollbar-ivy',
    description: 'Fix ngx-perfect-scrollbar Ivy compatibility by upgrading to latest version',
    detect: (error) => /PerfectScrollbarModule.*does not appear to be an NgModule|PerfectScrollbarModule.*not compatible with Angular Ivy/i.test(error),
    fix: async (projectRoot) => [
      // Upgrade to latest version that supports Ivy (v10+)
      `cd ${projectRoot} && npm install ngx-perfect-scrollbar@latest --save --legacy-peer-deps`,
      
      // If still having issues, remove and reinstall
      `cd ${projectRoot} && npm uninstall ngx-perfect-scrollbar && npm install ngx-perfect-scrollbar@latest --save --legacy-peer-deps`,
    ],
  },
  
  {
    name: 'fix-missing-test-providers',
    description: 'Add missing test providers for common services',
    detect: (error) => /NullInjectorError.*No provider for (MatSnackBar|ActivatedRoute|Router|TranslateService)/i.test(error),
    fix: async (projectRoot) => [
      // This requires manual intervention - provide guidance
      `echo "⚠️  Manual fix needed: Add missing providers to TestBed.configureTestingModule providers array"`,
      `echo "Common missing providers: RouterTestingModule, MatSnackBarModule, TranslateModule.forRoot()"`,
    ],
  },
];

/**
 * Find matching pattern fix for an error
 */
export function findPatternFix(error: string): PatternFix | null {
  for (const fix of PATTERN_FIXES) {
    if (fix.detect(error)) {
      return fix;
    }
  }
  return null;
}

/**
 * Get all available pattern fixes
 */
export function getAllPatternFixes(): PatternFix[] {
  return PATTERN_FIXES;
}
