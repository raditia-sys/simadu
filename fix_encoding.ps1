$files = @(
    'frontend/src/pages/LaporanPerjalananPage.jsx',
    'frontend/src/pages/SurveiPage.jsx',
    'backend/controllers/LaporanPerjalananController.php'
)

foreach ($file in $files) {
    # Read the file as raw UTF-8 bytes (which it is currently saved as)
    $bytes = [System.IO.File]::ReadAllBytes($file)
    
    # Decode those bytes as UTF-8 string to get the corrupted string
    $corruptedString = [System.Text.Encoding]::UTF8.GetString($bytes)
    
    # Encode the corrupted string back to bytes using Windows-1252
    $cp1252 = [System.Text.Encoding]::GetEncoding(1252)
    try {
        $originalBytes = $cp1252.GetBytes($corruptedString)
        
        # Now these are the REAL original UTF-8 bytes. Let's write them back!
        [System.IO.File]::WriteAllBytes($file, $originalBytes)
        Write-Host "Fixed $file"
    } catch {
        Write-Host "Failed to fix $file : $_"
    }
}
