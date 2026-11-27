param(
    [string]$JMeterBat = "",
    [string]$TargetHost = "127.0.0.1",
    [int]$TargetPort = 8080,
    [string]$Protocol = "http",
    [string]$AuthEmail = "",
    [string]$AuthPassword = "",
    [int]$DurationSeconds = 0
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $RootDir
$EnvFile = Join-Path $RepoRoot ".env"

if (-not $env:JAVA_HOME -and (Test-Path "C:\Program Files\Java\jdk-21")) {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
}

if ([string]::IsNullOrWhiteSpace($JMeterBat)) {
    $cmd = Get-Command jmeter.bat -ErrorAction SilentlyContinue
    if ($cmd) {
        $JMeterBat = $cmd.Source
    } elseif ($env:JMETER_HOME -and (Test-Path (Join-Path $env:JMETER_HOME "bin\jmeter.bat"))) {
        $JMeterBat = Join-Path $env:JMETER_HOME "bin\jmeter.bat"
    } elseif (Test-Path "$env:USERPROFILE\.jmeter\apache-jmeter-5.6.3\bin\jmeter.bat") {
        $JMeterBat = "$env:USERPROFILE\.jmeter\apache-jmeter-5.6.3\bin\jmeter.bat"
    } else {
        throw "Apache JMeter not found. Set JMETER_HOME or pass -JMeterBat."
    }
}

if (Test-Path $EnvFile) {
    $envLines = Get-Content $EnvFile
    if ([string]::IsNullOrWhiteSpace($AuthEmail)) {
        $line = $envLines | Where-Object { $_ -match '^CALLFLOW_DEV_ADMIN_EMAIL=(.+)$' } | Select-Object -First 1
        if ($line -match '^CALLFLOW_DEV_ADMIN_EMAIL=(.+)$') { $AuthEmail = $Matches[1].Trim() }
    }
    if ([string]::IsNullOrWhiteSpace($AuthPassword)) {
        $line = $envLines | Where-Object { $_ -match '^CALLFLOW_DEV_ADMIN_PASSWORD=(.+)$' } | Select-Object -First 1
        if ($line -match '^CALLFLOW_DEV_ADMIN_PASSWORD=(.+)$') { $AuthPassword = $Matches[1].Trim() }
    }
}

if ([string]::IsNullOrWhiteSpace($AuthEmail)) { $AuthEmail = "admin@callflow.local" }
if ([string]::IsNullOrWhiteSpace($AuthPassword)) {
    throw "AuthPassword is required. Set CALLFLOW_DEV_ADMIN_PASSWORD in .env or pass -AuthPassword."
}

$PlansDir = Join-Path $RootDir "test-plans"
$ResultsDir = Join-Path $RootDir "results"
$ReportsDir = Join-Path $RootDir "reports"

New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null
New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null

$Plans = @(
    @{ Name = "01-concurrent-call-creation"; File = "01-concurrent-call-creation.jmx" },
    @{ Name = "02-customer-search-retrieval"; File = "02-customer-search-retrieval.jmx" },
    @{ Name = "03-call-assignment"; File = "03-call-assignment.jmx" },
    @{ Name = "04-complete-call-lifecycle"; File = "04-complete-call-lifecycle.jmx" },
    @{ Name = "05-analytics-performance"; File = "05-analytics-performance.jmx" }
)

$SummaryRows = @()

foreach ($plan in $Plans) {
    $name = $plan.Name
    $jmxPath = Join-Path $PlansDir $plan.File
    $jtlPath = Join-Path $ResultsDir "$name.jtl"
    $reportDir = Join-Path $ReportsDir $name
    $jmeterLog = Join-Path $ResultsDir "$name.log"

    if (Test-Path $jtlPath) { Remove-Item $jtlPath -Force }
    if (Test-Path $jmeterLog) { Remove-Item $jmeterLog -Force }
    if (Test-Path $reportDir) { Remove-Item $reportDir -Recurse -Force }

    Write-Host "Running $name ..." -ForegroundColor Cyan

    $jmeterArgs = @(
        "-n",
        "-t", $jmxPath,
        "-l", $jtlPath,
        "-j", $jmeterLog,
        "-e",
        "-o", $reportDir,
        "-Jhost=$TargetHost",
        "-Jport=$TargetPort",
        "-Jprotocol=$Protocol",
        "-JauthEmail=$AuthEmail",
        "-JauthPassword=$AuthPassword"
    )
    if ($DurationSeconds -gt 0) {
        $jmeterArgs += "-Jduration=$DurationSeconds"
    }

    $escapedArgs = $jmeterArgs | ForEach-Object {
        if ($_ -match '[\s"&|<>^]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }
    cmd /c "`"$JMeterBat`" $($escapedArgs -join ' ') < NUL"
    if ($LASTEXITCODE -ne 0) {
        throw "JMeter execution failed for $name with exit code $LASTEXITCODE"
    }

    $statsPath = Join-Path $reportDir "statistics.json"
    if (Test-Path $statsPath) {
        $stats = Get-Content $statsPath -Raw | ConvertFrom-Json
        $total = $stats.Total
        $SummaryRows += [PSCustomObject]@{
            Scenario    = $name
            Samples     = $total.sampleCount
            Errors      = $total.errorCount
            ErrorPct    = [math]::Round($total.errorPct, 2)
            AvgMs       = [math]::Round($total.meanResTime, 2)
            P90Ms       = [math]::Round($total.pct1ResTime, 2)
            P95Ms       = [math]::Round($total.pct2ResTime, 2)
            Throughput  = [math]::Round($total.throughput, 2)
        }
    }
}

Write-Host "`n=== JMeter Performance Summary ===" -ForegroundColor Green
$SummaryRows | Format-Table -AutoSize
