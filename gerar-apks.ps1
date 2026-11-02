# Gera os dois APKs do Heritage Barber (versão completa e demo).
# Uso: clique com o botão direito > "Executar com o PowerShell"
#      ou, no terminal:  powershell -ExecutionPolicy Bypass -File .\gerar-apks.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = (Get-ChildItem "C:\Program Files\Microsoft" -Directory -Filter "jdk-21*" | Select-Object -First 1).FullName }
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
"sdk.dir=" + ($sdk -replace '\\','\\') | Out-File "android\local.properties" -Encoding ascii

Write-Host "1/3 Copiando o app para o projeto Android..." -ForegroundColor Yellow
npm run sync
if ($LASTEXITCODE -ne 0) { throw "Falha ao sincronizar" }
Copy-Item "android-overrides\demo" "android\app\src\" -Recurse -Force

Write-Host "2/3 Compilando (a primeira vez demora alguns minutos)..." -ForegroundColor Yellow
Push-Location android
.\gradlew.bat assembleFullDebug assembleDemoDebug --no-daemon -q
$ok = $LASTEXITCODE
Pop-Location
if ($ok -ne 0) { throw "Falha na compilação" }

Write-Host "3/3 Copiando os APKs para a pasta APKs\..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force "APKs" | Out-Null
Copy-Item "android\app\build\outputs\apk\full\debug\app-full-debug.apk" "APKs\Heritage-Barber.apk" -Force
Copy-Item "android\app\build\outputs\apk\demo\debug\app-demo-debug.apk" "APKs\Heritage-Barber-DEMO.apk" -Force
Get-ChildItem "APKs" | ForEach-Object { "{0}  ({1:N1} MB)" -f $_.Name, ($_.Length/1MB) }
Write-Host "Pronto!" -ForegroundColor Green
