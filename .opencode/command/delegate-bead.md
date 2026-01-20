---
description: Delegate a beads ticket to the GLM-4.7 worker for implementation
---

Delegate the specified bead to the beads-worker agent for implementation.

<UserRequest>
$ARGUMENTS
</UserRequest>

## Instructions

1. Parse the bead ID from the user request (format: `letta-stuff-xxx`)

2. Fetch bead details:
```bash
bd show <bead-id>
```

3. Invoke the beads-worker agent with this prompt structure:

```
BEAD: <bead-id>
TITLE: <title from bd show>
DESCRIPTION: <full description>
ACCEPTANCE: <acceptance criteria if stated, otherwise infer from title>
FILES: <list relevant files based on bead context>
CONSTRAINTS:
- Follow existing codebase patterns
- Do not modify files outside scope
- Run trunk check and npm test before responding
```

4. When the worker responds, evaluate:
   - If RESULT is PASS: Review the "Files for Review" section, spot-check changes
   - If RESULT is FAIL: Examine failures, decide if you need to intervene
   - If RESULT is NEEDS_REVIEW: Read flagged issues and decide next steps

5. After verification:
   - If work is acceptable: `bd close <bead-id> --reason="<summary>"`
   - If issues found: Fix them yourself or re-delegate with clarification
