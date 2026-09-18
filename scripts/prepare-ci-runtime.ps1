$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force 'runtime', 'qa/ci-font' | Out-Null
$ffmpegSource = (& python -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())').Trim()
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $ffmpegSource)) { throw 'Install imageio-ffmpeg==0.6.0 first.' }
Copy-Item -LiteralPath $ffmpegSource -Destination 'runtime/ffmpeg.exe'
# Noto Sans SC, SIL Open Font License. Exact upstream revision and content hash.
$fontUrl = 'https://raw.githubusercontent.com/google/fonts/a85815a42757630ce188fdad368c2dfc444d4773/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf'
$expectedHash = 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da'
Invoke-WebRequest $fontUrl -OutFile 'qa/ci-font/NotoSansSC.ttf'
$actualHash = (Get-FileHash 'qa/ci-font/NotoSansSC.ttf' -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedHash) { throw 'CI font checksum mismatch.' }
$fontPath = (Resolve-Path 'qa/ci-font/NotoSansSC.ttf').Path
if ($env:GITHUB_ENV) { "SEQLOOM_TEST_FONT=$fontPath" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append }
Write-Output "Prepared pinned FFmpeg wheel and verified Noto Sans SC test font."
