$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$publishDir = "C:\Temp\medsearchrb-gh-pages"

if (Test-Path $publishDir) {
  Remove-Item -Recurse -Force $publishDir
}

$branchExists = git -C $repoRoot ls-remote --heads origin gh-pages
if ([string]::IsNullOrWhiteSpace($branchExists)) {
  git -C $repoRoot worktree add -b gh-pages $publishDir HEAD | Out-Host
} else {
  git -C $repoRoot worktree add $publishDir gh-pages | Out-Host
}

try {
  Get-ChildItem $publishDir -Force |
    Where-Object { $_.Name -ne ".git" } |
    Remove-Item -Recurse -Force

  Copy-Item (Join-Path $repoRoot "apps\miniapp\out\*") $publishDir -Recurse -Force
  New-Item -ItemType File -Path (Join-Path $publishDir ".nojekyll") -Force | Out-Null

  Push-Location $publishDir
  try {
    git config user.email "aiomdurman@gmail.com"
    git config user.name "AI Nikitka93"
    git add -A

    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
      Write-Host "NO_CHANGES_TO_PUBLISH"
      return
    }

    git commit `
      -m "deploy: publish mini app to gh-pages" `
      -m "Constraint: publish the static export to a stable free host that Telegram can open reliably." `
      -m "Rejected: relying on unstable pages.dev entrypoints or paid Netlify deploys." `
      -m "Directive: ship the current apps/miniapp/out export to gh-pages for GitHub Pages hosting." `
      -m "Not-tested: I did not validate every Telegram client variant before publish." | Out-Host

    git push origin gh-pages | Out-Host
  } finally {
    Pop-Location
  }
} finally {
  git -C $repoRoot worktree remove $publishDir --force | Out-Host
}
