# GradeTrack

A modern, AMOLED-dark Telegram Mini App that helps university and college students track their GPA and CGPA — semester by semester, course by course.

No backend, no accounts, no tracking. All data lives on the student's device.

---

## Features

- **Dashboard** — greeting, live CGPA ring, academic status badge, credits completed, GPA trend preview, quick actions, recent semesters
- **Semester Management** — add / edit / delete semesters and courses, with live per-semester GPA
- **GPA Calculator** — an unsaved scratchpad for quick "what-if" GPA calculations with unlimited courses
- **Target CGPA** — calculates the GPA required across your remaining credits to hit a target CGPA, with feasibility checking
- **Trend** — a full GPA line chart across all semesters, plus highest / average / lowest stats
- **Settings** — student name, switchable grading scale (4.0 / 5.0 / 10.0, with automatic grade re-mapping), JSON export/import backup, and full data reset

## Tech Stack

- HTML5, CSS3, vanilla JavaScript (ES6) — no frameworks, no build step
- [Telegram WebApp SDK](https://core.telegram.org/bots/webapps) — theming, native BackButton/MainButton, haptics
- [Chart.js](https://www.chartjs.org/) — GPA trend visualization
- `localStorage` — all persistence, no server

## Folder Structure
