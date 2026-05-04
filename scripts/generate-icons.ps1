Add-Type -AssemblyName System.Drawing

function New-Icon {
    param(
        [int]$Size,
        [string]$OutPath,
        [bool]$Maskable
    )
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Fondo: azul oscuro #0b1220
    $bg = [System.Drawing.Color]::FromArgb(255, 11, 18, 32)
    $g.Clear($bg)

    if ($Maskable) {
        # Para maskable, el "safe zone" es el 80% central. Dibujamos el círculo azul
        # cian llenando el safe zone para que al recortar en círculo siga viéndose bien.
        $pad = [int]($Size * 0.1)
        $rectSize = $Size - 2 * $pad
        $accentRect = New-Object System.Drawing.Rectangle($pad, $pad, $rectSize, $rectSize)
    } else {
        # Normal: círculo ocupando 85%
        $pad = [int]($Size * 0.075)
        $rectSize = $Size - 2 * $pad
        $accentRect = New-Object System.Drawing.Rectangle($pad, $pad, $rectSize, $rectSize)
    }

    # Círculo acento #0ea5e9
    $accent = [System.Drawing.Color]::FromArgb(255, 14, 165, 233)
    $brush = New-Object System.Drawing.SolidBrush($accent)
    $g.FillEllipse($brush, $accentRect)

    # Letra "K" centrada en blanco
    $fontSize = [int]($Size * 0.5)
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $g.DrawString("K", $font, $white, $textRect, $sf)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Creado: $OutPath"
}

$outDir = Join-Path $PSScriptRoot "..\icons"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

New-Icon -Size 192 -OutPath (Join-Path $outDir "icon-192.png") -Maskable $false
New-Icon -Size 512 -OutPath (Join-Path $outDir "icon-512.png") -Maskable $false
New-Icon -Size 192 -OutPath (Join-Path $outDir "icon-192-maskable.png") -Maskable $true
New-Icon -Size 512 -OutPath (Join-Path $outDir "icon-512-maskable.png") -Maskable $true
