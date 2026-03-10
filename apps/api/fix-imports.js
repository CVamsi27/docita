const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const specFiles = execSync('find src -name "*.spec.ts"')
  .toString()
  .split('\n')
  .filter(Boolean);

specFiles.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  content = content.replace(
    /from\s+['"](\.[^'"]+)['"]/g,
    (match, importPath) => {
      const dir = path.dirname(file);
      const targetPath = path.resolve(dir, importPath + '.ts');
      const targetPathDirIndex = path.resolve(dir, importPath, 'index.ts');

      if (fs.existsSync(targetPath) || fs.existsSync(targetPathDirIndex)) {
        return match;
      }

      const baseName = path.basename(importPath);

      const domainMatch = file.match(/^src\/domains\/[^/]+/);
      const searchDirs = domainMatch ? [domainMatch[0], 'src'] : ['src'];

      for (const searchDir of searchDirs) {
        try {
          const found = execSync(
            `find ${searchDir} -name "${baseName}.ts" -o -name "${baseName}" | grep -v "\\.spec\\.ts"`,
          )
            .toString()
            .split('\n')
            .filter(Boolean);
          for (let newTarget of found) {
            if (newTarget.endsWith('.ts')) newTarget = newTarget.slice(0, -3);
            if (newTarget.endsWith('/index'))
              newTarget = newTarget.slice(0, -6);

            let relPath = path.relative(dir, newTarget);
            if (!relPath.startsWith('.')) relPath = './' + relPath;

            changed = true;
            return `from '${relPath}'`;
          }
        } catch (e) {}
      }

      return match;
    },
  );

  if (changed) {
    fs.writeFileSync(file, content);
  }
});
