$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:CLOUDFLARE_API_TOKEN)) {
  [Console]::Error.WriteLine("[ERROR] CLOUDFLARE_API_TOKEN is not configured. Please set the secret in your environment.")
  exit 1
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Get-EnvPairs {
  param([string]$Path)

  $pairs = @{}
  foreach ($line in Get-Content $Path) {
    if ($line -match '^\s*([^#=\s]+)\s*=\s*(.*)$') {
      $pairs[$matches[1]] = $matches[2].Trim()
    }
  }

  return $pairs
}

function Merge-EnvPairs {
  param(
    [hashtable]$BasePairs,
    [hashtable]$OverlayPairs
  )

  $merged = @{}
  foreach ($entry in $BasePairs.GetEnumerator()) {
    $merged[$entry.Key] = $entry.Value
  }

  foreach ($entry in $OverlayPairs.GetEnumerator()) {
    if (-not [string]::IsNullOrWhiteSpace($entry.Value)) {
      $merged[$entry.Key] = $entry.Value
    }
  }

  return $merged
}

function Set-GitHubSecret {
  param(
    [string]$Name,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing required value for GitHub secret '$Name'."
  }

  Write-Host "[SECRET] Syncing $Name"
  gh secret set $Name --repo AI-Nikitka93/medsearchrb --body $Value | Out-Null
}

function Test-CloudflareApiToken {
  param([string]$Token)

  try {
    $response = Invoke-RestMethod `
      -Method Get `
      -Uri "https://api.cloudflare.com/client/v4/user/tokens/verify" `
      -Headers @{ Authorization = "Bearer $Token" }

    if (-not $response.success) {
      throw "Cloudflare token verification returned success=false."
    }
  }
  catch {
    $message = $_.Exception.Message
    if ($_.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($_.ErrorDetails.Message)) {
      $message = $_.ErrorDetails.Message
    }

    if ($message -match '"code"\s*:\s*9109|Invalid access token') {
      [Console]::Error.WriteLine("[ERROR] CLOUDFLARE_API_TOKEN is invalid or revoked. Cloudflare returned code 9109. Replace the local token before syncing GitHub secrets.")
    }
    else {
      [Console]::Error.WriteLine("[ERROR] Cloudflare API token validation failed before syncing GitHub secrets. $message")
    }
    exit 1
  }
}

$envFiles = @(
  (Join-Path $repoRoot ".env.txt"),
  (Join-Path $repoRoot ".env"),
  (Join-Path $repoRoot ".env.local")
)

$pairs = @{}
foreach ($path in $envFiles) {
  if (Test-Path $path) {
    $pairs = Merge-EnvPairs -BasePairs $pairs -OverlayPairs (Get-EnvPairs -Path $path)
  }
}

if ($pairs.Count -eq 0) {
  throw "No env values found in .env.txt/.env/.env.local."
}

if ([string]::IsNullOrWhiteSpace($pairs["CLOUDFLARE_ACCOUNT_ID"]) -and -not [string]::IsNullOrWhiteSpace($env:CLOUDFLARE_ACCOUNT_ID)) {
  $pairs["CLOUDFLARE_ACCOUNT_ID"] = $env:CLOUDFLARE_ACCOUNT_ID
}

if ([string]::IsNullOrWhiteSpace($pairs["CLOUDFLARE_ACCOUNT_ID"])) {
  [Console]::Error.WriteLine("[ERROR] CLOUDFLARE_ACCOUNT_ID is not configured. Add it to .env/.env.local or set it in the environment before syncing GitHub secrets.")
  exit 1
}

Test-CloudflareApiToken -Token $env:CLOUDFLARE_API_TOKEN

Set-GitHubSecret -Name "CLOUDFLARE_API_TOKEN" -Value $env:CLOUDFLARE_API_TOKEN
Set-GitHubSecret -Name "CLOUDFLARE_ACCOUNT_ID" -Value $pairs["CLOUDFLARE_ACCOUNT_ID"]

if ([string]::IsNullOrWhiteSpace($pairs["TELEGRAM_WEBHOOK_SECRET"])) {
  $pairs["TELEGRAM_WEBHOOK_SECRET"] = $pairs["INGEST_SHARED_SECRET"]
}

if ([string]::IsNullOrWhiteSpace($pairs["BOT_SHORT_DESCRIPTION"])) {
  $pairs["BOT_SHORT_DESCRIPTION"] = "Поиск врачей, клиник и акций в Минске. Создано @AI_Nikitka93."
}

$requiredSecrets = @(
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "INGEST_SHARED_SECRET",
  "BOT_TOKEN",
  "TELEGRAM_CHANNEL_ID",
  "WEBAPP_URL",
  "PRIVACY_URL",
  "SUPPORT_USERNAME",
  "BOT_DESCRIPTION",
  "BOT_SHORT_DESCRIPTION",
  "TELEGRAM_WEBHOOK_SECRET"
)

foreach ($name in $requiredSecrets) {
  Set-GitHubSecret -Name $name -Value $pairs[$name]
}

if (-not [string]::IsNullOrWhiteSpace($pairs["TELEGRAM_CHANNEL_USERNAME"])) {
  Set-GitHubSecret -Name "TELEGRAM_CHANNEL_USERNAME" -Value $pairs["TELEGRAM_CHANNEL_USERNAME"]
}

if (-not [string]::IsNullOrWhiteSpace($pairs["GROQ_API_KEY"])) {
  Set-GitHubSecret -Name "GROQ_API_KEY" -Value $pairs["GROQ_API_KEY"]
}

Write-Host "[SUCCESS] Worker GitHub secrets are synced."
