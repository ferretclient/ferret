#!/bin/bash

# Remove out directory
rm -rf packages/ferret-electron/out

# Remove web directory
rm -rf packages/ferret-electron/web

# Create a new web directory
mkdir packages/ferret-electron/web

# Copy build
cp -r packages/ferret-app/dist/* packages/ferret-electron/web


# Update static paths
sed -i'' -e 's@/static/@static/@g' packages/ferret-electron/web/**.html
sed -i'' -e 's@/static/font@../../static/font@g' packages/ferret-electron/web/static/css/**.**.css

# Remove sourcemaps
find packages/ferret-electron/web -name '*.map' -type f -delete

if [ "$1" == "snap" ]; then
  echo "Building snap distribution"
  npm run dist:snap --workspace=packages/ferret-electron 
elif [ "$1" == "mac" ]; then
  echo "Building mac distribution"
  npm run dist:mac --workspace=packages/ferret-electron
elif [ "$1" == "win" ]; then
  echo "Building windows distribution"
  npm run dist:win --workspace=packages/ferret-electron
elif [ "$1" == "deb" ]; then
  echo "Building debian distribution"
  npm run dist:deb --workspace=packages/ferret-electron
elif [ "$1" == "rpm" ]; then
  echo "Building rpm distribution"
  npm run dist:rpm --workspace=packages/ferret-electron
elif [ "$1" == "linux" ]; then
  echo "Building linux distribution"
  npm run dist:linux --workspace=packages/ferret-electron
else
  echo "Please pass a build distribution type"
fi