$files = Get-ChildItem collections\*.html
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace '(<div class="mobile-nav-links">[\s\S]*?<a href="\.\./Pages/contact\.html">Contact</a>)', '$1' + "`n" + '        <a href="../Pages/track-order.html"><i class="fa-solid fa-truck-fast"></i> Track Order</a>'
    Set-Content $file.FullName $newContent
}
