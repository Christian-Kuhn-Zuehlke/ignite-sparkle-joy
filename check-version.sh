#!/bin/bash
# Script to check current Git version

echo "=== Git Version Check ==="
echo ""
echo "Current Commit:"
git rev-parse --short HEAD
echo ""
echo "Current Commit Message:"
git log -1 --pretty=format:"%s"
echo ""
echo "Last Commit Date:"
git log -1 --pretty=format:"%cd" --date=local
echo ""
echo ""
echo "Remote Status:"
git fetch --dry-run 2>&1 | head -1
echo ""
echo "Branch: $(git branch --show-current)"
echo "Remote: $(git remote get-url origin)"

