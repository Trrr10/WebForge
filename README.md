# DeskGuard

**Library Seat Booking & Anti-Hoarding System**

A real-time web application that eliminates desk hoarding in college libraries.
Students check in via QR code, timers run server-side, and librarians get a 
full control panel with analytics. No phantom seat-savers. No confrontation.

---

## The Problem

During exam season, 60–70% of library seats appear occupied while being 
physically empty. A bag marks the territory. The actual student is gone for 
hours. There is no system, no accountability, and no fair way to reclaim 
that seat without a confrontation.

DeskGuard fixes this at the infrastructure level.

---


## How It Works
Student scans QR code on desk

|

v

Server creates session + starts 2-hour timer

|

v

"Still here?" prompt fires at 2-hour mark

|
v

If Yes(then session renewed) and If no then session termed as abandoned and librarian notified

Next waitlist student gets 10-min claim window

**Away mode** — student hits Away, gets a 20-minute grace period.
Timer is server-side. Closing the browser changes nothing.

---

## Features

### Student-Facing
- Live colour-coded library map (Free / Occupied / Away / Abandoned)
- QR code check-in, works in any mobile browser, no app required
- Away button with 20-minute grace timer
- Still Here prompt every 2 hours with automatic desk release on no response
- Waitlist queue for any occupied desk with automatic FIFO notification

### Admin Dashboard
- Live desk status table with search and filter by status
- One-click manual desk reset and bulk abandon clear
- Session history log with duration and end reason
- Desk heatmap showing all-time booking frequency per seat
- Peak hours grid — bookings by day of week and hour
- Daily summary table for the last 30 days
- Section-level usage breakdown

---

## Tech Stack

| Layer        | Technology                    |
|--------------|-------------------------------|
| Frontend     | React 18, Vite                |
| Map Rendering| SVG, data-driven              |
| Backend      | Node.js, Express              |
| Database     | Supabase (PostgreSQL)         |
| Timers       | Server-side cron, setInterval |
| Auth         | HTTP header token             |

All desk timers are server-side exclusively. A browser crash, tab close, 
or network drop never corrupts session state.

---


```

---
