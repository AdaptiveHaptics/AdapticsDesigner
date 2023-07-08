set -ex

tsc --project ./jsconfig.json

license-checker license-checker --production --customPath licenseText --json > ./ThirdPartyNotices.json
node <<EOF
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("./ThirdPartyNotices.json", "utf8"));

const thirdPartyNotices = Object.entries(data).map(([packageName, packageInfo]) => {
	return \`Package: \${packageName}
License: \${packageInfo.licenses}
License Text:
\${packageInfo.licenseText.trim()}
\`;}).join("\n\n"+"=".repeat(50)+"\n\n\n");

fs.writeFileSync("./src/client/ThirdPartyNotices.txt", thirdPartyNotices);
EOF
rm ./ThirdPartyNotices.json


if [[ $(git status --porcelain) ]]; then
  echo "There are uncommitted changes. Please commit or stash them before deploying."
  exit 1
fi

rm -rf dist

git worktree add dist gh-pages

cp -Lr src/client/* dist/

cd dist
git add --all
#git commit --amend -m "deploy"
git commit -m "deploy"
git push -f origin gh-pages

cd ..
git worktree remove dist