#!/bin/bash

set -e

# Use ncu to update dependencies in all apps and packages within the monorepo
# https://github.com/raineorshine/npm-check-updates

# The script will default to only bumping minor versions, but we allow optional full command override here.
#
# Examples:
#
# Check all available major and minor updates (dry run):
# ./scripts/updateAllDeps.sh ncu
#
# To update all available major/minor updates (actual update of package.json files):
# ./scripts/updateAllDeps.sh ncu -u
update_cmd=${@:-"ncu -t minor -u"}

run_ncu() {
  local dir=$1
  echo "Updating dependencies in $dir"
  cd "$dir" || return
  $update_cmd
  cd - > /dev/null || return
}

# Update root dependencies
$update_cmd

# Update dependencies in packages directory
if [ -d "packages" ]; then
  for package in packages/*/; do
    run_ncu "$package"
  done
fi

echo "Dependency update process completed"
