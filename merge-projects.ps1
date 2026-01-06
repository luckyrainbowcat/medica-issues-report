# Script สำหรับยุบรวมโปรเจกต์ project1 เข้ากับโปรเจกต์หลัก

Write-Host "Starting project merge..." -ForegroundColor Green

# 1. ย้าย backend files จาก project1/src ไปที่ src/service-management-backend
Write-Host "`n1. Moving backend files..." -ForegroundColor Yellow
if (Test-Path "project1\src") {
    if (-not (Test-Path "src\service-management-backend")) {
        New-Item -ItemType Directory -Path "src\service-management-backend" -Force | Out-Null
    }
    Copy-Item -Path "project1\src\*" -Destination "src\service-management-backend\" -Recurse -Force
    Write-Host "   Backend files moved successfully" -ForegroundColor Green
} else {
    Write-Host "   project1\src not found, skipping..." -ForegroundColor Yellow
}

# 2. ย้าย frontend files จาก project1/web/app ไปที่ src/app/service-management
Write-Host "`n2. Moving frontend files..." -ForegroundColor Yellow
if (Test-Path "project1\web\app") {
    if (-not (Test-Path "src\app\service-management")) {
        New-Item -ItemType Directory -Path "src\app\service-management" -Force | Out-Null
    }
    Copy-Item -Path "project1\web\app\*" -Destination "src\app\service-management\" -Recurse -Force
    Write-Host "   Frontend files moved successfully" -ForegroundColor Green
} else {
    Write-Host "   project1\web\app not found, skipping..." -ForegroundColor Yellow
}

# 3. ย้าย components จาก project1/web/components ไปที่ src/components/service-management
Write-Host "`n3. Moving components..." -ForegroundColor Yellow
if (Test-Path "project1\web\components") {
    if (-not (Test-Path "src\components\service-management")) {
        New-Item -ItemType Directory -Path "src\components\service-management" -Force | Out-Null
    }
    Copy-Item -Path "project1\web\components\*" -Destination "src\components\service-management\" -Recurse -Force
    Write-Host "   Components moved successfully" -ForegroundColor Green
} else {
    Write-Host "   project1\web\components not found, skipping..." -ForegroundColor Yellow
}

# 4. ย้าย lib จาก project1/web/lib ไปที่ src/lib/service-management
Write-Host "`n4. Moving lib files..." -ForegroundColor Yellow
if (Test-Path "project1\web\lib") {
    if (-not (Test-Path "src\lib\service-management")) {
        New-Item -ItemType Directory -Path "src\lib\service-management" -Force | Out-Null
    }
    Copy-Item -Path "project1\web\lib\*" -Destination "src\lib\service-management\" -Recurse -Force
    Write-Host "   Lib files moved successfully" -ForegroundColor Green
} else {
    Write-Host "   project1\web\lib not found, skipping..." -ForegroundColor Yellow
}

# 5. คัดลอก serviceAccountKey.json ถ้ามี
Write-Host "`n5. Copying serviceAccountKey.json..." -ForegroundColor Yellow
if (Test-Path "project1\serviceAccountKey.json") {
    Copy-Item -Path "project1\serviceAccountKey.json" -Destination "serviceAccountKey.json" -Force
    Write-Host "   serviceAccountKey.json copied successfully" -ForegroundColor Green
} else {
    Write-Host "   serviceAccountKey.json not found, skipping..." -ForegroundColor Yellow
}

Write-Host "`nProject merge completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update package.json to merge dependencies" -ForegroundColor White
Write-Host "2. Update import paths in moved files" -ForegroundColor White
Write-Host "3. Update Header.tsx to link to /service-management" -ForegroundColor White
Write-Host "4. Update API URLs in frontend files" -ForegroundColor White

