Add-Type -AssemblyName System.Drawing

function New-Icon {
    param(
        [int]$Size,
        [string]$Path,
        [bool]$Maskable
    )
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $c1 = [System.Drawing.Color]::FromArgb(14, 165, 233)
    $c2 = [System.Drawing.Color]::FromArgb(99, 102, 241)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45)

    if ($Maskable) {
        $g.FillRectangle($brush, $rect)
    } else {
        $radius = [int]($Size * 0.1875)
        $d = $radius * 2
        $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
        $gp.AddArc(0, 0, $d, $d, 180, 90)
        $gp.AddArc($Size - $d, 0, $d, $d, 270, 90)
        $gp.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
        $gp.AddArc(0, $Size - $d, $d, $d, 90, 90)
        $gp.CloseFigure()
        $g.FillPath($brush, $gp)
    }

    if ($Maskable) { $inset = [int]($Size * 0.2) } else { $inset = 0 }
    $fontSize = ($Size - $inset * 2) * 0.55
    $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF($inset, $inset, $Size - $inset * 2, $Size - $inset * 2)
    $g.DrawString('P', $font, [System.Drawing.Brushes]::White, $textRect, $sf)

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created $Path"
}

$root = Split-Path -Parent $PSScriptRoot
$iconsDir = Join-Path $root 'icons'
if (-not (Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir | Out-Null }

New-Icon -Size 192 -Path (Join-Path $iconsDir 'icon-192.png') -Maskable $false
New-Icon -Size 512 -Path (Join-Path $iconsDir 'icon-512.png') -Maskable $false
New-Icon -Size 512 -Path (Join-Path $iconsDir 'icon-maskable-512.png') -Maskable $true
