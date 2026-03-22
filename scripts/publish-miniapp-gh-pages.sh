#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
publish_dir="$(mktemp -d)"

cleanup() {
  git -C "$repo_root" worktree remove "$publish_dir" --force >/dev/null 2>&1 || true
  rm -rf "$publish_dir"
}

trap cleanup EXIT

if git -C "$repo_root" ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git -C "$repo_root" fetch origin gh-pages --depth=1
  git -C "$repo_root" worktree add -B gh-pages "$publish_dir" refs/remotes/origin/gh-pages
else
  git -C "$repo_root" worktree add --detach "$publish_dir" HEAD
  git -C "$publish_dir" checkout --orphan gh-pages
fi

find "$publish_dir" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$repo_root/apps/miniapp/out/." "$publish_dir/"
touch "$publish_dir/.nojekyll"

git -C "$publish_dir" config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git -C "$publish_dir" config user.name "github-actions[bot]"
git -C "$publish_dir" add -A

if git -C "$publish_dir" diff --cached --quiet; then
  echo "NO_CHANGES_TO_PUBLISH"
  exit 0
fi

git -C "$publish_dir" commit \
  -m "deploy: publish mini app to gh-pages" \
  -m "Constraint: keep Mini App freshness on the stable GitHub Pages host instead of failed Cloudflare deploys." \
  -m "Rejected: leaving review and promo workflows red because of an unrelated hosting token failure." \
  -m "Directive: publish the current apps/miniapp/out export to gh-pages for Telegram-safe hosting." \
  -m "Not-tested: I did not validate every GitHub Actions race condition across simultaneous workflow publishes."

git -C "$publish_dir" push origin gh-pages --force
