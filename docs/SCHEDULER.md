# Daily scheduler (local, free)

A Windows Task Scheduler job runs the morning routine so trend history accumulates and a
fresh brief is waiting each day. **Local only — no cloud agent, no API, $0.**

- **Task name:** `AdminBrain-DailyBrief`
- **When:** daily at **07:00** (runs when next available if the machine was off).
- **What it runs:** `node tools/daily.js` → `metrics` (writes `Metrics/<date>.md`) then
  `inbox` (writes `Daily/<date>.md` morning brief).

## Manage it (PowerShell)

```powershell
# See status / last result (0 = success)
Get-ScheduledTaskInfo -TaskName "AdminBrain-DailyBrief"

# Run it now
Start-ScheduledTask -TaskName "AdminBrain-DailyBrief"

# Change the time to 08:30
Set-ScheduledTask -TaskName "AdminBrain-DailyBrief" -Trigger (New-ScheduledTaskTrigger -Daily -At 8:30am)

# Disable / re-enable
Disable-ScheduledTask -TaskName "AdminBrain-DailyBrief"
Enable-ScheduledTask  -TaskName "AdminBrain-DailyBrief"

# Remove entirely
Unregister-ScheduledTask -TaskName "AdminBrain-DailyBrief" -Confirm:$false
```

Re-create it by running the `Register-ScheduledTask` command from the project setup, or
just run `node tools/daily.js` manually any time.
