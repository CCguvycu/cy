# place-windows.ps1
# Launches Claude Code on the small (laptop) screen and Obsidian on the big (external) screen.
# Run this after connecting your external monitor.

Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const int SW_RESTORE = 9;
    public const int SW_MAXIMIZE = 3;
}
"@

function Get-MainWindowHandle($processId) {
    $hwnd = [IntPtr]::Zero
    $callback = [Win32+EnumWindowsProc]{
        param($h, $l)
        $pid = 0
        [Win32]::GetWindowThreadProcessId($h, [ref]$pid) | Out-Null
        if ($pid -eq $processId -and [Win32]::IsWindowVisible($h)) {
            Set-Variable -Name hwnd -Value $h -Scope 1
            return $false
        }
        return $true
    }
    [Win32]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
    return $hwnd
}

function Move-AppToScreen($process, $screen) {
    $b = $screen.Bounds
    $hwnd = $process.MainWindowHandle
    if ($hwnd -eq [IntPtr]::Zero) {
        $hwnd = Get-MainWindowHandle $process.Id
    }
    if ($hwnd -ne [IntPtr]::Zero) {
        [Win32]::ShowWindow($hwnd, [Win32]::SW_RESTORE) | Out-Null
        [Win32]::SetWindowPos($hwnd, [IntPtr]::Zero, $b.X, $b.Y, $b.Width, $b.Height, ([Win32]::SWP_NOZORDER -bor [Win32]::SWP_SHOWWINDOW)) | Out-Null
        [Win32]::ShowWindow($hwnd, [Win32]::SW_MAXIMIZE) | Out-Null
    }
}

# --- Identify screens ---
$screens = [System.Windows.Forms.Screen]::AllScreens
if ($screens.Count -lt 2) {
    Write-Host "Only one screen detected. Connect your external monitor and try again."
    exit 1
}

$smallScreen = $screens | Sort-Object { $_.Bounds.Width * $_.Bounds.Height } | Select-Object -First 1
$bigScreen   = $screens | Sort-Object { $_.Bounds.Width * $_.Bounds.Height } | Select-Object -Last 1

Write-Host "Small screen: $($smallScreen.Bounds.Width)x$($smallScreen.Bounds.Height) at ($($smallScreen.Bounds.X), $($smallScreen.Bounds.Y))"
Write-Host "Big screen:   $($bigScreen.Bounds.Width)x$($bigScreen.Bounds.Height) at ($($bigScreen.Bounds.X), $($bigScreen.Bounds.Y))"

# --- Locate executables ---
$claudePaths = @(
    "$env:LOCALAPPDATA\Programs\claude\Claude.exe",
    "$env:LOCALAPPDATA\AnthropicClaude\claude.exe",
    "C:\Program Files\Claude\Claude.exe"
)
$obsidianPaths = @(
    "$env:LOCALAPPDATA\Programs\obsidian\Obsidian.exe",
    "$env:LOCALAPPDATA\Obsidian\Obsidian.exe",
    "C:\Program Files\Obsidian\Obsidian.exe"
)

$claudeExe   = $claudePaths   | Where-Object { Test-Path $_ } | Select-Object -First 1
$obsidianExe = $obsidianPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $claudeExe)   { Write-Warning "Claude Code not found. Update the path in this script." }
if (-not $obsidianExe) { Write-Warning "Obsidian not found. Update the path in this script." }

# --- Launch apps (skip if already running) ---
$claudeProc   = Get-Process -Name "claude"   -ErrorAction SilentlyContinue | Select-Object -First 1
$obsidianProc = Get-Process -Name "obsidian" -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $claudeProc -and $claudeExe) {
    Write-Host "Launching Claude Code..."
    $claudeProc = Start-Process -FilePath $claudeExe -PassThru
}

if (-not $obsidianProc -and $obsidianExe) {
    Write-Host "Launching Obsidian..."
    $obsidianProc = Start-Process -FilePath $obsidianExe -PassThru
}

# Wait for windows to appear (up to 15 seconds each)
Write-Host "Waiting for windows to appear..."
foreach ($entry in @(@{proc=$claudeProc; name="Claude"}, @{proc=$obsidianProc; name="Obsidian"})) {
    if ($null -eq $entry.proc) { continue }
    $waited = 0
    while ($entry.proc.MainWindowHandle -eq [IntPtr]::Zero -and $waited -lt 15) {
        Start-Sleep -Seconds 1
        $waited++
        $entry.proc.Refresh()
    }
    if ($entry.proc.MainWindowHandle -eq [IntPtr]::Zero) {
        Write-Warning "$($entry.name) window did not appear in time. You may need to move it manually."
    }
}

# --- Place windows ---
if ($claudeProc) {
    Write-Host "Moving Claude Code to small screen..."
    Move-AppToScreen $claudeProc $smallScreen
}

if ($obsidianProc) {
    Write-Host "Moving Obsidian to big screen..."
    Move-AppToScreen $obsidianProc $bigScreen
}

Write-Host "Done."
