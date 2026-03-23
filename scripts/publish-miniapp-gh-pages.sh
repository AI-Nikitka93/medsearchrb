#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
publish_dir="$(mktemp -d)"
remote_snapshot_file="data/catalog-overview.json"

resolve_python() {
  if command -v python >/dev/null 2>&1; then
    echo "python"
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
    return 0
  fi

  if command -v py >/dev/null 2>&1; then
    echo "py -3"
    return 0
  fi

  echo "No Python interpreter found in PATH" >&2
  exit 1
}

python_cmd="$(resolve_python)"

cleanup() {
  git -C "$repo_root" worktree remove "$publish_dir" --force >/dev/null 2>&1 || true
  rm -rf "$publish_dir"
}

trap cleanup EXIT

git -C "$repo_root" worktree prune >/dev/null 2>&1 || true

extract_generated_at() {
  local file_path="$1"

  if [[ ! -f "$file_path" ]]; then
    echo ""
    return 0
  fi

  eval "$python_cmd" - "$file_path" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
try:
    payload = json.loads(path.read_text(encoding="utf-8"))
except Exception:
    print("")
    raise SystemExit(0)

print(str(payload.get("generated_at", "")))
PY
}

timestamp_to_epoch() {
  local timestamp="$1"

  if [[ -z "$timestamp" ]]; then
    echo "0"
    return 0
  fi

  eval "$python_cmd" - "$timestamp" <<'PY'
from datetime import datetime
import sys

value = sys.argv[1]
try:
    print(int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()))
except Exception:
    print(0)
PY
}

if git -C "$repo_root" ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git -C "$repo_root" fetch origin gh-pages --depth=1
  git -C "$repo_root" worktree add --detach "$publish_dir" refs/remotes/origin/gh-pages
else
  git -C "$repo_root" worktree add --detach "$publish_dir" HEAD
  git -C "$publish_dir" checkout --orphan gh-pages
fi

find "$publish_dir" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$repo_root/apps/miniapp/out/." "$publish_dir/"
touch "$publish_dir/.nojekyll"

local_generated_at="$(extract_generated_at "$repo_root/apps/miniapp/out/$remote_snapshot_file")"

remote_generated_at=""
if git -C "$repo_root" ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  remote_generated_at="$((git -C "$repo_root" show "refs/remotes/origin/gh-pages:$remote_snapshot_file" 2>/dev/null || true) | eval "$python_cmd" - <<'PY'
import json
import sys

try:
    payload = json.load(sys.stdin)
except Exception:
    print("")
    raise SystemExit(0)

print(str(payload.get("generated_at", "")))
PY
)"
fi

local_epoch="$(timestamp_to_epoch "$local_generated_at")"
remote_epoch="$(timestamp_to_epoch "$remote_generated_at")"

if [[ "$remote_epoch" -gt "$local_epoch" ]]; then
  echo "REMOTE_GH_PAGES_IS_NEWER"
  echo "remote_generated_at=$remote_generated_at"
  echo "local_generated_at=$local_generated_at"
  exit 0
fi

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

git -C "$publish_dir" push origin +HEAD:refs/heads/gh-pages
