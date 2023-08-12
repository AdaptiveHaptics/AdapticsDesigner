set -ex

tsc --project ./jsconfig.json

# if argument "skiptests" is passed, skip tests
if [ "$1" != "skiptests" ]; then
  npx playwright test --reporter list # --reporter dot
fi

npx license-checker --production --customPath licenseText --json > ./ThirdPartyNotices.json # --excludePackages only works with @version added to name, filter is in JS below
node <<EOF
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("./ThirdPartyNotices.json", "utf8"));

const thirdPartyNotices = Object.entries(data).map(([packageName, packageInfo]) => {
  if (packageName.includes("adaptics-pattern-evaluator")) return "";
	return \`Package: \${packageName}
License: \${packageInfo.licenses}
License Text:
\${packageInfo.licenseText.trim()}
\`;}).filter(v => !!v).join("\n\n"+"=".repeat(50)+"\n\n\n");

fs.writeFileSync("./src/client/ThirdPartyNotices.txt", thirdPartyNotices);
EOF
rm ./ThirdPartyNotices.json


if [[ $(git status --porcelain) ]]; then
  echo "There are uncommitted changes. Please commit or stash them before deploying."
  exit 1
fi

rm -rf dist

git worktree add dist gh-pages
cd dist
git pull
cd ..

cp -Lr src/client/* dist/

cd dist
git add --all
#git commit --amend -m "deploy"
git commit -m "deploy"
git push origin gh-pages

cd ..
git worktree remove dist

echo "Successfully deployed to gh-pages branch."