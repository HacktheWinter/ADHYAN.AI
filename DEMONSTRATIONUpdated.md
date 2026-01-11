## Live Demo

- **fully hosted link:** https://adhyan-ai.onrender.com/
- **Teacher Live Link:** https://adhyanai-teacher.onrender.com/
- **Student Live Link:** https://adhyanai-student.onrender.com/

---

# ADHYAN.AI — Local Demonstration Guide

This document explains how to set up and run **ADHYAN.AI** locally, and how to demonstrate its core features.

---

## 1. Clone the Repository

```bash
git clone https://github.com/AdhyanAi/ADHYAN.AI.git
cd adhyan-ai
```

---

## 2. Project Structure

```
adhyan-ai/
├── backend/
├── FrontendStudent/
├── FrontendTeacher/
└── README.md
```

---

## 3. Prerequisites

Ensure the following are installed on your system:

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local instance or Atlas connection)
- Git
- Active internet connection (for AI APIs)

Verify versions:

```bash
node -v
npm -v
git --version
```

---

## 4. Environment Setup

### Backend Environment Variables

All required `.env` files are already included in the repository.

---

## 5. Install Dependencies & Run

### Backend

```bash
cd backend
npm install
nodemon server.js
```

Backend runs at: `http://localhost:5000`

---

### FrontendStudent

Open a new terminal:

```bash
cd FrontendStudent
npm install
npm run dev
```

Runs at: `http://localhost:5173`

---

### FrontendTeacher

Open a new terminal:

```bash
cd FrontendTeacher
npm install
npm run dev
```

Runs at: `http://localhost:5174`

---

## 6. Accessing the Platform

- **Student Panel:** `http://localhost:5173`
- **Teacher Panel:** `http://localhost:5174`

---

## 7. Demo Flow (What to Show)

Follow this sequence for a smooth and logical demonstration.

---

### Step 1 — Login / Signup

- Login as **Teacher**
- Or create a new teacher account

---

### Step 2 — Create a Class (Teacher)

- Navigate to **Create Class**
- Enter class name and description
- Create the class
- Copy the generated **Class Code**

> This code is used by students to join the class.

---

### Step 3 — Student Joins Class

- Login as **Student** (or create a student account)
- Click **Join Class**
- Enter the class code shared by the teacher
- Student is now enrolled in the class

---

### Step 4 — Upload Content & Generate Assessment (Teacher)

- Upload lecture notes (PDF/Text)
- Click **Generate Quiz/Test Paper**
- Show MCQs and SAQs auto-generated from the notes

---

### Step 5 — Publish Assessment

- Publish the quiz or test paper
- Assign it to the created class

---

### Step 6 — Student Attempts Assessment

- Login as **Student**
- Open the assigned assessment
- Attempt the questions
- Highlight **Real Exam Mode** (tab-switch alert, focus tracking)

---

### Step 7 — Automated Grading

- Submit the student answers
- Show auto-generated scores and feedback

---

### Step 8 — Integrity & Analytics (Teacher)

- View integrity flags (if any)
- Show class performance charts
- Display plagiarism / AI-detection status

---

## 8. Key Features to Highlight

- Source-grounded subjective grading (fair, contextual, and consistent)
- Real Exam Mode & integrity monitoring
- Class-based workflow with teacher control
- Student self-service joining via class code
- Fast assessment generation from lecture notes
- Separate and secure teacher/student interfaces

---

## 9. Troubleshooting

| Issue                | Solution                                 |
| -------------------- | ---------------------------------------- |
| Frontend not loading | Ensure `npm run dev` is running          |
| Backend error        | Check `.env` and MongoDB connection      |
| AI not responding    | Verify API key and internet connectivity |
| CORS issue           | Check backend CORS configuration         |
| Class not visible    | Refresh page after joining class         |

---

## 10. Stopping the Servers

Press `CTRL + C` in all three terminal windows to stop the servers.

---

**Goal of Demo:**  
Show how ADHYAN.AI enables teachers to easily manage classes, generate assessments, evaluate students fairly, and maintain academic integrity — all while significantly reducing manual effort.

---
