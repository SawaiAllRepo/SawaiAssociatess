# Run from the project root on Windows:
#   powershell -ExecutionPolicy Bypass -File scripts\generate-seo-assets.ps1
# Regenerates SEO icons from the same Sawai logo used by the website header.

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $root 'public'
$logoPath = Join-Path $root 'src/assets/logo/sawai-logo.png'
if (-not (Test-Path $logoPath)) { throw "Logo not found: $logoPath" }

function Save-ResizedLogo {
  param([int]$Size, [string]$Path)
  $source = [System.Drawing.Image]::FromFile($logoPath)
  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.DrawImage($source, 0, 0, $Size, $Size)
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose(); $bitmap.Dispose(); $source.Dispose()
  }
  Write-Host "Generated $Path ($Size x $Size)"
}

function New-ColorFromHex {
  param([string]$Hex)
  $color = [System.Drawing.ColorTranslator]::FromHtml("#$Hex")
  return [System.Drawing.Color]::FromArgb(255, $color.R, $color.G, $color.B)
}

# Same 1200 x 630 social banner layout as the SEO reference, with the .com domain.
function New-BrandBanner {
  $width = 1200; $height = 630
  $bitmap = New-Object System.Drawing.Bitmap($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $backgroundRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
  $background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $backgroundRect, (New-ColorFromHex '0A1633'), (New-ColorFromHex '123C8C'), 90.0
  )
  $pink = New-Object System.Drawing.SolidBrush (New-ColorFromHex 'EC4899')
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $soft = New-Object System.Drawing.SolidBrush (New-ColorFromHex 'BED2F0')
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $titleFont = New-Object System.Drawing.Font('Segoe UI', [single]62.4, [System.Drawing.FontStyle]::Bold)
  $subtitleFont = New-Object System.Drawing.Font('Segoe UI', [single]33.6, [System.Drawing.FontStyle]::Regular)
  $footerFont = New-Object System.Drawing.Font('Segoe UI', [single]24, [System.Drawing.FontStyle]::Regular)
  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    $graphics.FillRectangle($background, $backgroundRect)
    $graphics.FillRectangle($pink, 0, 0, $width, 14)
    $graphics.DrawString('SAWAI ASSOCIATES', $titleFont, $white,
      ([System.Drawing.RectangleF]::new(0, 189, 1200, 100)), $format)
    $graphics.DrawString('Real Estate  •  Insurance  •  IT Services', $subtitleFont, $soft,
      ([System.Drawing.RectangleF]::new(0, 302, 1200, 76)), $format)
    $graphics.DrawString('Karve Nagar, Pune 411052   |   +91 72760 63476   |   sawaiassociates.com',
      $footerFont, $soft, ([System.Drawing.RectangleF]::new(0, 491, 1200, 63)), $format)
    $bitmap.Save((Join-Path $publicDir 'og-image.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $titleFont.Dispose(); $subtitleFont.Dispose(); $footerFont.Dispose()
    $format.Dispose(); $soft.Dispose(); $white.Dispose(); $pink.Dispose()
    $background.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
  }
  Write-Host 'Generated public/og-image.png (1200 x 630)'
}

Save-ResizedLogo 48 (Join-Path $publicDir 'favicon-48.png')
Save-ResizedLogo 256 (Join-Path $publicDir 'favicon.png')
Save-ResizedLogo 180 (Join-Path $publicDir 'apple-touch-icon.png')

# ICO entries contain PNG images at 16, 32 and 48 pixels.
$sizes = @(16, 32, 48)
$images = @()
foreach ($size in $sizes) {
  $temporary = Join-Path ([System.IO.Path]::GetTempPath()) ("sawai-favicon-$size-$([guid]::NewGuid()).png")
  try {
    Save-ResizedLogo $size $temporary
    $images += ,([System.IO.File]::ReadAllBytes($temporary))
  } finally {
    if (Test-Path $temporary) { Remove-Item $temporary }
  }
}
$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($stream)
try {
  $writer.Write([uint16]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]$sizes.Count)
  $offset = 6 + 16 * $sizes.Count
  for ($i = 0; $i -lt $sizes.Count; $i++) {
    $writer.Write([byte]$sizes[$i]); $writer.Write([byte]$sizes[$i])
    $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$images[$i].Length)
    $writer.Write([uint32]$offset)
    $offset += $images[$i].Length
  }
  foreach ($png in $images) { $writer.Write([byte[]]$png) }
  [System.IO.File]::WriteAllBytes((Join-Path $publicDir 'favicon.ico'), $stream.ToArray())
} finally {
  $writer.Dispose(); $stream.Dispose()
}

New-BrandBanner
Write-Host 'Done. SEO icons use the Sawai logo, and social preview uses the .com domain.'
