$files = Get-ChildItem -Path "src" -Filter "*.tsx" -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    # Hex colors
    $content = $content -replace '#8f3329', '#B54236'
    $content = $content -replace '#ffab82', '#B54236'
    $content = $content -replace '#ffc4a8', '#FF5530'
    $content = $content -replace '#6b2620', '#002147'
    $content = $content -replace '#2d2d2d', '#002147'
    $content = $content -replace '#1a1a1a', '#002147'
    $content = $content -replace '#333333', '#002147'
    $content = $content -replace '#E50914', '#FF5530'
    $content = $content -replace '#181818', '#000000'
    $content = $content -replace '#282828', '#002147'
    $content = $content -replace '#252525', '#002147'
    $content = $content -replace '#4a5568', '#002147'
    $content = $content -replace '#1f1f1f', '#002147'
    $content = $content -replace '#7d0209', '#B54236'
    $content = $content -replace '#b20710', '#B54236'
    $content = $content -replace '#7a0a0f', '#B54236'
    # Tailwind named colors -> brand equivalents
    $content = $content -replace 'text-green-400', 'text-[#FF5530]'
    $content = $content -replace 'text-green-500', 'text-[#FF5530]'
    $content = $content -replace 'text-green-600', 'text-[#FF5530]'
    $content = $content -replace 'bg-green-400', 'bg-[#FF5530]'
    $content = $content -replace 'bg-green-500', 'bg-[#FF5530]'
    $content = $content -replace 'bg-green-600', 'bg-[#FF5530]'
    $content = $content -replace 'border-green-500', 'border-[#FF5530]'
    $content = $content -replace 'border-green-400', 'border-[#FF5530]'
    $content = $content -replace 'text-red-400', 'text-[#FF5530]'
    $content = $content -replace 'text-red-500', 'text-[#FF5530]'
    $content = $content -replace 'text-red-600', 'text-[#B54236]'
    $content = $content -replace 'text-red-700', 'text-[#B54236]'
    $content = $content -replace 'bg-red-500', 'bg-[#FF5530]'
    $content = $content -replace 'bg-red-600', 'bg-[#B54236]'
    $content = $content -replace 'border-red-500', 'border-[#FF5530]'
    $content = $content -replace 'border-red-400', 'border-[#FF5530]'
    $content = $content -replace "'#333'", "'#002147'"
    if ($content -ne $original) {
        Set-Content $file.FullName -Value $content -NoNewline
        Write-Host "Fixed: $($file.Name)"
    }
}
Write-Host "Done!"
