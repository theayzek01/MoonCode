
git checkout --orphan custom-commits

git add .github
git commit -m "?? ci/cd"

git add .husky
git commit -m "?? hooks"

git add .vendor
git commit -m "?? vendor"

git add assets
git commit -m "??? assets"

git add configs
git commit -m "?? config"

git add docs
git commit -m "?? docs"

git add packages
git commit -m "?? pkgs"

git add tools
git commit -m "??? tools"

git add .gitignore .gitattributes
git commit -m "?? git"

git add LICENSE
git commit -m "?? license"

git add README.md
git commit -m "?? readme"

git add package.json package-lock.json
git commit -m "?? npm"

git add biome.json tsconfig.json
git commit -m "?? env"

if (Test-Path Moonagent) {
    git add Moonagent
    git commit -m "?? core"
}

git branch -D launch/mooncode
git branch -m launch/mooncode
git push -f origin launch/mooncode

