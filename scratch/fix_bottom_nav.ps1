
$htmlFiles = Get-ChildItem -Recurse -Filter *.html | Where-Object { $_.FullName -notmatch "\\admin\.html" -and $_.FullName -notmatch "\\track-order\.html" }

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    $changed = $false

    # Calculate relative path to track-order.html
    $relativePath = "Pages/track-order.html"
    if ($file.FullName -match "\\Pages\\") {
        $relativePath = "track-order.html"
    } elseif ($file.FullName -match "\\collections\\") {
        $relativePath = "../Pages/track-order.html"
    }

    # Add to mobile-bottom-nav if missing IN THAT SECTIONt
    if ($content -match '(?s)<div class="mobile-bottom-nav-inner">.*?</div>') {
        $bottomNav = $matches[0]
        if ($bottomNav -notmatch "track-order\.html") {
            $link = "<a href=""$relativePath""><i class=`"fa-solid fa-truck-fast`"></i>Track</a>"
            # Regex to match the Cart link across lines within the bottom nav
            $pattern = '(?s)<a href="#" data-cart-toggle>.*?</a>'
            $content = [regex]::Replace($content, $pattern, "`$0`n      $link")
            $changed = $true
        }
    }

    if ($changed) {
        Set-Content $file.FullName $content -NoNewline
        Write-Host "Updated Bottom Nav in $($file.FullName)"
    }
}
