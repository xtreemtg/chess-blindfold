#!/bin/bash
set -e

# Note: If you're not the creator of this library
# you likely shouldn't use or run this, because
# you'll need the right server configured.

echo "Starting deploy"

# Building the library
npm run prettier
#npm run eslint
npm run test
npm run build

SERVEDIR=serve_content/chess-blindfold

mkdir -p ${SERVEDIR}

# Move the build output to the SERVEDIR
cp -r serve_content/prod/* ${SERVEDIR}
cp -r serve_content/shared/* ${SERVEDIR}
cp serve_content/index_prod.html ${SERVEDIR}/index.html

echo "Deploying to GitHub Pages"

# Go to the directory and initialize a git repository
cd ${SERVEDIR}
git init
git add -A
git commit -m "Deploy to GitHub Pages"

# Force push to the gh-pages branch
git push -f https://github.com/xtreemtg/chess-blindfold.git main:gh-pages

echo "Completed deploy"
