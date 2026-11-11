<#
=============================================================================
Data Analysis Dashboard - Offline Localhost HTTP Server (Windows PowerShell)
=============================================================================
Features:
- 100% offline; requires zero external network access, Node.js, or Python.
- Bound exclusively to loopback 127.0.0.1 (never exposed to office LAN/WAN).
- Automatic port fallback (8080 -> 8099).
- Single-instance detection (reuses active server instance without conflicts).
- Path canonicalization with strict directory-traversal prevention.
- Correct MIME type dispatch for HTML, modern ES JS modules, CSS, and SVG.
- Graceful shutdown handling on CTRL+C or console exit.
- Built-in user-mode TcpListener fallback if HttpListener is restricted by IT.
=============================================================================
#>

param(
    [int]$PreferredPort = 8080,
    [switch]$NoBrowser
)

# 1. Determine Root Directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($ScriptDir)) {
    $ScriptDir = (Get-Location).Path
}
$CanonicalRoot = [System.IO.Path]::GetFullPath($ScriptDir)
if (-not $CanonicalRoot.EndsWith([System.IO.Path]::DirectorySeparatorChar.ToString())) {
    $CanonicalRoot += [System.IO.Path]::DirectorySeparatorChar
}

# 2. MIME Types Map
$MimeTypes = @{
    '.html'  = 'text/html; charset=utf-8'
    '.htm'   = 'text/html; charset=utf-8'
    '.js'    = 'application/javascript; charset=utf-8'
    '.mjs'   = 'application/javascript; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.json'  = 'application/json; charset=utf-8'
    '.svg'   = 'image/svg+xml'
    '.png'   = 'image/png'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.gif'   = 'image/gif'
    '.ico'   = 'image/x-icon'
    '.woff'  = 'font/woff'
    '.woff2' = 'font/woff2'
    '.ttf'   = 'font/ttf'
    '.txt'   = 'text/plain; charset=utf-8'
    '.csv'   = 'text/csv; charset=utf-8'
}

# 3. Check for Existing Running Instance
function Test-ExistingDashboardInstance ([int]$Port) {
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $iar = $tcpClient.BeginConnect('127.0.0.1', $Port, $null, $null)
        $waitSuccess = $iar.AsyncWaitHandle.WaitOne(300, $false)
        if ($waitSuccess -and $tcpClient.Connected) {
            $tcpClient.EndConnect($iar)
            $tcpClient.Close()
            # Port is responding. Verify if it's our dashboard
            try {
                $req = [System.Net.WebRequest]::Create("http://127.0.0.1:$Port/")
                $req.Timeout = 1000
                $resp = $req.GetResponse()
                $stream = $resp.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $content = $reader.ReadToEnd()
                $reader.Close()
                $resp.Close()
                if ($content -like '*Data Analysis Dashboard*') {
                    return $true
                }
            } catch {
                return $false
            }
        }
    } catch {
        # Port is closed / not responding
    }
    return $false
}

# 4. Port Availability Checker
function Test-PortAvailable ([int]$Port) {
    $listener = $null
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener -ne $null) {
            $listener.Stop()
        }
    }
}

# 5. Resolve Target Port
$ActivePort = $PreferredPort

# First check if dashboard is already running on PreferredPort
if (Test-ExistingDashboardInstance $ActivePort) {
    Write-Host ""
    Write-Host "[OK] Data Analysis Dashboard is already running on http://127.0.0.1:$ActivePort/" -ForegroundColor Green
    Write-Host "[OK] Opening application in your default web browser..." -ForegroundColor Cyan
    if (-not $NoBrowser) {
        Start-Process "http://127.0.0.1:$ActivePort/"
    }
    Write-Host ""
    Write-Host "You can continue using the existing dashboard session."
    Start-Sleep -Seconds 2
    exit 0
}

# Find an open port
while (-not (Test-PortAvailable $ActivePort) -and $ActivePort -lt ($PreferredPort + 50)) {
    $ActivePort++
    if (Test-ExistingDashboardInstance $ActivePort) {
        Write-Host ""
        Write-Host "[OK] Data Analysis Dashboard found running on http://127.0.0.1:$ActivePort/" -ForegroundColor Green
        Write-Host "[OK] Opening in browser..." -ForegroundColor Cyan
        if (-not $NoBrowser) {
            Start-Process "http://127.0.0.1:$ActivePort/"
        }
        exit 0
    }
}

$Url = "http://127.0.0.1:$ActivePort/"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "           DATA ANALYSIS DASHBOARD - LOCAL OFFLINE SERVER            " -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Application Root:  $CanonicalRoot"
Write-Host "  Bound Address:     127.0.0.1 (Loopback / Localhost only)"
Write-Host "  Active Port:       $ActivePort"
Write-Host "  Access URL:        $Url" -ForegroundColor Green
Write-Host "  Security:          Isolated offline operation - Zero external traffic"
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Press CTRL+C in this window at any time to cleanly stop the server." -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Launch browser
if (-not $NoBrowser) {
    try {
        Start-Process $Url
        Write-Host "[OK] Default web browser opened to $Url" -ForegroundColor Green
    } catch {
        Write-Host "[INFO] Please navigate manually to $Url in your web browser." -ForegroundColor Yellow
    }
}

# 6. Start Server (Try System.Net.HttpListener, fallback to user-mode Sockets)
$useHttpListener = $true
$httpListener = $null

try {
    $httpListener = New-Object System.Net.HttpListener
    $httpListener.Prefixes.Add($Url)
    $httpListener.Start()
    Write-Host "[OK] Native HTTP Listener active on port $ActivePort." -ForegroundColor Green
} catch {
    Write-Host "[NOTICE] Standard HttpListener registration restricted by corporate policy: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "[OK] Activating non-privileged user-mode socket listener..." -ForegroundColor Cyan
    $useHttpListener = $false
}

if ($useHttpListener) {
    # Run using HttpListener
    try {
        while ($httpListener.IsListening) {
            $context = $httpListener.GetContext()
            $request = $context.Request
            $response = $context.Response

            # Security Headers
            $response.AddHeader("X-Content-Type-Options", "nosniff")
            $response.AddHeader("X-Frame-Options", "SAMEORIGIN")
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

            # Resolve Request Path
            $rawPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath)
            if ([string]::IsNullOrWhiteSpace($rawPath) -or $rawPath -eq "/") {
                $rawPath = "/index.html"
            }

            # Normalize & Canonicalize
            $relPath = $rawPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($CanonicalRoot, $relPath))

            # Directory Traversal Check
            if (-not $filePath.StartsWith($CanonicalRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode = 403
                $msg = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden: Access denied.")
                $response.ContentType = "text/plain"
                $response.ContentLength64 = $msg.Length
                $response.OutputStream.Write($msg, 0, $msg.Length)
                $response.Close()
                Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] 403 FORBIDDEN: $rawPath" -ForegroundColor Red
                continue
            }

            # File Existence Check
            if (Test-Path $filePath -PathType Leaf) {
                try {
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $contentType = 'application/octet-stream'
                    if ($MimeTypes.ContainsKey($ext)) {
                        $contentType = $MimeTypes[$ext]
                    }

                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    $response.ContentType = $contentType
                    $response.ContentLength64 = $bytes.Length
                    $response.StatusCode = 200

                    if ($request.HttpMethod -ne "HEAD") {
                        $response.OutputStream.Write($bytes, 0, $bytes.Length)
                    }
                    $response.Close()
                    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] 200 OK: $rawPath ($([math]::Round($bytes.Length / 1024, 1)) KB)" -ForegroundColor DarkGray
                } catch {
                    $response.StatusCode = 500
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Error: $($_.Exception.Message)")
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                }
            } else {
                $response.StatusCode = 404
                $msg404 = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
                $response.ContentType = "text/plain"
                $response.ContentLength64 = $msg404.Length
                $response.OutputStream.Write($msg404, 0, $msg404.Length)
                $response.Close()
                Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] 404 NOT FOUND: $rawPath" -ForegroundColor Yellow
            }
        }
    } finally {
        if ($httpListener -ne $null) {
            $httpListener.Stop()
            $httpListener.Close()
        }
        Write-Host ""
        Write-Host "[INFO] Local HTTP server closed cleanly." -ForegroundColor Green
    }
} else {
    # Non-privileged TcpListener Fallback
    $tcpServer = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $ActivePort)
    $tcpServer.Start()
    Write-Host "[OK] Local socket server active on port $ActivePort." -ForegroundColor Green

    try {
        while ($true) {
            $client = $tcpServer.AcceptTcpClient()
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $requestLine = $reader.ReadLine()

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                $client.Close()
                continue
            }

            $parts = $requestLine.Split(' ')
            if ($parts.Length -lt 2) {
                $client.Close()
                continue
            }

            $method = $parts[0]
            $urlPart = $parts[1]
            $pathOnly = $urlPart.Split('?')[0]
            $rawPath = [System.Uri]::UnescapeDataString($pathOnly)
            if ([string]::IsNullOrWhiteSpace($rawPath) -or $rawPath -eq "/") {
                $rawPath = "/index.html"
            }

            $relPath = $rawPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($CanonicalRoot, $relPath))

            if (-not $filePath.StartsWith($CanonicalRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                $respText = "HTTP/1.1 403 Forbidden`r`nContent-Type: text/plain`r`nContent-Length: 14`r`nConnection: close`r`n`r`n403 Forbidden"
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respText)
                $stream.Write($respBytes, 0, $respBytes.Length)
                $client.Close()
                continue
            }

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = 'application/octet-stream'
                if ($MimeTypes.ContainsKey($ext)) {
                    $contentType = $MimeTypes[$ext]
                }
                $bodyBytes = [System.IO.File]::ReadAllBytes($filePath)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bodyBytes.Length)`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                if ($method -ne "HEAD") {
                    $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                }
                Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] 200 OK: $rawPath ($([math]::Round($bodyBytes.Length / 1024, 1)) KB)" -ForegroundColor DarkGray
            } else {
                $respText = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: 14`r`nConnection: close`r`n`r`n404 Not Found"
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respText)
                $stream.Write($respBytes, 0, $respBytes.Length)
            }
            $client.Close()
        }
    } finally {
        $tcpServer.Stop()
        Write-Host ""
        Write-Host "[INFO] Local socket server closed cleanly." -ForegroundColor Green
    }
}
