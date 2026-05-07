# place-windows.ps1
# Launches Claude Code on the small (laptop) screen and Obsidian on the big (external) screen.
# Writes a log to $env:TEMP\place-windows.log for debugging.

$log = "$env:TEMP\place-windows.log"
function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
    Add-Content -Path $log -Value $line
    Write-Host $line
}

Log "--- place-windows.ps1 started ---"

Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    public const int SW_RESTORE  = 9;
    public const int SW_MAXIMIZE = 3;
    public const uint SWP_NOZORDER   = 0x0004;
    public const uint SWP_SHOWWINDOW = 0x0040;
}
"@

# Script-scope vars used by the EnumWindows callback (closures don't capture locals reliably).
$script:_targetPid  = 0
$script:_foundHwnd  = [IntPtr]::Zero

function Get-MainWindowHandle([int]$processId) {
    $script:_targetPid = $processId
    $script:_foundHwnd = [IntPtr]::Zero
    $cb = [Win32+EnumWindowsProc]{
        param([IntPtr]$h, [IntPtr]$l)
        $pid = [uint32]0
        [Win32]::GetWindowThreadProcessId($h, [ref]$pid) | Out-Null
        if ($pid -eq $script:_targetPid -and [Win32]::IsWindowVisible($h)) {
            $script:_foundHwnd = $h
            return $false
        }
        return $true
    }
    [Win32]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
    return $script:_foundHwnd
}

function Move-AppToScreen($process, $screen) {
    $b = $screen.Bounds
    $hwnd = $process.MainWindowHandle
    if ($hwnd -eq [IntPtr]::Zero) {
        $hwnd = Get-MainWindowHandle $process.Id
    }
    if ($hwnd -eq [IntPtr]::Zero) {
        Log "  No window handle found for PID $($process.Id)"
        return
    }
    [Win32]::ShowWindow($hwnd, [Win32]::SW_RESTORE) | Out-Null
    [Win32]::SetWindowPos($hwnd, [IntPtr]::Zero, $b.X, $b.Y, $b.Width, $b.Height, ([Win32]::SWP_NOZORDER -bor [Win32]::SWP_SHOWWINDOW)) | Out-Null
    [Win32]::ShowWindow($hwnd, [Win32]::SW_MAXIMIZE) | Out-Null
    Log "  Moved to $($b.Width)x$($b.Height) at ($($b.X),$($b.Y))"
}

# --- Identify screens ---
$screens = [System.Windows.Forms.Screen]::AllScreens
Log "Screens found: $($screens.Count)"
foreach ($s in $screens) { Log "  $($s.DeviceName)  $($s.Bounds.Width)x$($s.Bounds.Height) at ($($s.Bounds.X),$($s.Bounds.Y))  Primary=$($s.Primary)" }

if ($screens.Count -lt 2) {
    Log "Only one screen detected — nothing to do."
    exit 0
}

$smallScreen = $screens | Sort-Object { $_.Bounds.Width * $_.Bounds.Height } | Select-Object -First 1
$bigScreen   = $screens | Sort-Object { $_.Bounds.Width * $_.Bounds.Height } | Select-Object -Last 1
Log "Small screen -> $($smallScreen.DeviceName)"
Log "Big screen   -> $($bigScreen.DeviceName)"

# --- Locate executables ---
$claudePaths = @(
    "$env:LOCALAPPDATA\Programs\claude\Claude.exe",
    "$env:LOCALAPPDATA\AnthropicClaude\claude.exe",
    "$env:LOCALAPPDATA\Programs\Claude Code\Claude Code.exe",
    "C:\Program Files\Claude\Claude.exe"
)
$obsidianPaths = @(
    "$env:LOCALAPPDATA\Programs\obsidian\Obsidian.exe",
    "$env:LOCALAPPDATA\Obsidian\Obsidian.exe",
    "C:\Program Files\Obsidian\Obsidian.exe"
)

$claudeExe   = $claudePaths   | Where-Object { Test-Path $_ } | Select-Object -First 1
$obsidianExe = $obsidianPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
Log "Claude exe:  $(if ($claudeExe) { $claudeExe } else { 'NOT FOUND' })"
Log "Obsidian exe: $(if ($obsidianExe) { $obsidianExe } else { 'NOT FOUND' })"

# --- Find or launch apps ---
$claudeProc   = Get-Process | Where-Object { $_.Name -match '^claude' }   | Select-Object -First 1
$obsidianProc = Get-Process | Where-Object { $_.Name -match '^obsidian' } | Select-Object -First 1
Log "Claude already running:  $(if ($claudeProc) { "yes (PID $($claudeProc.Id))" } else { 'no' })"
Log "Obsidian already running: $(if ($obsidianProc) { "yes (PID $($obsidianProc.Id))" } else { 'no' })"

if (-not $claudeProc -and $claudeExe) {
    Log "Launching Claude Code..."
    $claudeProc = Start-Process -FilePath $claudeExe -PassThru
}
if (-not $obsidianProc -and $obsidianExe) {
    Log "Launching Obsidian..."
    $obsidianProc = Start-Process -FilePath $obsidianExe -PassThru
}

# --- Wait for windows to appear (up to 20 s each) ---
foreach ($entry in @(@{proc=$claudeProc; name="Claude"}, @{proc=$obsidianProc; name="Obsidian"})) {
    if ($null -eq $entry.proc) { continue }
    $waited = 0
    while ($waited -lt 20) {
        $entry.proc.Refresh()
        $hwnd = $entry.proc.MainWindowHandle
        if ($hwnd -eq [IntPtr]::Zero) { $hwnd = Get-MainWindowHandle $entry.proc.Id }
        if ($hwnd -ne [IntPtr]::Zero) { break }
        Start-Sleep -Seconds 1
        $waited++
    }
    Log "$($entry.name) window ready after ${waited}s"
}

# --- Place windows ---
if ($claudeProc) {
    Log "Moving Claude Code to small screen..."
    $claudeProc.Refresh()
    Move-AppToScreen $claudeProc $smallScreen
}
if ($obsidianProc) {
    Log "Moving Obsidian to big screen..."
    $obsidianProc.Refresh()
    Move-AppToScreen $obsidianProc $bigScreen
}

Log "--- done ---"
