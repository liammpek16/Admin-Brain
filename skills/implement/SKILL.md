---
name: implement
description: Set up the supervised implement stage (Plan 2, ③) for an approved cycle — create an auto/<task> branch in the target project's local repo (never main) and advance the cycle note to stage:implement with a checkpoint log. The agent then does the coding on that branch, supervised, committing checkpoints.
---

# implement

Stage ③ setup. Requires the cycle note to be `status: approved`.

```bash
node skills/implement/implement.js --project "Dota Coach" --path "C:/Users/liamm/Scripts" [--base main]
```

- `--path` is the **local working clone** of the project's repo (recency `repo` may be a
  GitHub URL; implementation needs a local checkout).
- Creates branch `auto/<task-slug>` off `--base` (default `main`) — **never commits to main**.
- Advances the cycle note: `stage: implement`, `status: active`, records `branch` +
  `target_path`, and starts a checkpoint log.

The agent then implements the refined spec on the branch, committing **checkpoints** as it
goes (so nothing is lost) and appending to the checkpoint log. A draft PR is opened for
review; the human merges. Kill switch: set the cycle `status: abandoned`.
