$ErrorActionPreference = "Stop"

# Always run from script directory
Set-Location $PSScriptRoot

$logFile = "run.log"
"[$(Get-Date)] Starting Postman run" | Out-File $logFile -Append

Write-Host "Running from: $(Get-Location)"
Write-Host "Starting Postman collection run..."

newman run postman/CHOPLIFE_DEV.postman_collection.json `
    -e postman/CHOPLIFE_DEV.postman_environment.json `
    --reporters json `
    --reporter-json-export result.json

Write-Host "Postman run completed."
"[$(Get-Date)] Postman run completed" | Out-File $logFile -Append

# Safety check
if (!(Test-Path "result.json")) {
    Write-Error "❌ result.json not generated. Aborting."
    "[$(Get-Date)] ERROR: result.json missing" | Out-File $logFile -Append
    exit 1
}

Write-Host "Sending Slack report..."
"[$(Get-Date)] Sending Slack report" | Out-File $logFile -Append

node slack-report.js

"[$(Get-Date)] Slack report sent successfully" | Out-File $logFile -Append

exit 0
