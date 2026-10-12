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
    $c1 = [System.Drawing.Color]::FromArgb(255, 13, 27, 42)    # Dark Navy
    $c2 = [System.Drawing.Color]::FromArgb(255, 16, 185, 129)  # Emerald Green (Storage & Online/Offline)
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $c1, $c2, [float]45.0)
    $g.FillPath($bgBrush, $sqPath)

    # 2. Outer Border / Neon Glow
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 52, 211, 153), [float]($size * 0.025))
    $g.DrawPath($borderPen, $sqPath)

    # 3. Ambient inner circular glow
    $glowPad = [float]($size * 0.16)
    $glowDim = [float]($size - (2 * $glowPad))
    $glowRect = [System.Drawing.RectangleF]::new($glowPad, $glowPad, $glowDim, $glowDim)
    $g1 = [System.Drawing.Color]::FromArgb(100, 16, 185, 129)
    $g2 = [System.Drawing.Color]::FromArgb(40, 59, 130, 246)
    $glowBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($glowRect, $g1, $g2, [float]135.0)
    $g.FillEllipse($glowBrush, $glowRect)

    # 4. Stylized Database / Storage Stack (3 Disks representing IndexedDB & Cache)
    $s = [float]($size / 100.0)
    $diskWidth = [float](46 * $s)
    $diskHeight = [float](14 * $s)
    $diskX = [float](27 * $s)

    $diskBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(240, 240, 255))
    $diskPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 16, 185, 129), [float](2 * $s))

    # Top Disk
    $g.FillEllipse($diskBrush, $diskX, [float](22 * $s), $diskWidth, $diskHeight)
    $g.DrawEllipse($diskPen, $diskX, [float](22 * $s), $diskWidth, $diskHeight)

    # Middle Disk Cylindrical Slice
    $g.DrawArc($diskPen, $diskX, [float](36 * $s), $diskWidth, $diskHeight, [float]0, [float]180)
    $g.DrawLine($diskPen, $diskX, [float](29 * $s), $diskX, [float](43 * $s))
    $g.DrawLine($diskPen, [float]($diskX + $diskWidth), [float](29 * $s), [float]($diskX + $diskWidth), [float](43 * $s))

    # Bottom Disk Cylindrical Slice
    $g.DrawArc($diskPen, $diskX, [float](50 * $s), $diskWidth, $diskHeight, [float]0, [float]180)
    $g.DrawLine($diskPen, $diskX, [float](43 * $s), $diskX, [float](57 * $s))
    $g.DrawLine($diskPen, [float]($diskX + $diskWidth), [float](43 * $s), [float]($diskX + $diskWidth), [float](57 * $s))

    # Lightning Bolt across database (Service Worker worker thread)
    $pts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new([float](53 * $s), [float](26 * $s)),
        [System.Drawing.PointF]::new([float](63 * $s), [float](42 * $s)),
        [System.Drawing.PointF]::new([float](53 * $s), [float](42 * $s)),
        [System.Drawing.PointF]::new([float](60 * $s), [float](60 * $s)),
        [System.Drawing.PointF]::new([float](41 * $s), [float](44 * $s)),
        [System.Drawing.PointF]::new([float](49 * $s), [float](44 * $s))
    )
    $boltBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 251, 191, 36))
    $boltPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 245, 158, 11), [float](1.5 * $s))
    $g.FillPolygon($boltBrush, $pts)
    $g.DrawPolygon($boltPen, $pts)

    # 5. Label "OFFLINE DB"
    $fontFamily = [System.Drawing.FontFamily]::new("Segoe UI")
    $fontSize = [float]($size * 0.085)
    $font = [System.Drawing.Font]::new($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(240, 253, 244))
    
    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = [System.Drawing.RectangleF]::new([float]0, [float]($size * 0.78), [float]$size, [float]($size * 0.18))
    $g.DrawString("INDEXED DB", $font, $textBrush, $textRect, $sf)

    # Save PNG
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Cleanup
    $sf.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    $fontFamily.Dispose()
    $boltPen.Dispose()
    $boltBrush.Dispose()
    $diskPen.Dispose()
    $diskBrush.Dispose()
    $glowBrush.Dispose()
    $borderPen.Dispose()
    $bgBrush.Dispose()
    $sqPath.Dispose()
    $g.Dispose()
    $bmp.Dispose()

    Write-Host "Generated: $outputPath ($size x $size)"
}

$iconsDir = "c:\Users\LABTI-23\Documents\guillermo\act3\icons"
Generate-PwaIcon -size 192 -outputPath "$iconsDir\icon-192x192.png"
Generate-PwaIcon -size 512 -outputPath "$iconsDir\icon-512x512.png"
