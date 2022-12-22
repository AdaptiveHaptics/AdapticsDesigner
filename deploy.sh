set -ex

rm -rf dist

git worktree add dist gh-pages

cp -Lr src/client/* dist/

cd dist
git add --all
git commit -m "deploy"
git push origin gh-pages

cd ..
git worktree remove dist