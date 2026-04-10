# Room Capacity Projection Logic

## The Problem

A nursery room can appear to have space today but still be an unsafe placement. If a child is added to a room (new intake or early/soft move), they may take the last available spot — meaning a child who **must** move into that room in the future (a hard move) has nowhere to go.

This is the chain-block problem:
- Child A joins Pre-School today, filling the last spot
- In 6 months, a Toddler turns 3 and must move to Pre-School
- Pre-School is now full — that mandatory move is blocked

The system solves this by projecting room occupancy **2 years forward** before confirming any placement.

---

## Key Concepts

### Hard Move
A move that **must** happen because a child has reached the age threshold for their current room. There is no flexibility — the child cannot stay indefinitely.

### Soft Move
An early move within the **4-month grace period**. The child is eligible to move but is not yet required to. Soft moves are what the projection guards against allowing if they would block a future hard move.

### Grace Period
Each room allows a child to stay up to **4 months past** their age-out date. This exists for advanced children who can be moved early to free up space in the room below, but must not block incoming hard movers.

---

## Room Progression & Age Thresholds

| From | To | Hard Move Trigger | Grace Period |
|---|---|---|---|
| Babies | Toddlers | Child turns 2 | +4 months |
| Toddlers | Pre-School | Child turns 3 | +4 months |
| Pre-School | After School | Child turns 4 on/before July 1 | Moves Sep 1 |

### After School Special Rule
- Child must turn 4 **on or before July 1** of the relevant year
- Move date is always **September 1** of that year (school start)
- Children who miss the July 1 cutoff remain in Pre-School until the following September

---

## How the Projection Works

When a room is selected on the Add/Edit Child form, the system runs `children:checkRoomCapacity` before saving. Here is what it does step by step:

### 1. Fetch current occupancy
Count all active children currently in the destination room, excluding the child being moved (to avoid double-counting on edits).

### 2. Simulate placement
Add 1 to the current occupancy — this represents the child being placed.

### 3. Identify all hard movers
Look at the **feeder room** (the room below in the chain) and find every child whose hard move date falls within the next 2 years.

- For standard rooms: `hard_move_date = dob + age_threshold + grace_period`
- For After School: `hard_move_date = September 1` of the year they turn 4, if birthday ≤ July 1

### 4. Account for leavers
For each hard move date, count how many children currently in the destination room will have already aged out (moved to the next room up) by that date. These are subtracted from the occupancy projection.

### 5. Check capacity at each move date
```
projected_occupancy = (current + 1) - leavers_before_date + 1 (incoming hard mover)
```
If `projected_occupancy > max_capacity` at any hard move date → conflict flagged.

### 6. Return result
- `{ ok: true }` — safe to place
- `{ ok: false, conflicts: [...] }` — list of blocked hard moves with child name, move date, and reason

---

## Where the Logic Lives

| File | Role |
|---|---|
| `electron/main.js` | `children:checkRoomCapacity` IPC handler — all projection logic lives here |
| `electron/preload.js` | Exposes `window.electronAPI.children.checkRoomCapacity` to the renderer |
| `src/pages/ChildForm.jsx` | Calls the check when a room is selected; shows warnings before save |

---

## What the Warning Looks Like

When a conflict is detected, a warning block appears on the form above the Save button listing each blocked hard move, e.g.:

> **Capacity conflict detected**
> Placing this child here will block the following mandatory room moves:
> - Room will be full when Charlie Scott must move in (2025-08-11)

The form does not hard-block the save — staff can override if they have a plan to resolve the conflict — but the warning makes the issue visible before the decision is made.

---

## Capacity Ranges by Room

| Room | Min | Max | Age Range |
|---|---|---|---|
| Babies | 9 | 12 | 0–2 years |
| Toddlers | — | 20 | 2–3 years |
| Pre-School | 16 | 16 | 3–5 years |
| After School | — | 20 | 4–11 years |
