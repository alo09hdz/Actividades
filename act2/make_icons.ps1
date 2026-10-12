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
    $radius = [float]($size * 0.22)
    $diameter = [float]($radius * 2.0)
    $sqPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $sqPath.AddArc([float]0, [float]0, $diameter, $diameter, [float]180, [float]90)
    $sqPath.AddArc([float]($size - $diameter), [float]0, $diameter, $diameter, [float]270, [float]90)
    $sqPath.AddArc([float]($size - $diameter), [float]($size - $diameter), $diameter, $diameter, [float]0, [float]90)
    $sqPath.AddArc([float]0, [float]($size - $diameter), $diameter, $diameter, [float]90, [float]90)
    $sqPath.CloseFigure()

    $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 10, 15, 29)    # Deep Slate
    $c2 = [System.Drawing.Color]::FromArgb(255, 99, 102, 241)  # Electric Indigo
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $c1, $c2, [float]45.0)
    $g.FillPath($bgBrush, $sqPath)

    # 2. Outer Border / Neon Glow
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(200, 168, 85, 247), [float]($size * 0.025))
    $g.DrawPath($borderPen, $sqPath)

    # 3. Ambient inner circular glow
    $glowPad = [float]($size * 0.16)
    $glowDim = [float]($size - (2 * $glowPad))
    $glowRect = [System.Drawing.RectangleF]::new($glowPad, $glowPad, $glowDim, $glowDim)
    $g1 = [System.Drawing.Color]::FromArgb(100, 129, 140, 248)
    $g2 = [System.Drawing.Color]::FromArgb(50, 236, 72, 153)
    $glowBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($glowRect, $g1, $g2, [float]135.0)
    $g.FillEllipse($glowBrush, $glowRect)

    # 4. Stylized App Shell Shield Icon (Symbolizing Shell architecture)
    $s = [float]($size / 100.0)
    $shieldPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $shieldPath.AddLine([float](50 * $s), [float](18 * $s), [float](76 * $s), [float](28 * $s))
    $shieldPath.AddLine([float](76 * $s), [float](28 * $s), [float](76 * $s), [float](50 * $s))
    $shieldPath.AddBezier([float](76 * $s), [float](50 * $s), [float](74 * $s), [float](68 * $s), [float](50 * $s), [float](78 * $s), [float](50 * $s), [float](78 * $s))
    $shieldPath.AddBezier([float](50 * $s), [float](78 * $s), [float](26 * $s), [float](68 * $s), [float](24 * $s), [float](50 * $s), [float](24 * $s), [float](50 * $s))
    $shieldPath.AddLine([float](24 * $s), [float](50 * $s), [float](24 * $s), [float](28 * $s))
    $shieldPath.CloseFigure()

    $shieldRect = [System.Drawing.RectangleF]::new([float](24 * $s), [float](18 * $s), [float](52 * $s), [float](60 * $s))
    $shieldBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($shieldRect, [System.Drawing.Color]::FromArgb(255, 255, 255, 255), [System.Drawing.Color]::FromArgb(255, 224, 231, 255), [float]90.0)
    $g.FillPath($shieldBrush, $shieldPath)

    $shieldPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 99, 102, 241), [float](2 * $s))
    $g.DrawPath($shieldPen, $shieldPath)

    # Inner Core: Shell layers (representing Header, Navigation, Content)
    $barBrush1 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 79, 70, 229))
    $barBrush2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 147, 51, 234))
    $barBrush3 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 236, 72, 153))

    $g.FillRectangle($barBrush1, [float](36 * $s), [float](32 * $s), [float](28 * $s), [float](6 * $s))
    $g.FillRectangle($barBrush2, [float](36 * $s), [float](42 * $s), [float](12 * $s), [float](16 * $s))
    $g.FillRectangle($barBrush3, [float](51 * $s), [float](42 * $s), [float](13 * $s), [float](16 * $s))

    # 5. Label "SHELL"
    $fontFamily = [System.Drawing.FontFamily]::new("Segoe UI")
    $fontSize = [float]($size * 0.09)
    $font = [System.Drawing.Font]::new($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(240, 245, 255))
    
    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = [System.Drawing.RectangleF]::new([float]0, [float]($size * 0.81), [float]$size, [float]($size * 0.16))
    $g.DrawString("SHELL PWA", $font, $textBrush, $textRect, $sf)

    # Save PNG
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Cleanup
    $sf.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    $fontFamily.Dispose()
    $barBrush1.Dispose()
    $barBrush2.Dispose()
    $barBrush3.Dispose()
    $shieldPen.Dispose()
    $shieldBrush.Dispose()
    $shieldPath.Dispose()
    $glowBrush.Dispose()
    $borderPen.Dispose()
    $bgBrush.Dispose()
    $sqPath.Dispose()
    $g.Dispose()
    $bmp.Dispose()

    Write-Host "Generated: $outputPath ($size x $size)"
}

$iconsDir = "c:\Users\LABTI-23\Documents\guillermo\act2\icons"
Generate-PwaIcon -size 192 -outputPath "$iconsDir\icon-192x192.png"
Generate-PwaIcon -size 512 -outputPath "$iconsDir\icon-512x512.png"
