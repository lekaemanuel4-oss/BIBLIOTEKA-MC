                           ┌───────────────────────┐
                           │   INDEX PAGE          │
                           │                       │
                           │ [Student Login]       │
                           │ [Student Signup]      │
                           │ [Admin Login]         │
                           └─────────┬─────────────┘
                                     │
                                     │
             ┌───────────────────────┴───────────────────────┐
             │                                               │
┌─────────────────────────┐                       ┌───────────────────────────┐
│ STUDENT LOGIN / SIGNUP  │                       │ ADMIN LOGIN               │
│                         │                       │   (only one admin)        │
│ Status checked in Users │                       │                           │
│ sheet: Active / Pending │                       └─────────┬─────────────────┘
│ / Declined              │                                 │
└─────────────┬───────────┘                                 │
              │                                             │
              ▼                                             ▼
   ┌────────────────────────┐                     ┌─────────────────────────────┐
   │ BIBLIOTEKA-STD.HTML     │                     │ ADMIN DASHBOARD (Tabs or    │
   │                         │                     │ separate pages)             │
   │ - Shows all books       │                     │                             │
   │ - Reserve 1 book        │                     │ 1. BOOK MANAGEMENT           │
   │ - Can only have 1 active│                     │    - Add book               │
   │   reservation           │                     │    - Edit Cop / Stock       │
   │ - Cop gjendje checked   │                     │    - Optional archive       │
   │ - Shows Status          │                     │                             │
   └─────────────┬──────────┘                     │ 2. RESERVATION MANAGEMENT    │
                 │                                 │    - Pending requests       │
                 │                                 │    - Approve / Decline      │
                 │                                 │    - Mark Delivered         │
                 │                                 │                             │
                 ▼                                 │ 3. ACCOUNT APPROVAL PAGE     │
         ┌──────────────┐                          │    - View Pending Signups    │
         │ PROFILE /     │                          │    - Approve / Decline      │
         │ RESERVATIONS  │                          │                             │
         │ - Shows active│                          └─────────────────────────────┘
         │   reservation │
         │ - Shows past  │
         │   books       │
         └──────────────┘
