Add-Type -AssemblyName System.Drawing

function Generate-PwaIcon([int]$size, [string]$outputPath) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $g.Clear([System.Drawing.Color]::Transparent)

    # 1. Background Squircle / Rounded Rectangle
    $radius = [float]($size * 0.20)
    $diameter = [float]($radius * 2.0)
    $sqPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $sqPath.AddArc([float]0, [float]0, $diameter, $diameter, [float]180, [float]90)
    $sqPath.AddArc([float]($size - $diameter), [float]0, $diameter, $diameter, [float]270, [float]90)
    $sqPath.AddArc([float]($size - $diameter), [float]($size - $diameter), $diameter, $diameter, [float]0, [float]90)
    $sqPath.AddArc([float]0, [float]($size - $diameter), $diameter, $diameter, [float]90, [float]90)
    $sqPath.CloseFigure()

    $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)    # Slate 900
    $c2 = [System.Drawing.Color]::FromArgb(255, 79, 70, 229)   # Indigo 600
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $c1, $c2, [float]45.0)
    $g.FillPath($bgBrush, $sqPath)

    # 2. Outer Border / subtle neon glow
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 129, 140, 248), [float]($size * 0.025))
    $g.DrawPath($borderPen, $sqPath)

    # 3. Ambient inner circular glow
    $glowPad = [float]($size * 0.15)
    $glowDim = [float]($size - (2 * $glowPad))
    $glowRect = [System.Drawing.RectangleF]::new($glowPad, $glowPad, $glowDim, $glowDim)
    $g1 = [System.Drawing.Color]::FromArgb(90, 99, 102, 241)
    $g2 = [System.Drawing.Color]::FromArgb(40, 236, 72, 153)
    $glowBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($glowRect, $g1, $g2, [float]135.0)
    $g.FillEllipse($glowBrush, $glowRect)

    # 4. Stylized Futuristic Lightning / Apex Crest
    $s = [float]($size / 100.0)
    $pts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new([float](52 * $s), [float](18 * $s)),
        [System.Drawing.PointF]::new([float](68 * $s), [float](42 * $s)),
        [System.Drawing.PointF]::new([float](54 * $s), [float](42 * $s)),
        [System.Drawing.PointF]::new([float](64 * $s), [float](68 * $s)),
        [System.Drawing.PointF]::new([float](36 * $s), [float](46 * $s)),
        [System.Drawing.PointF]::new([float](48 * $s), [float](46 * $s))
    )
    $symRect = [System.Drawing.RectangleF]::new([float](36 * $s), [float](18 * $s), [float](32 * $s), [float](50 * $s))
    $symBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($symRect, [System.Drawing.Color]::FromArgb(255, 255, 255, 255), [System.Drawing.Color]::FromArgb(255, 199, 210, 254), [float]90.0)
    $g.FillPolygon($symBrush, $pts)

    $symBorderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(200, 99, 102, 241), [float](1.6 * $s))
    $g.DrawPolygon($symBorderPen, $pts)

    # 5. Label "PWA"
    $fontFamily = [System.Drawing.FontFamily]::new("Segoe UI")
    $fontSize = [float]($size * 0.12)
    $font = [System.Drawing.Font]::new($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(245, 248, 255))
    
    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = [System.Drawing.RectangleF]::new([float]0, [float]($size * 0.72), [float]$size, [float]($size * 0.20))
    $g.DrawString("PWA", $font, $textBrush, $textRect, $sf)

    # Save PNG
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Cleanup
    $sf.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    $fontFamily.Dispose()
    $symBorderPen.Dispose()
    $symBrush.Dispose()
    $glowBrush.Dispose()
    $borderPen.Dispose()
    $bgBrush.Dispose()
    $sqPath.Dispose()
    $g.Dispose()
    $bmp.Dispose()

    Write-Host "Generated: $outputPath ($size x $size)"
}

$iconsDir = "c:\Users\LABTI-23\Documents\guillermo\act1\icons"
Generate-PwaIcon -size 192 -outputPath "$iconsDir\icon-192x192.png"
Generate-PwaIcon -size 512 -outputPath "$iconsDir\icon-512x512.png"
