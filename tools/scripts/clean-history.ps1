#!/usr/bin/env pwsh
# Clean history reset: one meaningful commit per folder, short & symbolic

git checkout launch/mooncode 2>$null
git checkout --orphan fresh-history

# Stage and commit by logical group
git reset HEAD -- . 2>$null

# .github
git add .github
git commit -m "ci: workflows, templates & security"

# .husky
git add .husky
git commit -m "chore: git hooks (pre-commit lint+check)"

# .vendor
git add .vendor
git commit -m "vendor: third-party binaries"

# assets
git add assets
git commit -m "assets: logos & icons"

# configs
git add configs
git commit -m "config: ts, biome & env templates"

# docs
git add docs
git commit -m "docs: site, benchmarks & guides"

# packages
git add packages
git commit -m "feat: cli, core, engine, tui, web-ui packages"

# tools
git add tools
git commit -m "tools: build scripts & maintenance"

# Moonagent
git add Moonagent 2>$null
git commit -m "core: moonagent runtime dir" 2>$null

# root files
git add .gitignore .gitattributes
git commit -m "chore: git config"

git add LICENSE
git commit -m "chore: MIT license"

git add README.md
git commit -m "docs: readme"

git add package.json package-lock.json
git commit -m "chore: npm workspace & deps"

git add biome.json tsconfig.json
git commit -m "config: biome & typescript root"

# delete old branch, rename this one, force push
git branch -D launch/mooncode 2>$null
git branch -m launch/mooncode
git push -f origin launch/mooncode --set-upstream
