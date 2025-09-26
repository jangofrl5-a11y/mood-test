# Simple PowerShell smoke test for the deployed proxy endpoint
# Usage: .\scripts\smoke_test_proxy.ps1 https://.../api/proxyGemini
param(
    [string]$url = 'http://localhost:5001/YOUR_PROJECT/us-central1/proxyGemini'
)

Write-Output "Testing proxy at $url"

$body = @{ prompt = @{ text = 'Say hello in a friendly tone' }; temperature = 0.2; maxOutputTokens = 64 } | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Output "Response:`n$res"
} catch {
    Write-Error "Request failed: $_"
    exit 2
}
