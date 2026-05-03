param(
    [Parameter(ValueFromRemainingArguments=$true)]
    $RemainingArgs
)

$cliPath = "$PSScriptRoot\packages\cli\dist\cli.js"

if ($RemainingArgs) {
    & node $cliPath $RemainingArgs
} else {
    try {
        $ollamaModels = (Invoke-RestMethod -Uri "http://localhost:11434/api/tags").models.name
        if ($ollamaModels) {
            Write-Host "`nYüklü Ollama Modelleri:" -ForegroundColor Cyan
            $i = 1
            foreach ($m in $ollamaModels) {
                Write-Host "$i) $m"
                $i++
            }
            $choice = Read-Host "`nBir model numarası seçin (veya iptal için Enter)"
            if ($choice -and $choice -match '^\d+$' -and $choice -le $ollamaModels.Count) {
                $selected = $ollamaModels[$choice - 1]
                & node $cliPath --model "ollama/$selected"
            }
        } else {
            Write-Host "Hiç Ollama modeli bulunamadı!" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Ollama'ya bağlanılamadı. Ollama'nın çalıştığından emin ol." -ForegroundColor Red
    }
}
