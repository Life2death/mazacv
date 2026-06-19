# MazaCV — Complete Design Brief
### Upload this file to Claude and say: "Design all screens for this app per this brief. Mobile-first. Give me high-fidelity mockups for each screen and every state."

---

## What is MazaCV?

A freemium web app for Indian job seekers. Users:
1. Upload their resume (PDF / Word / paste text)
2. Paste a job description
3. Get a free **ATS match score /100** with matched keywords, missing keywords, and format tips
4. (Paid) Click **"AI se sahi karwa lelo"** → Claude AI rewrites the resume against the JD
5. Download the tailored resume as **PDF or Word**

Think: *"Grammarly for getting shortlisted — but desi, jhakaas, and made in Mumbai."*

---

## Brand

**Name:** MazaCV · **Domain:** mazacv.in
**Tagline:** *"CV banao mazedaar, naukri karo pakki."*
*(Make your CV great, make the job certain.)*

**Name meaning:** **Maza** (माझा) = **"my / mine" in Marathi** → **MazaCV = "My CV."** Personal and ownership-driven. Bonus: "maza" also reads as "fun" in Hindi.

**Brand family:** A sibling to **LiftLelo** (carpooling) and **NaukriLelo** — all share the same warm, action-led, desi personality, rooted in Maharashtra.

**Personality:**
Your **smart, street-smart Mumbai dost (friend)** who knows exactly how the hiring system works. Confident, warm, slightly cheeky. Says *"tension nahi lene ka, scene set kar denge"* (don't worry, we'll sort it out).

- Confident, not arrogant
- Encouraging — never shames a low score; always offers a fix
- **Hinglish in the UI chrome** (buttons, reactions, empty states, loaders)
- **100% professional English in the resume output** — slang never leaks into anything the user shows an employer

---

## Color Palette

| Role | Color | Hex |
|---|---|---|
| Primary / action | Indigo | `#4f46e5` |
| Hover / dark | Deep indigo | `#4338ca` |
| Accent — energy, celebration | Mumbai-taxi amber | `#F59E0B` |
| Accent — warmth | Saffron / kesar orange | `#FB923C` |
| Success (high score) | Green | `#16a34a` |
| Warning (mid score) | Amber | `#f59e0b` |
| Danger (low score / missing) | Red | `#ef4444` |
| Background | Slate 50 | `#f8fafc` |
| Surface / cards | White | `#ffffff` |
| Text primary | Slate 900 | `#0f172a` |
| Text secondary | Slate 500 | `#64748b` |

**Optional texture:** a subtle kolam / Warli art repeating line motif as a background watermark — 5–8% opacity only, never busy. Adds a "Made in India" craft feel without cluttering.

---

## Typography

- **Headlines & CTAs:** Poppins (Bold / SemiBold) — friendly, rounded, modern
- **Body & UI copy:** Inter (Regular / Medium) — highly legible, Hinglish reads cleanly
- Font stack should support Devanagari glyphs for future localisation

---

## Pricing (for the Pricing screen)

| Plan | Hindi name | Price | What's included |
|---|---|---|---|
| Free | Bindaas | ₹0 | Unlimited scoring, keyword gaps, format tips |
| One-shot | Ek Baar | ₹49 one-time | 1 AI resume tailor + 1 PDF or Word export |
| Pro | Jhakaas | ₹199/mo or ₹999/yr | Unlimited AI tailoring + export + history |

Payment: UPI / cards via Razorpay (primary). Show UPI logo prominently.
Trust copy: *"Cancel kabhi bhi. No tension."*

---

## Hinglish Microcopy Table

Use these throughout. Always pair a bold Hinglish line with a smaller plain-English helper for clarity. Never use Devanagari script in this version — Romanised Hindi only.

| Location | Primary Hinglish copy | English helper (smaller, below) |
|---|---|---|
| Hero headline | **"CV banao mazedaar, naukri karo pakki."** | Score your resume against any job — free. |
| Upload zone | "Apna resume idhar daal 📄" | Upload PDF, Word, or paste text |
| JD input | "JD yahan paste maar" | Paste the full job description |
| Primary CTA button | **"Score nikaal!"** | Check my match score |
| Scoring loader | "Ruk, calculate kar raha hu… ⏳" | Scoring your resume |
| Score 75–100 | **"Jhakaas! 🔥 Tera resume ekdum fit hai."** | Strong match — apply with confidence |
| Score 45–74 | "Thoda aur mehnat, boss. Banta hai." | Decent match — a few tweaks will help |
| Score 0–44 | **"Locha hai! Chal AI se theek karte hai."** | Low match — let's fix it together |
| Missing keywords label | "Yeh shabd missing hai — daalna padega" | Keywords the JD wants, not in your resume |
| Matched keywords label | "Yeh already mast hai ✅" | Keywords you already nailed |
| AI improve button | **"AI se sahi karwa lelo ✨"** | Tailor my resume with AI |
| AI loader | "Apun ka AI kaam pe laga hai…" | Tailoring your resume |
| After rewrite | "Ho gaya boss! Score upar gaya 📈" | Done — your score improved |
| Download PDF | "PDF download kar lelo" | Download as PDF |
| Download Word | "Word mein le ja" | Download as Word |
| Upgrade nudge | **"Free limit khatam, bhidu! Pro le lelo, unlimited."** | You've hit the free limit — go Pro |
| Error / fail | "Arre, kuch locha ho gaya. Phirse try kar." | Something went wrong — try again |
| Dashboard empty | "Abhi tak kuch nahi. Pehla resume score kar lelo!" | No scans yet — score your first resume |
| Login returning | "Wapas aa gaya, boss! 👋" | Welcome back |
| Signup | "Naya hai? 30 second mein account bana." | New here? Create an account in 30 seconds |
| Footer | "Banaya Mumbai mein, ❤️ se. LiftLelo family." | Made in Mumbai with love |

**Slang palette for any additional copy:** jhakaas (awesome), ekdum (totally), mast (great/cool), bindaas (chill/free), boss / bhidu / dost (buddy), scene set hai (all sorted), tension nahi lene ka (don't worry), locha / locha hai (problem/mess), apun (me/I), full to (totally/completely), banta hai (works out), nikaal (pull it out/get it).

---

## Illustration & Imagery

- Friendly **flat illustrations** of a diverse young Indian working crowd — auto-rickshaw commuters, local train riders, chai-tapri (roadside tea stall) energy. Aspirational but relatable.
- Optional mascot: a confident, smiling Mumbai "bhidu" character in a blazer giving a thumbs-up — could be the empty-state and loader character across the Lelo family apps.
- Avoid Western stock-photo imagery.

---

## UX Principles (non-negotiable)

1. **No login wall before the first score.** Let users feel the value instantly, then nudge them to sign up for AI / export.
2. **Never shame a low score** — always pair it with the fix path ("Chal theek karte hai").
3. **Mobile-first, always.** Most Indian users are on mid-range Android at 360–390px. Design that width first. Tap targets minimum 48px.
4. **Fast + light.** Generous white space. No heavy gradients. Works on a 4G connection.
5. **Trust signals everywhere.** Careers are emotional. Show: privacy note, "Made in Mumbai", real user numbers, UPI logos.
6. **Accessibility.** Colour is never the only signal — always pair score colour with the words AND the number. Good contrast ratios.

---

## Screens to Design

Design **all 6 screens** below. For every screen provide **mobile (360px) + desktop (1280px)** mockups and show **all major states** (empty, loading, success, error).

---

### Screen 1 — Landing / Hero

**Purpose:** convert visitors to try the free score. No login required.

**Sections:**
- Nav: Logo "MazaCV" + "Kaise kaam karta hai" (How it works) + "Pricing" + "Login" + **"Score nikaal — free!"** CTA button
- Hero: large Hinglish headline + English subline + single big CTA
- Trust strip: "50,000+ resumes scored" · "Made in Mumbai 🇮🇳" · "Your data stays private 🔒" · UPI accepted
- 3-step mini explainer (icons + short copy):
  - Step 1: "Resume daal" (Upload)
  - Step 2: "JD paste maar" (Paste JD)
  - Step 3: "Score dekh, AI se fix kar" (Score + Fix)
- Testimonials or sample score card (show what the result looks like)
- Footer with LiftLelo family note + privacy link

---

### Screen 2 — The Scorer (core workflow)

**Purpose:** the main product. Two inputs + score results on one page.

**Layout:**
- **Card A — Resume input:** drag-and-drop zone ("Apna resume idhar daal 📄") with a file icon and "ya paste karo" (or paste text) toggle below
- **Card B — JD input:** large textarea ("JD yahan paste maar") with a character/word count
- **Primary button:** "Score nikaal!" (full-width on mobile, centred on desktop)

**States:**
- *Empty:* both cards unfilled, button disabled/greyed
- *Loading:* button spins, shows "Ruk, calculate kar raha hu… ⏳"
- *Results appear below (or replace the form):*
  - Big **circular score gauge /100**, colour-coded (green/amber/red), with the reaction line above ("Jhakaas! 🔥 / Thoda aur mehnat / Locha hai!")
  - Sub-scores: "Keyword coverage: 78%" and "Content similarity: 65%" in smaller text
  - Two keyword chip columns side by side:
    - Left: "Yeh shabd missing hai" — red chips of missing keywords
    - Right: "Yeh already mast hai ✅" — green chips of matched keywords
  - Format tips callout (amber warning box) with bullet list
  - **AI improve button:** "AI se sahi karwa lelo ✨" — with a small "Pro / ₹49" badge

---

### Screen 3 — AI-Tailored Result

**Purpose:** show the improved resume and let the user download it.

**Sections:**
- Score before → after (animated count-up on the number: e.g. 42 → 71) with "Ho gaya boss! Score upar gaya 📈"
- "Kya badla?" (What changed?) — bullet list of improvements
- Full rewritten resume in a clean, readable preview panel (monospace / readable sans, professional look — zero slang in this panel)
- Two download buttons side by side: **"PDF download kar lelo"** and **"Word mein le ja"**
- Soft "Re-score" badge confirming the new score
- Upsell if one-shot user: "Aur resume chahiye? Pro le lelo — unlimited."

---

### Screen 4 — Pricing

**Purpose:** convert free users to Ek Baar (₹49) or Pro (₹199/mo).

**Layout:** three plan cards side by side (stack on mobile):

**Bindaas (Free) — ₹0**
- Unlimited scoring
- Keyword gap analysis
- Format tips
- CTA: "Shuru karo — free!" (Start free!)

**Ek Baar (One-shot) — ₹49**
- Everything in Free +
- 1 AI resume tailoring
- 1 PDF or Word export
- CTA: "₹49 mein le lelo" (Get it for ₹49)
- Show UPI logo + "Pay with UPI"

**Jhakaas (Pro) — ₹199/mo or ₹999/yr**
- Everything in Ek Baar +
- Unlimited AI tailoring
- Unlimited PDF/Word export
- Resume history + dashboard
- Badge: "BEST VALUE"
- CTA: "Pro ban ja!" (Go Pro!)
- Annual toggle at top: show monthly vs yearly price

Trust line below: *"Cancel kabhi bhi. No tension. UPI · Cards accepted."*
Show Razorpay logo + UPI / Visa / Mastercard / RuPay logos.

---

### Screen 5 — Login / Signup

**Purpose:** minimal, frictionless auth. Warm tone.

**States:**
- *Returning user:* "Wapas aa gaya, boss! 👋" — email input + "Send magic link" + Google sign-in button
- *New user:* "Naya hai? 30 second mein account bana." — same UI, different heading
- Toggle: "Already account hai? Login kar." / "Naya account? Sign up."

Single card, centred, mobile-first. No distracting nav.

---

### Screen 6 — Dashboard / History (Pro)

**Purpose:** Pro users review and reuse past scans.

**Sections:**
- Greeting: "Kya scene hai, [Name]? 👋"
- List of past scans (cards): company/role name (from JD), score badge, date, "Re-open" and "Download" buttons
- Empty state: "Abhi tak kuch nahi. Pehla resume score kar lelo!" + big CTA back to scorer
- Sidebar or top nav: Home · New Scan · Dashboard · Upgrade · Logout

---

## Small Components (design these too)

- **Score gauge** — circular dial, 0–100, in all three colour zones (green/amber/red), with the reaction text above
- **Keyword chip** — matched (green bg, green text) and missing (red bg, red text) variants
- **Upgrade modal** — appears over any screen when free limit is hit. "Free limit khatam, bhidu!" with the three plan options and a close button
- **Loader** — full-screen or inline, with the Hinglish loading messages rotating
- **Toast notifications** — success (green), error (red), warning (amber) with Hinglish copy
- **CTA Button** — primary (indigo), secondary (outline), disabled states

---

## Deliverables Requested

1. High-fidelity mockups for **all 6 screens**, mobile + desktop, all states
2. All **small components** above
3. A **style tile** (one page): logo lockup, colour swatches, type scale, button styles, chip styles, tone-of-voice example
4. All copy in mockups must use the **Hinglish microcopy table** above

---

*This app is part of the LiftLelo brand family — owned and built in Mumbai, Maharashtra, India. Keep the personality warm, desi, action-led, and trustworthy. The UI speaks Mumbai; the resume output speaks boardroom.*
