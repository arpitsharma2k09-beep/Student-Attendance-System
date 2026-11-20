Student Attendance System

A minimalist student attendance management system built with plain HTML, CSS and JavaScript. No frameworks, no backend, no installation.

Live demo: https://arpitsharma2k09-beep.github.io/Student-Attendance-System/

Features
Dashboard: total students, classes, days recorded, today's attendance and overall average, plus a list of students below 75%
Student management: add and remove students with roll number, name and class
Mark attendance: pick a date and class, set each student to Present, Absent or Late, with "All present" and "All absent" shortcuts
Edit past records: reopen any date to change it
Reports: attendance percentage per student for any date range and class, plus a day-by-day history for each student
CSV export: copy the report as CSV and open it in Excel or Google Sheets
Demo data: one click to fill the app with sample students and records
How to run
Download or clone this repository.
Open index.html in any modern browser.

That's it.

Project structure
Student-Attendance-System/
├── index.html   # page structure
├── style.css    # minimal styling
└── script.js    # app logic and data handling
How it works
Data is stored in the browser's localStorage, so it stays on the device and browser you use.
Clearing browser data erases the records.
Late counts as attended when calculating percentages.
Attendance below 75% is flagged.
Tech stack

HTML5 · CSS3 · Vanilla JavaScript

Future improvements
Backend and database for multi-device access
Teacher login
Import students from CSV
Charts and monthly summaries
License

Free to use for learning and personal projects.
