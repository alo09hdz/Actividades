Add-Type -AssemblyName System.Drawing

function Generate-PwaIcon([int]$size, [string]$outputPath) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $g.Clear([System.Drawing.Color]::Transparent)

    # 1. Squircle background (Cyber Cyan / Indigo Gradient)
    $radius = [float]($size * 0.22)
    $diameter = [float]($radius * 2.0)
    $sqPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $sqPath.AddArc([float]0, [float]0, $diameter, $diameter, [float]180, [float]90)
    $sqPath.AddArc([float]($size - $diameter), [float]0, $diameter, $diameter, [float]270, [float]90)
    $sqPath.AddArc([float]($size - $diameter), [float]($size - $diameter), $diameter, $diameter, [float]0, [float]90)
    $sqPath.AddArc([float]0, [float]($size - $diameter), $diameter, $diameter, [float]90, [float]90)
    $sqPath.CloseFigure()

    $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 10, 15, 30)   # Deep Space Navy
    $c2 = [System.Drawing.Color]::FromArgb(255, 6, 182, 212)  # Cyan Neon
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $c1, $c2, [float]45.0)
    $g.FillPath($bgBrush, $sqPath)

    # 2. Border glow
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 34, 211, 238), [float]($size * 0.025))
    $g.DrawPath($borderPen, $sqPath)

    # 3. Inner ambient circle
    $glowPad = [float]($size * 0.16)
    $glowDim = [float]($size - (2 * $glowPad))
    $glowRect = [System.Drawing.RectangleF]::new($glowPad, $glowPad, $glowDim, $glowDim)
    $g1 = [System.Drawing.Color]::FromArgb(90, 6, 182, 212)
    $g2 = [System.Drawing.Color]::FromArgb(40, 139, 92, 246)
    $glowBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($glowRect, $g1, $g2, [float]135.0)
    $g.FillEllipse($glowBrush, $glowRect)

    # 4. Stylized Cache Box / Vault & Lightning Bolt
    $s = [float]($size / 100.0)

    # Cache Container (Square with rounded corners)
    $boxX = [float](26 * $s)
    $boxY = [float](28 * $s)
    $boxW = [float](48 * $s)
    $boxH = [float](44 * $s)
    $boxRect = [System.Drawing.RectangleF]::new($boxX, $boxY, $boxW, $boxH)
    $boxBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(180, 15, 23, 42))
    $boxPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 56, 189, 248), [float](2.5 * $s))
    
    $boxPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $bRad = [float](6 * $s)
    $bDiam = [float]($bRad * 2.0)
    $boxPath.AddArc($boxX, $boxY, $bDiam, $bDiam, [float]180, [float]90)
    $boxPath.AddArc(($boxX + $boxW - $bDiam), $boxY, $bDiam, $bDiam, [float]270, [float]90)
    $boxPath.AddArc(($boxX + $boxW - $bDiam), ($boxY + $boxH - $bDiam), $bDiam, $bDiam, [float]0, [float]90)
    $boxPath.AddArc($boxX, ($boxY + $boxH - $bDiam), $bDiam, $bDiam, [float]90, [float]90)
    $boxPath.CloseFigure()
    
    $g.FillPath($boxBrush, $boxPath)
    $g.DrawPath($boxPen, $boxPath)

    # Cache Memory Slots / Stripes
    $slotPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(140, 14, 165, 233), [float](1.5 * $s))
    $g.DrawLine($slotPen, [float](32 * $s), [float](37 * $s), [float](68 * $s), [float](37 * $s))
    $g.DrawLine($slotPen, [float](32 * $s), [float](46 * $s), [float](68 * $s), [float](46 * $s))
    $g.DrawLine($slotPen, [float](32 * $s), [float](55 * $s), [float](68 * $s), [float](55 * $s))

    # Lightning Bolt (Fast Cache-First indicator)
    $boltBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        [System.Drawing.RectangleF]::new([float](40 * $s), [float](30 * $s), [float](26 * $s), [float](44 * $s)),
        [System.Drawing.Color]::FromArgb(255, 250, 204, 21), # Neon Yellow
        [System.Drawing.Color]::FromArgb(255, 245, 158, 11),  # Amber
        [float]90.0
    )
    $boltPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $boltPath.AddPolygon([System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new([float](54 * $s), [float](30 * $s)),
        [System.Drawing.PointF]::new([float](42 * $s), [float](51 * $s)),
        [System.Drawing.PointF]::new([float](50 * $s), [float](51 * $s)),
        [System.Drawing.PointF]::new([float](46 * $s), [float](72 * $s)),
        [System.Drawing.PointF]::new([float](60 * $s), [float](48 * $s)),
        [System.Drawing.PointF]::new([float](52 * $s), [float](48 * $s))
    ))
    $g.FillPath($boltBrush, $boltPath)
    $boltPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 255, 255), [float](1.2 * $s))
    $g.DrawPath($boltPen, $boltPath)

    # Subtext "CACHE" if large enough
    if ($size -ge 192) {
        $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
        $fontSize = [float]($size * 0.08)
        $font = [System.Drawing.Font]::new($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
        $text = "CACHE"
        $textSize = $g.MeasureString($text, $font)
        $textX = [float](($size - $textSize.Width) / 2.0)
        $textY = [float]($size * 0.77)
        $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 241, 245, 249))
        $g.DrawString($text, $font, $textBrush, $textX, $textY)
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generado icono: $outputPath ($size x $size)"
}

function Generate-LogoImage([int]$width, [int]$height, [string]$outputPath) {
    $bmp = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $g.Clear([System.Drawing.Color]::Transparent)

    # Gradient circle logo emblem
    $dim = [float][Math]::Min($width, $height)
    $pad = [float]($dim * 0.05)
    $circleRect = [System.Drawing.RectangleF]::new($pad, $pad, $dim - 2*$pad, $dim - 2*$pad)
    
    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        $circleRect,
        [System.Drawing.Color]::FromArgb(255, 14, 165, 233),
        [System.Drawing.Color]::FromArgb(255, 99, 102, 241),
        [float]45.0
    )
    $g.FillEllipse($brush, $circleRect)
    
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 56, 189, 248), [float]($dim * 0.04))
    $g.DrawEllipse($pen, $circleRect)

    # Bolt & Stack
    $s = [float]($dim / 100.0)
    $boltBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255))
    $boltPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $boltPath.AddPolygon([System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new([float](53 * $s), [float](22 * $s)),
        [System.Drawing.PointF]::new([float](38 * $s), [float](50 * $s)),
        [System.Drawing.PointF]::new([float](49 * $s), [float](50 * $s)),
        [System.Drawing.PointF]::new([float](43 * $s), [float](78 * $s)),
        [System.Drawing.PointF]::new([float](62 * $s), [float](46 * $s)),
        [System.Drawing.PointF]::new([float](52 * $s), [float](46 * $s))
    ))
    $g.FillPath($boltBrush, $boltPath)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generado Logo: $outputPath"
}

function Generate-BannerImage([int]$width, [int]$height, [string]$outputPath) {
    $bmp = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(255, 15, 23, 42))

    # Background subtle grid lines
    $gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(40, 14, 165, 233), 1)
    for ($x = 0; $x -lt $width; $x += 40) {
        $g.DrawLine($gridPen, $x, 0, $x, $height)
    }
    for ($y = 0; $y -lt $height; $y += 40) {
        $g.DrawLine($gridPen, 0, $y, $width, $y)
    }

    # Center glowing capsule
    $rect = [System.Drawing.Rectangle]::new(30, 20, $width - 60, $height - 40)
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        $rect,
        [System.Drawing.Color]::FromArgb(220, 12, 74, 110),
        [System.Drawing.Color]::FromArgb(220, 30, 27, 75),
        [float]45.0
    )
    $g.FillRectangle($bgBrush, $rect)
    $border = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 56, 189, 248), 2)
    $g.DrawRectangle($border, $rect)

    # Title text
    $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
    $fontTitle = [System.Drawing.Font]::new($fontFamily, 22, [System.Drawing.FontStyle]::Bold)
    $fontSub = [System.Drawing.Font]::new($fontFamily, 13, [System.Drawing.FontStyle]::Regular)
    
    $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
    $cyan = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 56, 189, 248))

    $g.DrawString("APP SHELL - RECURSO ESTÁTICO CACHEADO", $fontTitle, $cyan, [float]60, [float]40)
    $g.DrawString("Estrategia Cache-First: Servido de forma instantánea (<5ms) desde Cache Storage", $fontSub, $white, [float]60, [float]80)
    $g.DrawString("Offline-Ready // Evento Install // Cache API W3C Standard", $fontSub, $cyan, [float]60, [float]110)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generado Banner: $outputPath"
}

# Run generations
$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = "c:\Users\LABTI-23\Documents\guillermo\act4" }

Generate-PwaIcon 192 "$baseDir\icons\icon-192.png"
Generate-PwaIcon 512 "$baseDir\icons\icon-512.png"
Generate-PwaIcon 72 "$baseDir\icons\badge-72.png"
Generate-LogoImage 128 128 "$baseDir\img\app-logo.png"
Generate-LogoImage 96 96 "$baseDir\img\cache-chip.png"
Generate-BannerImage 760 160 "$baseDir\img\shell-banner.png"

Write-Host "✅ Todos los recursos gráficos del App Shell han sido generados exitosamente."
