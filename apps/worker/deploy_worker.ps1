$ErrorActionPreference = "Stop"

$workerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $workerRoot "..\..")
$rootEnv = Join-Path $repoRoot ".env.txt"
if (-not (Test-Path $rootEnv)) {
  $rootEnv = Join-Path $repoRoot ".env"
}

if (-not (Test-Path $rootEnv)) {
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

Require-Command -Name "node" -WingetId "OpenJS.NodeJS.LTS"

Push-Location $workerRoot
try {
  if (-not (Test-Path (Join-Path $workerRoot "node_modules"))) {
    npm install | Out-Host
  }

  npx wrangler whoami | Out-Host

  $pairs = Get-EnvPairs -Path $rootEnv

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
        @{ command = "start"; description = "Open main menu" },
        @{ command = "help"; description = "Usage help" },
        @{ command = "about"; description = "About the service" },
        @{ command = "privacy"; description = "Privacy policy" }
      )
    }

  $setMenu = Invoke-TelegramJson -Uri ($telegramApiBase + "setChatMenuButton") -Payload @{
      menu_button = @{
        type = "web_app"
        text = "Open Mini App"
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
