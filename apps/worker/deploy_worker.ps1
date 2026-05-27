$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:CLOUDFLARE_API_TOKEN)) {
  [Console]::Error.WriteLine("[ERROR] CLOUDFLARE_API_TOKEN is not configured. Please set the secret in your environment.")
  exit 1
}

$workerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $workerRoot "..\..")
$rootEnv = Join-Path $repoRoot ".env.local"
$workerEnv = Join-Path $workerRoot ".dev.vars"
if (-not (Test-Path $rootEnv)) {
  $rootEnv = Join-Path $repoRoot ".env"
}
if (-not (Test-Path $rootEnv)) {
  $rootEnv = Join-Path $repoRoot ".env.txt"
}

if (-not (Test-Path $rootEnv) -and -not (Test-Path $workerEnv)) {
  throw "Root env file not found. Expected '$repoRoot\.env.txt' or '.env'."
}

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

function Require-Command {
  param(
    [string]$Name,
    [string]$WingetId
  )

  if (Get-Command $Name -ErrorAction SilentlyContinue) {
    return
  }

  Write-Host "[SETUP] $Name not found. Installing via winget..."
  winget install --id $WingetId -e --silent --accept-source-agreements --accept-package-agreements | Out-Host

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name installation failed."
  }
}

function Put-WorkerSecret {
  param(
    [hashtable]$Pairs,
    [string]$SecretName,
    [string]$EnvKey,
    [string]$FallbackKey = ""
  )

  $value = $Pairs[$EnvKey]
  if ([string]::IsNullOrWhiteSpace($value) -and -not [string]::IsNullOrWhiteSpace($FallbackKey)) {
    $value = $Pairs[$FallbackKey]
  }

  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing value for $EnvKey"
  }

  Write-Host "[SECRET] Syncing $SecretName..."
  $value | npx wrangler secret put $SecretName | Out-Host
}

function Invoke-TelegramJson {
  param(
    [string]$Uri,
    [hashtable]$Payload
  )

  $json = $Payload | ConvertTo-Json -Depth 8 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  return Invoke-RestMethod -Method Post -Uri $Uri -ContentType "application/json; charset=utf-8" -Body $bytes
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
      [Console]::Error.WriteLine("[ERROR] CLOUDFLARE_API_TOKEN is invalid or revoked. Cloudflare returned code 9109. Replace the GitHub/local secret with a scoped API token for the target account.")
    }
    else {
      [Console]::Error.WriteLine("[ERROR] Cloudflare API token validation failed before deploy. $message")
    }
    exit 1
  }
}

Require-Command -Name "node" -WingetId "OpenJS.NodeJS.LTS"

Push-Location $workerRoot
try {
  if (-not (Test-Path (Join-Path $workerRoot "node_modules"))) {
    npm install | Out-Host
  }

  $pairs = @{}
  if (Test-Path $rootEnv) {
    $pairs = Get-EnvPairs -Path $rootEnv
  }
  if (Test-Path $workerEnv) {
    $workerPairs = Get-EnvPairs -Path $workerEnv
    $pairs = Merge-EnvPairs -BasePairs $pairs -OverlayPairs $workerPairs
  }

  if ([string]::IsNullOrWhiteSpace($env:CLOUDFLARE_ACCOUNT_ID) -and -not [string]::IsNullOrWhiteSpace($pairs["CLOUDFLARE_ACCOUNT_ID"])) {
    $env:CLOUDFLARE_ACCOUNT_ID = $pairs["CLOUDFLARE_ACCOUNT_ID"]
  }

  if ([string]::IsNullOrWhiteSpace($env:CLOUDFLARE_ACCOUNT_ID)) {
    [Console]::Error.WriteLine("[ERROR] CLOUDFLARE_ACCOUNT_ID is not configured. Set it as a GitHub secret or local environment variable for non-interactive Wrangler deploys.")
    exit 1
  }

  Test-CloudflareApiToken -Token $env:CLOUDFLARE_API_TOKEN
  Write-Host "[CLOUDFLARE] API token verified. Deploy target account is configured."

  Put-WorkerSecret -Pairs $pairs -SecretName "TURSO_DATABASE_URL" -EnvKey "TURSO_DATABASE_URL"
  Put-WorkerSecret -Pairs $pairs -SecretName "TURSO_AUTH_TOKEN" -EnvKey "TURSO_AUTH_TOKEN"
  Put-WorkerSecret -Pairs $pairs -SecretName "INGEST_SHARED_SECRET" -EnvKey "INGEST_SHARED_SECRET"
  Put-WorkerSecret -Pairs $pairs -SecretName "BOT_TOKEN" -EnvKey "BOT_TOKEN"
  Put-WorkerSecret -Pairs $pairs -SecretName "TELEGRAM_CHANNEL_ID" -EnvKey "TELEGRAM_CHANNEL_ID"
  Put-WorkerSecret -Pairs $pairs -SecretName "WEBAPP_URL" -EnvKey "WEBAPP_URL"
  Put-WorkerSecret -Pairs $pairs -SecretName "PRIVACY_URL" -EnvKey "PRIVACY_URL"
  Put-WorkerSecret -Pairs $pairs -SecretName "SUPPORT_USERNAME" -EnvKey "SUPPORT_USERNAME"
  Put-WorkerSecret -Pairs $pairs -SecretName "BOT_DESCRIPTION" -EnvKey "BOT_DESCRIPTION"

  if ([string]::IsNullOrWhiteSpace($pairs["BOT_SHORT_DESCRIPTION"])) {
    $pairs["BOT_SHORT_DESCRIPTION"] = "Doctors, clinics and promotions in Minsk. Created by @AI_Nikitka93."
  }
  Put-WorkerSecret -Pairs $pairs -SecretName "BOT_SHORT_DESCRIPTION" -EnvKey "BOT_SHORT_DESCRIPTION"

  if ([string]::IsNullOrWhiteSpace($pairs["TELEGRAM_CHANNEL_USERNAME"])) {
    $pairs["TELEGRAM_CHANNEL_USERNAME"] = ""
  }
  Put-WorkerSecret -Pairs $pairs -SecretName "TELEGRAM_CHANNEL_USERNAME" -EnvKey "TELEGRAM_CHANNEL_USERNAME"

  if ([string]::IsNullOrWhiteSpace($pairs["TELEGRAM_WEBHOOK_SECRET"])) {
    $pairs["TELEGRAM_WEBHOOK_SECRET"] = $pairs["INGEST_SHARED_SECRET"]
  }
  Put-WorkerSecret -Pairs $pairs -SecretName "TELEGRAM_WEBHOOK_SECRET" -EnvKey "TELEGRAM_WEBHOOK_SECRET"

  if (-not [string]::IsNullOrWhiteSpace($pairs["GROQ_API_KEY"])) {
    Put-WorkerSecret -Pairs $pairs -SecretName "GROQ_API_KEY" -EnvKey "GROQ_API_KEY"
  }

  $deployOutput = npx wrangler deploy 2>&1
  $deployOutput | Out-Host

  $workerUrlMatch = [regex]::Match(($deployOutput -join [Environment]::NewLine), 'https://[^\s]+workers\.dev')
  if (-not $workerUrlMatch.Success) {
    throw "Worker URL not found in deploy output."
  }
  $workerUrl = $workerUrlMatch.Value

  $botToken = $pairs["BOT_TOKEN"]
  $webAppUrl = $pairs["WEBAPP_URL"]
  $privacyUrl = $pairs["PRIVACY_URL"]
  $botDescription = $pairs["BOT_DESCRIPTION"]
  if ([string]::IsNullOrWhiteSpace($botDescription)) {
    $botDescription = "Doctor search, reviews and promotions in Minsk. Created by @AI_Nikitka93."
  }
  $botShortDescription = $pairs["BOT_SHORT_DESCRIPTION"]
  $webhookSecret = $pairs["TELEGRAM_WEBHOOK_SECRET"]
  $telegramApiBase = "https://api.telegram.org/bot$botToken/"

  Write-Host "[TELEGRAM] Syncing webhook and bot profile..."

  $setWebhook = Invoke-TelegramJson -Uri ($telegramApiBase + "setWebhook") -Payload @{
      url = "$workerUrl/telegram/webhook"
      secret_token = $webhookSecret
      allowed_updates = @("message", "callback_query")
      drop_pending_updates = $false
      max_connections = 20
    }

  $setCommands = Invoke-TelegramJson -Uri ($telegramApiBase + "setMyCommands") -Payload @{
      commands = @(
        @{ command = "start"; description = "Открыть главное меню" },
        @{ command = "help"; description = "Как пользоваться ботом" },
        @{ command = "about"; description = "О сервисе" },
        @{ command = "privacy"; description = "Политика конфиденциальности" }
      )
    }

  $setMenu = Invoke-TelegramJson -Uri ($telegramApiBase + "setChatMenuButton") -Payload @{
      menu_button = @{
        type = "web_app"
        text = "Открыть каталог"
        web_app = @{
          url = $webAppUrl
        }
      }
    }

  $setDescription = Invoke-TelegramJson -Uri ($telegramApiBase + "setMyDescription") -Payload @{
      description = $botDescription
    }

  $setShortDescription = Invoke-TelegramJson -Uri ($telegramApiBase + "setMyShortDescription") -Payload @{
      short_description = $botShortDescription
    }

  $webhookInfo = Invoke-RestMethod -Method Get -Uri ($telegramApiBase + "getWebhookInfo")

  Write-Host ("WEBHOOK_OK=" + $setWebhook.ok)
  Write-Host ("COMMANDS_OK=" + $setCommands.ok)
  Write-Host ("MENU_OK=" + $setMenu.ok)
  Write-Host ("DESCRIPTION_OK=" + $setDescription.ok)
  Write-Host ("SHORT_DESCRIPTION_OK=" + $setShortDescription.ok)
  Write-Host ("WEBHOOK_URL=" + $webhookInfo.result.url)
  Write-Host ("PENDING_UPDATES=" + $webhookInfo.result.pending_update_count)
  Write-Host ("[SUCCESS] Worker and Telegram webhook are online at " + $workerUrl)
}
finally {
  Pop-Location
}
