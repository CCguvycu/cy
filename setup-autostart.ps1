# setup-autostart.ps1
# Run this ONCE (as Administrator) to register a Task Scheduler task that
# automatically places Claude Code and Obsidian on the correct screens
# whenever a display change is detected (e.g. external monitor connected).

#Requires -RunAsAdministrator

$taskName   = "PlaceWindowsOnMonitorConnect"
$scriptPath = Join-Path $PSScriptRoot "place-windows.ps1"

if (-not (Test-Path $scriptPath)) {
    Write-Error "place-windows.ps1 not found next to this script at: $scriptPath"
    exit 1
}

# Enable the DisplaySwitch operational log (disabled by default on Windows).
Write-Host "Enabling Microsoft-Windows-DisplaySwitch/Operational event log..."
wevtutil sl "Microsoft-Windows-DisplaySwitch/Operational" /e:true
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Could not enable the DisplaySwitch event log. The task may not trigger automatically."
}

# Event trigger: fires whenever display topology changes (monitor plugged in/out).
$eventQuery = @"
<QueryList>
  <Query Id="0" Path="Microsoft-Windows-DisplaySwitch/Operational">
    <Select Path="Microsoft-Windows-DisplaySwitch/Operational">
      *[System[EventID=131]]
    </Select>
  </Query>
</QueryList>
"@

$taskXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Move Claude Code to laptop screen and Obsidian to big screen when a monitor is connected.</Description>
  </RegistrationInfo>
  <Triggers>
    <EventTrigger>
      <Enabled>true</Enabled>
      <Subscription>$([System.Security.SecurityElement]::Escape($eventQuery))</Subscription>
      <Delay>PT8S</Delay>
    </EventTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT2M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-WindowStyle Hidden -ExecutionPolicy Bypass -File "$scriptPath"</Arguments>
    </Exec>
  </Actions>
</Task>
"@

Register-ScheduledTask -TaskName $taskName -Xml $taskXml -Force | Out-Null

Write-Host ""
Write-Host "Done. Task '$taskName' is registered."
Write-Host "Claude Code -> small screen, Obsidian -> big screen, automatically on monitor connect."
Write-Host ""
Write-Host "A log file will be written to `$env:TEMP\place-windows.log each time the task runs."
Write-Host ""
Write-Host "To remove it later:"
Write-Host "  Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
