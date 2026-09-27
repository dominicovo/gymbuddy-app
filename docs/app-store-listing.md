# App Store listing — GymBuddy 1.0

Everything App Store Connect asks for, ready to paste. Character limits are
Apple's; every field here is within them.

## App information

| Field | Value |
| --- | --- |
| Name (30) | GymBuddy — if taken on the App Store: `GymBuddy: Gym App Lock` |
| Subtitle (30) | Unlock your apps at the gym |
| Primary category | Health & Fitness |
| Secondary category | Productivity |
| Content rights | Does not contain, show or access third-party content |
| Price | Free (no in-app purchases) |
| Copyright | 2026 Dominic Eburuoh |

## URLs

| Field | Value |
| --- | --- |
| Support URL | https://www.gymbuddy.live/support |
| Marketing URL | https://www.gymbuddy.live |
| Privacy Policy URL | https://www.gymbuddy.live/privacy |

## Promotional text (170)

Pick the apps that pull you in. On gym days they lock until you check in at the gym with a photo. Pair with a buddy to keep each other honest.

## Description (4000)

```
GymBuddy locks the apps that pull you in — Instagram, TikTok, YouTube, games, whatever you choose — on your gym days, until you actually show up.

HOW IT WORKS
• Pick your apps. Apple's Screen Time does the locking, so it's real, system-level blocking, not a reminder you can swipe away.
• Set your gym days and a window, like Mon, Wed and Fri from 6 AM to 8 PM. Rest days never lock.
• When the window opens, your apps lock. No snooze button.
• At the gym, open GymBuddy and snap a photo of the kit around you. Your phone checks it looks like a gym, and everything unlocks for the rest of the day.

STRICT, NEVER STUCK
• Apps unlock on their own when your window ends, even if you skip. Your streak resets, though.
• A short grace period at the start gives you time to get out the door.
• Strict mode stops you editing your schedule or apps while you're locked.

BETTER WITH A BUDDY
• Pair up with a 4-digit code. You'll see each other's check-ins and streaks, and who still needs to go today.
• Send a nudge to a buddy who hasn't made it yet, or a cheer when they do. They get a notification.

PRIVATE BY DESIGN
• Apple keeps the list of apps you lock on your iPhone. Even we can't see it.
• Your check-in photo is checked on your phone and never uploaded.
• GymBuddy doesn't use your location.
• Delete your account, and everything on it, any time from Settings.

Sign in with Apple or Google. Requires iOS 16.4 or later and Screen Time permission.
```

## Keywords (100)

```
gym,workout,screen time,app blocker,focus,habit,streak,accountability,motivation,discipline,fitness
```

## What's new (version 1.0)

First release.

## Age rating

Answer **None / No** to every question in the questionnaire. That gives **4+**.
There is no unrestricted web access, no chat, no ads, no gambling. Buddies see
each other's name, handle, optional profile photo, streak and check-in times;
nudges and cheers are fixed messages, not free text.

## App Privacy ("nutrition label")

Data used to track you: **No**. For each type below: **Linked to the user**,
**not used for tracking**, purpose **App Functionality** only.

| Category | Data type | Why |
| --- | --- | --- |
| Contact Info | Name | From Sign in with Apple / Google; shown to buddies |
| Contact Info | Email Address | Account sign-in |
| User Content | Photos or Videos | Optional profile photo (the check-in photo is not collected) |
| Health & Fitness | Fitness | Gym days, check-in times and streak, shared with buddies |
| Identifiers | User ID | Account ID that links the above |

Not collected: location, the check-in photo, which apps are locked (Apple keeps
that on the device), browsing history, usage data, diagnostics, contacts.

## App Review information

**Sign-in required:** Yes, but no demo account is needed. **Sign in with Apple**
creates an account in one tap, so enter "No demo account needed" and paste the
notes below.

**Contact:** your name, phone number and hello@gymbuddy.live.

**Notes for the reviewer:**

```
GymBuddy is a self-control app. The user chooses apps on their own iPhone to lock on their own gym days, and unlocks them by checking in at the gym with a photo. It uses the Family Controls / Screen Time API with individual authorization only (the user authorizes their own device; no parent or child accounts).

Sign in: use Sign in with Apple. No demo account is needed.

To see locking quickly:
1. Allow Screen Time when asked, then pick one or two apps to lock.
2. Choose today as a gym day and a window that includes the current time.
3. In Profile > Settings, set Grace period to 0 so apps lock immediately (the default gives 15 free minutes).
4. The chosen apps now show GymBuddy's lock screen.

To unlock: in GymBuddy tap "I'm at the gym" and take a photo. Apple's on-device Vision framework checks the photo looks like a gym; nothing is uploaded. Outside a gym, the photo is rejected; after three rejected photos "Use this photo anyway" appears, so reviewers can complete the flow anywhere. Apps also unlock automatically when the window ends.

Buddies need a second account: enter a friend's 4-digit pair code under Buddies > Add; they accept the request, then each sees the other's check-ins and streak and can send nudges and cheers (delivered as push notifications). Our test account's pair code is [YOUR PAIR CODE] — send it a request and we'll accept it.

Account deletion: Profile > Settings > Delete account.
```

Replace `[YOUR PAIR CODE]` with the code on your Profile before submitting,
and accept the reviewer's request when it arrives.

## Screenshots

Required: **6.9" iPhone** (1290 × 2796 px portrait). No iPad screenshots — the
app is iPhone-only. Suggested set, in order:

1. Today — apps locked, countdown, "I'm at the gym"
2. Check-in — gym photo with "Looks like a gym"
3. Buddies — sections with who's in, who's still to go
4. Profile — streak, stats and the 12-week grid
5. Lock screen — a buddy's nudge notification
6. Setup — "When do you train?" schedule
