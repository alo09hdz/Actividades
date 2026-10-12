Add-Type -AssemblyName System.Drawing

function Generate-PwaIcon([int]$size, [string]$outputPath) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $g.Clear([System.Drawing.Color]::Transparent)

    # 1. Background Squircle (Rose / Amber / Dark Violet Gradient)
    $radius = [float]($size * 0.22)
    $diameter = [float]($radius * 2.0)
    $sqPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $sqPath.AddArc([float]0, [float]0, $diameter, $diameter, [float]180, [float]90)
    $sqPath.AddArc([float]($size - $diameter), [float]0, $diameter, $diameter, [float]270, [float]90)
    $sqPath.AddArc([float]($size - $diameter), [float]($size - $diameter), $diameter, $diameter, [float]0, [float]90)
    $sqPath.AddArc([float]0, [float]($size - $diameter), $diameter, $diameter, [float]90, [float]90)
    $sqPath.CloseFigure()

    $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)    # Dark Navy Slate
    $c2 = [System.Drawing.Color]::FromArgb(255, 244, 63, 94)   # Rose Red (Offline indicator)
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $c1, $c2, [float]45.0)
    $g.FillPath($bgBrush, $sqPath)

    # 2. Glowing outer border
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 251, 113, 133), [float]($size * 0.025))
    $g.DrawPath($borderPen, $sqPath)

    # 3. Inner ambient radar glow
    $glowPad = [float]($size * 0.16)
    $glowDim = [float]($size - (2 * $glowPad))
    $glowRect = [System.Drawing.RectangleF]::new($glowPad, $glowPad, $glowDim, $glowDim)
    $g1 = [System.Drawing.Color]::FromArgb(100, 244, 63, 94)
    $g2 = [System.Drawing.Color]::FromArgb(40, 245, 158, 11)
    $glowBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($glowRect, $g1, $g2, [float]135.0)
    $g.FillEllipse($glowBrush, $glowRect)

    # 4. Stylized Offline Wifi Symbol with Slash
    $s = [float]($size / 100.0)
    $cx = [float](50 * $s)
    $cy = [float](62 * $s)

    # Wifi Dot
    $dotBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255))
    $g.FillEllipse($dotBrush, [float]($cx - (4 * $s)), [float]($cy - (4 * $s)), [float](8 * $s), [float](8 * $s))

    # Wifi Arcs
    $arcPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(240, 255, 255, 255), [float](4 * $s))
    $arcPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arcPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Arc 1 (inner)
    $g.DrawArc($arcPen, [float]($cx - (15 * $s)), [float]($cy - (15 * $s)), [float](30 * $s), [float](30 * $s), [float]225, [float]90)

    # Arc 2 (middle)
    $g.DrawArc($arcPen, [float]($cx - (25 * $s)), [float]($cy - (25 * $s)), [float](50 * $s), [float](50 * $s), [float]225, [float]90)

    # Arc 3 (outer)
    $g.DrawArc($arcPen, [float]($cx - (35 * $s)), [float]($cy - (35 * $s)), [float](70 * $s), [float](70 * $s), [float]225, [float]90)

    # Disconnect Slash (Red Neon line crossing through)
    $slashPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 244, 63, 94), [float](5.5 * $s))
    $slashPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $slashPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($slashPen, [float](22 * $s), [float](22 * $s), [float](78 * $s), [float](78 * $s))

    $slashInnerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 255, 255), [float](2.2 * $s))
    $slashInnerPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $slashInnerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($slashInnerPen, [float](22 * $s), [float](22 * $s), [float](78 * $s), [float](78 * $s))

    # Subtext "OFFLINE" if size >= 192
    if ($size -ge 192) {
        $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
        $fontSize = [float]($size * 0.08)
        $font = [System.Drawing.Font]::new($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
        $text = "OFFLINE"
        $textSize = $g.MeasureString($text, $font)
        $textX = [float](($size - $textSize.Width) / 2.0)
        $textY = [float]($size * 0.82)
        $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(240, 254, 205, 211))
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
    $g.Clear([System.Drawing.Color]::Transparent)

    $dim = [float][Math]::Min($width, $height)
    $pad = [float]($dim * 0.05)
    $rect = [System.Drawing.RectangleF]::new($pad, $pad, $dim - 2*$pad, $dim - 2*$pad)

    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 244, 63, 94),
        [System.Drawing.Color]::FromArgb(255, 139, 92, 246),
        [float]45.0
    )
    $g.FillEllipse($brush, $rect)

    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 251, 113, 133), [float]($dim * 0.04))
    $g.DrawEllipse($borderPen, $rect)

    # Disconnected beacon
    $s = [float]($dim / 100.0)
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 255, 255), [float](4 * $s))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    
    $g.DrawArc($pen, [float](25 * $s), [float](25 * $s), [float](50 * $s), [float](50 * $s), [float]225, [float]90)
    $g.DrawArc($pen, [float](35 * $s), [float](35 * $s), [float](30 * $s), [float](30 * $s), [float]225, [float]90)
    
    $dotBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255))
    $g.FillEllipse($dotBrush, [float](46 * $s), [float](60 * $s), [float](8 * $s), [float](8 * $s))

    # Cross slash
    $slash = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 244, 63, 94), [float](5 * $s))
    $g.DrawLine($slash, [float](24 * $s), [float](24 * $s), [float](76 * $s), [float](76 * $s))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generado Logo: $outputPath"
}

function Generate-OfflineIllustration([int]$width, [int]$height, [string]$outputPath) {
    $bmp = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(255, 15, 23, 42))

    # Subtle radar rings in background
    $cx = [float]($width / 2.0)
    $cy = [float]($height / 2.0 - 15)

    $ringPen1 = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(35, 244, 63, 94), 1)
    $ringPen2 = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(45, 245, 158, 11), 1)
    
    $g.DrawEllipse($ringPen1, [float]($cx - 180), [float]($cy - 100), [float]360, [float]200)
    $g.DrawEllipse($ringPen2, [float]($cx - 130), [float]($cy - 75), [float]260, [float]150)
    $g.DrawEllipse($ringPen1, [float]($cx - 80), [float]($cy - 50), [float]160, [float]100)

    # Cloud with offline cross
    $cloudBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(180, 30, 41, 59))
    $cloudPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 148, 163, 184), 3)

    # Cloud body (overlapping circles and rectangle)
    $g.FillEllipse($cloudBrush, [float]($cx - 70), [float]($cy - 40), [float]60, [float]60)
    $g.FillEllipse($cloudBrush, [float]($cx - 30), [float]($cy - 65), [float]80, [float]80)
    $g.FillEllipse($cloudBrush, [float]($cx + 25), [float]($cy - 35), [float]55, [float]55)
    $g.FillRectangle($cloudBrush, [float]($cx - 45), [float]($cy - 10), [float]95, [float]32)

    # Offline Warning Shield
    $shieldW = [float]50
    $shieldH = [float]56
    $sx = [float]($cx - ($shieldW / 2))
    $sy = [float]($cy + 5)
    
    $sBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        [System.Drawing.RectangleF]::new($sx, $sy, $shieldW, $shieldH),
        [System.Drawing.Color]::FromArgb(255, 244, 63, 94),
        [System.Drawing.Color]::FromArgb(255, 225, 29, 72),
        [float]90.0
    )
    $g.FillRectangle($sBrush, $sx, $sy, $shieldW, $shieldH)
    $sPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 255, 255), 2)
    $g.DrawRectangle($sPen, $sx, $sy, $shieldW, $shieldH)

    # Exclamation mark inside shield
    $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
    $font = [System.Drawing.Font]::new($fontFamily, 26, [System.Drawing.FontStyle]::Bold)
    $g.DrawString("!", $font, [System.Drawing.Brushes]::White, [float]($sx + 14), [float]($sy + 5))

    # Bottom Text banner
    $fontTitle = [System.Drawing.Font]::new($fontFamily, 13, [System.Drawing.FontStyle]::Bold)
    $g.DrawString("RESPUESTA ALTERNATIVA FALLBACK ACTIVA", $fontTitle, [System.Drawing.Brushes]::Coral, [float]($cx - 150), [float]($height - 35))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generada Ilustración Offline: $outputPath"
}

function Generate-OfflinePlaceholder([int]$size, [string]$outputPath) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(255, 30, 41, 59))

    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 244, 63, 94), 3)
    $g.DrawRectangle($pen, 10, 10, $size - 20, $size - 20)

    $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
    $font = [System.Drawing.Font]::new($fontFamily, 12, [System.Drawing.FontStyle]::Bold)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 251, 113, 133))
    $g.DrawString("IMAGEN", $font, $brush, [float]($size * 0.3), [float]($size * 0.38))
    $g.DrawString("OFFLINE", $font, $brush, [float]($size * 0.28), [float]($size * 0.52))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generado Placeholder de Imagen: $outputPath"
}

# Run generations
$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = "c:\Users\LABTI-23\Documents\guillermo\act5" }

Generate-PwaIcon 192 "$baseDir\icons\icon-192.png"
Generate-PwaIcon 512 "$baseDir\icons\icon-512.png"
Generate-PwaIcon 72 "$baseDir\icons\badge-72.png"
Generate-LogoImage 128 128 "$baseDir\img\app-logo.png"
Generate-OfflineIllustration 480 260 "$baseDir\img\offline-art.png"
Generate-OfflinePlaceholder 200 "$baseDir\img\offline-placeholder.png"

Write-Host "✅ Todos los recursos gráficos de la Actividad 5 han sido generados exitosamente."
