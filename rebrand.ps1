$dir = "C:\Users\BANDAR\Documents\MDStore\MD Strore"
Get-ChildItem -LiteralPath $dir -Recurse -Include "*.html","*.css","*.js" | ForEach-Object {
  $c = [System.IO.File]::ReadAllText($_.FullName)
  if ($c -match "Sofie|SOFIE|sofiestore") {
    $n = $c -replace "Sofie Store","MDBoutiquee" -replace "Sofies Makeup","Makeup" -replace "Sofies Home","Home" -replace "SOFIE","MDBOUTIQUEE" -replace "Sofie","MDBoutiquee" -replace "sofiestore","mdboutiquee" -replace "sofiesmakeupstore","mdboutiquee"
    [System.IO.File]::WriteAllText($_.FullName, $n)
    Write-Host "Updated: $($_.Name)"
  }
}
Write-Host "Done!"
