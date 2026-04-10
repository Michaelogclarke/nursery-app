# Capacity Logic — Manual Test Guide

These tests verify the room capacity projection logic using the controlled test seed.
All tests assume today's date is **2026-04-10**.

---

## Setup

Run the test seed before starting any scenario:

```bash
npm run seed:test
npm run dev
```

To restore the full production data after testing:

```bash
npm run setup
```

---

## Scenario 1 — Room Full: Hard Block + Override

**What it tests:** When Babies is at exact capacity (12/12), adding a 13th child should be blocked with a clear error. Staff can override by typing the child's name.

**Setup state:** Babies room has 12 children (Baby01–Baby12 Test), all under 2 years old.

**Steps:**
1. Navigate to **Children → Add Child**
2. Enter any first and last name, e.g. `New Baby`
3. Enter DOB `2025-06-01` (clearly under 2, auto-assigns to Babies)

**Expected:**
- Room auto-assigns to **Babies**
- Red notification appears: *"This placement is not possible"*
- Message explains Babies is currently full
- **Save button is disabled**
- An input field appears: *Type "New Baby" to confirm*
- Typing anything other than the exact name keeps **Confirm Override** disabled
- Typing `New Baby` (case-insensitive) enables **Confirm Override**
- Clicking **Confirm Override** shows the yellow "Override active" banner and enables Save
- Clicking **Cancel** returns to the Children list without saving
- If override confirmed and saved, child appears in the Children list in Babies

---

## Scenario 2 — Grace Period Child: Move Button

**What it tests:** A child who has passed their normal age-out date but is still within the 4-month grace window should appear with a Move button in the Children list.

**Setup state:** "Grace Child" has DOB `2024-02-01`.
- Turned 2 on **2026-02-01** (2 months ago)
- Grace window: 2026-02-01 → **2026-06-01**
- Today (2026-04-10) is inside the window

**Steps:**
1. Navigate to **Children**
2. Look for **Child, Grace** in the list

**Expected:**
- Row has a **yellow/amber background**
- Tag shows: *Grace — move by 2026-06-01*
- **Move to Toddlers** button is visible on the right
- Clicking **Move to Toddlers** shows a confirmation prompt
- Confirming the prompt moves the child and refreshes the list
- After moving, Grace Child no longer has the grace highlight and their room shows as Toddlers

---

## Scenario 3 — Future Conflict: Blocked Hard Move

**What it tests:** When Toddlers is at 19/20 and a Babies child has a hard move into Toddlers within the 2-year horizon, adding a 20th Toddler-age child should trigger a future conflict warning.

**Setup state:**
- Toddlers has 19 children (Tod01–Tod19)
- "FutureMove Baby" has DOB `2024-04-10` — turns 2 today, hard move deadline **2026-08-10** (within 2 years)

**Steps:**
1. Navigate to **Children → Add Child**
2. Enter any name, e.g. `Conflict Child`
3. Enter DOB `2023-08-01` (aged 2y 8mo today — auto-assigns to Toddlers)

**Expected:**
- Room auto-assigns to **Toddlers**
- Yellow notification appears: *"Future capacity conflict"*
- Lists: *"Room will be full when FutureMove Baby must move in (2026-08-10)"*
- **Save button remains enabled** — this is advisory, not a hard block
- Staff can save despite the warning
- If saved, the child is added and the warning was the only gate

---

## Scenario 4 — After School Cutoff: Calendar Verification

**What it tests:** A child born on or before July 1 moves to After School on Sep 1 of the year they turn 4. A child born after July 1 stays in Pre-School.

**Setup state:**
- **AfterSchool Eligible** — DOB `2022-05-15` (turns 4 on 2026-05-15, before Jul 1 cutoff)
- **AfterSchool Ineligible** — DOB `2022-08-20` (turns 4 on 2026-08-20, after Jul 1 cutoff)

**Steps:**
1. Navigate to **Room Calendar**
2. Click **Next 4 weeks** until the view includes **September 2026** (around week of Sep 1)
3. Click on a day in the week of **Sep 1 2026** in the **After School** room row
4. Check the panel that opens on the right
5. Also click the same date in the **Pre-School** row

**Expected:**
- **After School panel** for any day in Sep 2026 onwards: shows **Eligible** (DOB 2022-05-15)
- **Pre-School panel** for the same date: shows **Ineligible** (DOB 2022-08-20), does NOT show Eligible
- For any date **before Sep 1 2026** (e.g. Aug 2026): both children appear in **Pre-School**
- Eligible child disappears from Pre-School and appears in After School exactly on Sep 1

---

## Scenario 5 — Leaver Frees a Space: No Conflict

**What it tests:** When a child is about to leave a room (within grace window), their departure should be accounted for in the projection — meaning a new child whose hard move arrives *after* the leaver departs should not trigger a conflict.

**Setup state:**
- Toddlers has 19 children (Tod01–Tod18 + Tod19 Leaver)
- **Tod19 Leaver** — DOB `2023-04-10`, turns 3 today, grace window ends **2026-08-10** (will leave Toddlers)
- **FutureMove Baby** — DOB `2024-04-10`, hard move into Toddlers by **2026-08-10**
- Net at 2026-08-10: Tod19 leaves (19→18), FutureMove arrives (18→19) — still under 20

**Steps:**
1. Navigate to **Children → Add Child**
2. Enter any name, e.g. `Safe Child`
3. Enter DOB `2024-09-01` (aged 1y 7mo — auto-assigns to Babies, not Toddlers)

> Note: To test Toddlers specifically, use DOB `2023-09-01` (aged 2y 7mo → Toddlers)

4. Enter DOB `2023-09-01`

**Expected:**
- Room auto-assigns to **Toddlers**
- **No conflict notification appears** — the leaver vacates before FutureMove Baby arrives
- Save button is enabled immediately
- Child saves successfully

---

## Quick Reference

| Scenario | DOB to enter | Start date to enter | Room assigned | Expected outcome |
|----------|-------------|---------------------|---------------|-----------------|
| 1 — Room full | `2025-06-01` | `2026-04-10` or later | Babies | Red hard block, override required |
| 2 — Grace period | *(existing child)* | *(existing)* | Babies | Move button in Children list |
| 3 — Future conflict | `2023-08-01` | `2026-04-10` | Toddlers | Yellow warning, save still allowed |
| 4 — After School | *(calendar view)* | *(existing)* | Pre-School → After School | Correct room from Sep 2026 |
| 5 — Leaver frees space | `2023-09-01` | `2026-04-10` | Toddlers | No warning, clean save |
| Start date check | `2025-06-01` | `2025-05-01` (before DOB) | — | Red block: child not yet born by start date |

---

---

## Scenario 6 — Start Date: Child Not Yet Born

**What it tests:** If the start date entered is before the child's DOB, the system should block the placement entirely.

**Steps:**
1. Navigate to **Children → Add Child**
2. Enter any name, e.g. `Future Child`
3. Enter DOB `2026-06-01`
4. Enter start date `2026-05-01` (one month before DOB)

**Expected:**
- Red notification appears: *"The child has not yet been born by the chosen start date"*
- No room is assigned
- Save button is disabled
- Correcting the start date to `2026-07-01` (after DOB) clears the block and assigns Babies

---

## Resetting Between Tests

If scenario 1's override is confirmed and saved, the 13th baby will now be in Babies (13/13 — over capacity). Re-run the test seed to reset:

```bash
npm run seed:test
```
