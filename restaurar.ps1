# =============================================================
#  RESTAURAR o projeto Heritage Barber em um computador novo
# =============================================================
# 1. Copie esta pasta (do .zip, do GitHub ou do backup no claude.ai) para o computador.
# 2. Clique com o botão direito neste arquivo > "Executar com o PowerShell"
#    (ou no terminal: powershell -ExecutionPolicy Bypass -File .\restaurar.ps1)
# 3. No fim, os APKs aparecem na pasta APKs\
#
# O script instala o que faltar (Node.js, Java 21, Android SDK), recria a pasta
# android\ com as personalizações (versões completa e demo, ícones) e gera os APKs.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
function Passo($t){ Write-Host "`n== $t" -ForegroundColor Yellow }
function AtualizaPath { $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User") }

Passo "1/6 Programas necessários"
AtualizaPath
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements; AtualizaPath }
$jdk = Get-ChildItem "C:\Program Files\Microsoft" -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdk) { winget install --id Microsoft.OpenJDK.21 -e --accept-package-agreements --accept-source-agreements; $jdk = Get-ChildItem "C:\Program Files\Microsoft" -Directory -Filter "jdk-21*" | Select-Object -First 1 }
$env:JAVA_HOME = $jdk.FullName; [Environment]::SetEnvironmentVariable("JAVA_HOME", $jdk.FullName, "User")
Write-Host "Node $(node -v) | Java: $($jdk.Name)"

Passo "2/6 Android SDK"
$sdk = "$env:LOCALAPPDATA\Android\Sdk"; $sm = "$sdk\cmdline-tools\latest\bin\sdkmanager.bat"
if (-not (Test-Path $sm)) {
  New-Item -ItemType Directory -Force "$sdk\cmdline-tools" | Out-Null
  $zip = "$env:TEMP\cmdline-tools.zip"
  curl.exe -L --fail -o $zip "https://dl.google.com/android/repository/commandlinetools-win-16111833_latest.zip"
  Expand-Archive $zip "$sdk\cmdline-tools\tmp" -Force
  Move-Item "$sdk\cmdline-tools\tmp\cmdline-tools" "$sdk\cmdline-tools\latest"
}
("y`n" * 30) | & $sm --licenses | Out-Null
& $sm "platform-tools" "platforms/android-35" "build-tools/35.0.0" | Out-Null
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdk, "User"); $env:ANDROID_HOME = $sdk

Passo "3/6 Bibliotecas do projeto (npm install)"
npm install --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { throw "npm install falhou" }
npm run vendor

Passo "4/6 Projeto Android"
if (-not (Test-Path "android\app\build.gradle")) { npx cap add android }
Copy-Item "android-overrides\build.gradle" "android\app\build.gradle" -Force
Copy-Item "android-overrides\demo" "android\app\src\" -Recurse -Force

Passo "5/6 Ícones (completo e DEMO)"
$gerar = { npx capacitor-assets generate --android --iconBackgroundColor "#19120b" --iconBackgroundColorDark "#19120b" --splashBackgroundColor "#19120b" --splashBackgroundColorDark "#19120b" | Out-Null }
node scripts/icones.js demo; & $gerar
Get-ChildItem "android\app\src\main\res" -Directory | Where-Object { $_.Name -match '^(mipmap|drawable)' } | ForEach-Object { Copy-Item $_.FullName "android\app\src\demo\res\" -Recurse -Force }
node scripts/icones.js; & $gerar

Passo "6/6 Gerando os APKs"
& "$PSScriptRoot\gerar-apks.ps1"
Write-Host "`nProjeto restaurado!" -ForegroundColor Green
