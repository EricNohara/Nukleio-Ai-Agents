$ErrorActionPreference = "Stop"

$layerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodejsRoot = Join-Path $layerRoot "nodejs"
$artifactPath = Join-Path $layerRoot "puppeteer-layer-node24-x86_64.zip"

npm install --prefix $nodejsRoot --omit=dev

if (Test-Path -LiteralPath $artifactPath) {
  Remove-Item -LiteralPath $artifactPath -Force
}

Push-Location $layerRoot
try {
  tar.exe -a -c -f $artifactPath "nodejs"
  if ($LASTEXITCODE -ne 0) {
    throw "tar.exe failed to create the layer artifact"
  }
} finally {
  Pop-Location
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($artifactPath)
try {
  $requiredEntries = @(
    "nodejs/node_modules/@sparticuz/chromium/bin/chromium.br",
    "nodejs/node_modules/@sparticuz/chromium/bin/al2023.tar.br",
    "nodejs/node_modules/puppeteer-core/package.json"
  )

  foreach ($requiredEntry in $requiredEntries) {
    if (-not ($archive.Entries.FullName -contains $requiredEntry)) {
      throw "Layer artifact is missing required entry: $requiredEntry"
    }
  }
} finally {
  $archive.Dispose()
}

Get-Item -LiteralPath $artifactPath | Select-Object FullName, Length
