# Anti-Proxy Device Binding Logic (Adhyan.ai)

## Objective
To prevent students from giving proxy attendance by logging into their friends' accounts on their own devices.

## The Problem
In standard web applications, users can log into their accounts from any number of devices. This allows a student to share their credentials with a friend, who can then log in on their own phone and mark attendance for them.

## The Solution: Strict Slot-Based Device Binding
We implemented a system that strictly locks a student's account to **1 Desktop** and **1 Mobile** device. 

- When a student logs in on their phone, that specific phone occupies the **Mobile Slot**.
- If a friend tries to log in using their own phone with the same ID, the system rejects it because the **Mobile Slot** is already occupied.
- The student can still simultaneously log in on their laptop, as it safely occupies the separate **Desktop Slot**.

## How It Was Implemented

### 1. Frontend: Persistent Device Tokens
**File:** `FrontendStudent/src/Pages/Login.jsx`

Because web browsers restrict access to true hardware IDs (like IMEI or MAC addresses) for security reasons, we generate a unique cryptographic token (`uuid`) locally in the browser. 
- On the Login page, before a user signs in, the frontend checks `localStorage` for a `deviceId`.
- If one does not exist, it generates a highly secure UUID and saves it permanently to `localStorage`.
- This `deviceId` acts as a unique hardware footprint for that specific browser/device and is sent to the backend with the email and password during login.

### 2. Backend: The Database Schema
**File:** `backend/models/User.js`

We augmented the `User` schema to hold two dedicated slots for device IDs.
```javascript
  // Device binding (anti-proxy attendance) - 1 mobile, 1 desktop max
  boundDevices: {
    mobile: { type: String, default: null },
    desktop: { type: String, default: null }
  },
```

### 3. Backend: The Validation Controller
**File:** `backend/controllers/studentController.js`

Inside the `loginStudent` endpoint, we added a validation layer right before generating the JWT token:

1. **Device Identification**: It extracts the `deviceId` from the request.
2. **Device Categorization**: It reads the `User-Agent` HTTP header to determine if the device making the request is a mobile phone/tablet or a desktop/laptop.
```javascript
const userAgent = req.headers["user-agent"] || "";
const isMobile = /Mobile|Android|iP(ad|hone|od)|IEMobile|BlackBerry|.../i.test(userAgent);
const deviceType = isMobile ? "mobile" : "desktop";
```
3. **Slot Verification**: 
   - It checks the student's document for the `deviceType` slot (`mobile` or `desktop`).
   - If the slot is empty (`null`), it saves the `deviceId` to the slot and allows the login.
   - If the slot has the *exact same* `deviceId`, it allows the login (returning user).
   - If the slot is filled by a *different* `deviceId`, it blocks the login entirely returning a `403 Forbidden` error.

## Admin Reset (Edge Cases)
If a student buys a new phone or completely clears their browser cache/site data, they will generate a new `deviceId` on their next login attempt. Since their old device is currently occupying the slot in the database, they will be blocked.

In this scenario, a database administrator (or a future Admin API) can simply reset the `boundDevices.mobile` field to `null` in their MongoDB document to allow them to register their new device.
