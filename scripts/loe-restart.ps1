# Clean restart helper for League of English dev stack
param()

$ErrorActionPreference = "Continue"

Write-Host "Stopping running Node/npm processes (if any)..."
foreach ($name in @('node','npm','concurrently')) {
    Get-Process -Name $name -ErrorAction SilentlyContinue |
        ForEach-Object {
            $proc = $_
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                Write-Host ("   - Stopped {0} (PID {1})" -f $proc.ProcessName, $proc.Id)
            }
            catch {
                Write-Host ("   - Could not stop {0} (PID {1}): {2}" -f $proc.ProcessName, $proc.Id, $_.Exception.Message)
            }
        }
}

Write-Host "Freeing ports 3000 and 5000..."
foreach ($port in @(3000, 5000)) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess |
        Sort-Object -Unique |
        ForEach-Object {
            $processId = $_
            if ($processId -gt 0) {
                try {
                    Stop-Process -Id $processId -Force -ErrorAction Stop
                    Write-Host ("   - Cleared PID {0} on port {1}" -f $processId, $port)
                }
                catch {
                    Write-Host ("   - Could not clear PID {0} on port {1}: {2}" -f $processId, $port, $_.Exception.Message)
                }
            }
        }
}

Write-Host "Using npx kill-port for extra safety..."
& npx.cmd --yes kill-port 3000 5000 | Out-Null

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

Write-Host "Starting npm run dev:all (frontend + backend)..."
Write-Host "(Use Ctrl + C in this window to stop when you are done)"

& npm.cmd run dev:all
