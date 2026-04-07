
# Bridgebox Voice — Set Supabase Integration Secrets
# This script prompts for each API key and sets them in your Supabase project.
# Run from: C:\dev\github\business\Bridgebox Voice_Simple

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Bridgebox Voice — Configure Integration Keys   " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press ENTER to skip any key you don't have yet." -ForegroundColor Yellow
Write-Host ""

$secrets = @{}

# Stripe
$v = Read-Host "Stripe Secret Key (sk_live_... or sk_test_...)"
if ($v) { $secrets["STRIPE_SECRET_KEY"] = $v }

# Twilio
$v = Read-Host "Twilio Account SID (ACxxx...)"
if ($v) { $secrets["TWILIO_ACCOUNT_SID"] = $v }

$v = Read-Host "Twilio Auth Token"
if ($v) { $secrets["TWILIO_AUTH_TOKEN"] = $v }

$v = Read-Host "Twilio Phone Number (e.g. +15551234567)"
if ($v) { $secrets["TWILIO_PHONE_NUMBER"] = $v }

# Google
$v = Read-Host "Google Client ID (for Calendar OAuth)"
if ($v) { $secrets["GOOGLE_CLIENT_ID"] = $v }

$v = Read-Host "Google Client Secret"
if ($v) { $secrets["GOOGLE_CLIENT_SECRET"] = $v }

$v = Read-Host "Google Redirect URI (e.g. https://yourdomain.com/oauth/google/callback)"
if ($v) { $secrets["GOOGLE_REDIRECT_URI"] = $v }

# Slack
$v = Read-Host "Slack Bot Token (xoxb-...)"
if ($v) { $secrets["SLACK_BOT_TOKEN"] = $v }

# QuickBooks
$v = Read-Host "QuickBooks Client ID"
if ($v) { $secrets["QUICKBOOKS_CLIENT_ID"] = $v }

$v = Read-Host "QuickBooks Client Secret"
if ($v) { $secrets["QUICKBOOKS_CLIENT_SECRET"] = $v }

$v = Read-Host "QuickBooks Redirect URI"
if ($v) { $secrets["QUICKBOOKS_REDIRECT_URI"] = $v }

if ($secrets.Count -eq 0) {
    Write-Host "`nNo secrets entered — nothing to set." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nSetting $($secrets.Count) secret(s)..." -ForegroundColor Green

# Build the supabase secrets set command
$args = $secrets.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
$cmd = "npx supabase secrets set " + ($args -join " ")
Write-Host "Running: npx supabase secrets set [keys...]"
Invoke-Expression $cmd

Write-Host "`n✅ Done! Secrets are live on Supabase." -ForegroundColor Green
