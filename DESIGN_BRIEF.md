# ResumeLelo — Design Brief for Claude (screen design)

> Hand this whole file to Claude and say: *"Design the screens for this app per
> this brief. Mobile-first. Give me high-fidelity mockups for each screen and
> each state."* Everything Claude needs — brand, voice, colors, layout,
> microcopy — is below.

---

## 1. The product in one line

A web app where anyone in India uploads their resume, pastes a job description,
gets a **free ATS match score**, and (paid) lets AI **tailor the resume** and
download it as PDF / Word. Think "Grammarly for getting shortlisted."

The working code already exists (Next.js). This brief is **only about the
visual + UX design** of the screens.

---

## 2. The name — recommendation + options

**Primary recommendation: `ResumeLelo`** 🟢

It sits inside the owner's existing brand family — he runs **LiftLelo**
(carpooling) and **NaukriLelo** — so "Lelo" ("grab it / take it" in Hindi) is
already a recognised, trusted house style. Instant brand cohesion, easy to say,
easy to remember, `.com`/`.in` likely available.

**Tagline options (pick one, all Bambaiya/Mumbai-flavoured):**
- "Resume ko banao **jhakaas**." (jhakaas = awesome — iconic Mumbai word)
- "Naukri ka scene, **set** kar lelo."
- "Apna resume, **ekdum fit**."

**Alternate names if you want more punch / more local masala:**

| Name | Vibe | Note |
|---|---|---|
| **JhakaasCV** | Bold, very Mumbai | "Jhakaas" = legendary Mumbai slang for awesome |
| **ApunkaResume** | Tapori/Bambaiya | "Apun" = "me/I" in Mumbai street slang — super local |
| **FulltoFit** | Youthful | "Full to" = totally; "fit" = matches the JD |
| **NaukriFit** | Clean, descriptive | Pairs naturally with NaukriLelo |
| **ScoreLelo** | Action-led | Emphasises the free score hook |

> Go with **ResumeLelo** for brand consistency; keep **JhakaasCV** as the bold
> marketing alter-ego if you want a louder youth campaign later.

---

## 3. Brand personality

ResumeLelo is your **smart, street-smart Mumbai dost (friend)** who happens to
know exactly how to crack the hiring system. Not a corporate HR tool — a
confident, warm, slightly cheeky buddy who says "tension nahi lene ka, scene
set kar denge."

- **Confident, not arrogant** — "Apun ko pata hai kaise shortlist hote hai."
- **Warm + encouraging** — never shames a low score; rallies the user.
- **Local but professional** — Hinglish/Bambaiya in the *chrome and emotion*
  (buttons, reactions, empty states), but the actual **resume output stays
  100% professional English**. The slang is the personality, not the product.
- **Honest** — the score is real; we don't fake-flatter.

**Tone rule:** Hinglish in the UI voice, pure professional English in anything
the user will show an employer.

---

## 4. Local-language microcopy (the "Mumbai infusion")

Use these across the UI. Keep an English subtitle under bold Hinglish where
clarity matters (some users prefer English-first — make it feel local, not
exclusionary). **Romanised Hindi/Marathi/Bambaiya**, not Devanagari, for the
casual bits.

| Where | Hinglish microcopy | Plain-English helper (smaller, below) |
|---|---|---|
| Hero headline | "Resume ko banao **jhakaas**, naukri karo pakki." | Score your resume against any job — free. |
| Upload resume | "Apna resume idhar daal 📄" | Upload PDF, Word or paste text |
| Paste JD | "JD yahan paste maar" | Paste the full job description |
| Primary CTA | "**Score nikaal!**" | Check my match score |
| Loading | "Ruk, calculate kar raha hu… ⏳" | Scoring your resume |
| Score 75-100 | "**Jhakaas! 🔥** Tera resume ekdum fit hai." | Strong match — apply with confidence |
| Score 45-74 | "Thoda aur mehnat, boss. Banta hai." | Decent match — a few tweaks needed |
| Score 0-44 | "**Locha hai!** Chal AI se theek karte hai." | Low match — let's fix it |
| Missing keywords | "Yeh shabd missing hai — daalna padega" | Keywords the JD wants, not in your resume |
| Matched keywords | "Yeh already mast hai ✅" | Keywords you already nailed |
| AI improve CTA | "**AI se sahi karwa lelo ✨**" | Tailor my resume with AI |
| AI working | "Apun ka AI kaam pe laga hai…" | Tailoring your resume |
| After rewrite | "Ho gaya boss! Score upar gaya 📈" | Done — your score improved |
| Download PDF | "PDF download kar lelo" | Download as PDF |
| Download Word | "Word mein le ja" | Download as Word |
| Upgrade nudge | "Free limit khatam, bhidu! Pro le lelo, unlimited." | You've hit the free limit — go Pro |
| Empty / error | "Arre, kuch locha ho gaya. Phirse try kar." | Something went wrong — try again |
| Footer | "Banaya Mumbai mein, ❤️ se. LiftLelo family." | Made in Mumbai with love |

**Words worth keeping in your slang palette:** jhakaas (awesome), ekdum
(totally), mast (great), bindaas (chill), boss/bhidu/dost (buddy), scene set
hai (all sorted), tension nahi lene ka (don't worry), locha/locha hai
(problem), apun (me), full to (totally), banta hai (it works out), nikaal
(pull it out).

---

## 5. Visual design direction

- **Mobile-first, always.** Most Indian users are on mid-range Android phones.
  Design 360–390px width first, then scale up. Big tap targets (min 48px).
- **Fast + light** feel — generous white space, no heavy gradients that hurt on
  slow connections.
- **Energy + trust** — the brand is friendly and street-smart, but it handles
  careers, so it must also feel *credible*. Balance playful copy with clean,
  trustworthy layout.

### Color palette
Pull a warm, energetic Indian-street feel without going garish:

- **Primary (action):** Indigo/violet `#4f46e5` (already in code) — trust + tech
- **Accent (energy / "jhakaas"):** Mumbai-taxi inspired — a warm **amber/gold
  `#F59E0B`** and a vivid **kesar/saffron-orange `#FB923C`** for celebratory moments
- **Success:** green `#16a34a` (good score)
- **Warning:** amber `#f59e0b` (mid score)
- **Danger:** red `#ef4444` (low score / missing)
- **Neutrals:** slate greys `#0f172a → #f8fafc`
- Optional: a subtle **kolam / Warli-art line motif** as a background texture
  watermark for that local-craft touch (keep it 5–8% opacity, never busy).

### Typography
- Headlines: a friendly, rounded, modern sans (e.g. **Poppins** / **Sora**) —
  approachable + confident.
- Body: a highly legible sans (**Inter**) — Hinglish reads cleanly.
- Support **Devanagari glyphs** in the font stack in case you localise deeper later.

### Imagery / illustration
- Friendly flat illustrations of a diverse young Indian working crowd
  (auto-rickshaw, local train, chai-tapri energy) — aspirational but relatable.
- A small mascot is optional but on-brand: a confident, smiling Mumbai
  "bhidu" character giving a thumbs-up (ties the "Lelo" family together).

---

## 6. Screens to design (each with all states)

Design these screens. For every screen, give **mobile + desktop**, and show the
**empty / loading / success / error** states where relevant.

### Screen 1 — Landing / Hero
- Logo "ResumeLelo", nav (How it works, Pricing, Login).
- Big Hinglish headline + English subline (see microcopy table).
- A single prominent **"Score nikaal — free!"** CTA.
- Trust strip: "10,000+ resumes scored", "Made in Mumbai", "Your data stays private".
- Mini 3-step explainer: Upload → Score → AI Fix.

### Screen 2 — The Scorer (core workflow, single page)
This is the heart. Two input cards + a button + results.
1. **Card A: Resume** — drag/drop upload zone ("Apna resume idhar daal 📄") +
   "ya paste karo" textarea toggle.
2. **Card B: Job description** — large textarea ("JD yahan paste maar").
3. **Primary button:** "Score nikaal!"
4. **Results panel** (appears after scoring):
   - Big circular **score gauge /100**, colour-coded, with the Hinglish reaction
     line above it (jhakaas / banta hai / locha hai).
   - Two columns of keyword chips: **missing** (red) and **matched** (green).
   - Format tips callout (amber).
   - **AI improve CTA** ("AI se sahi karwa lelo ✨") — show a small "Pro" tag.

### Screen 3 — AI-Tailored Result
- Before → After score (animated count-up is a nice touch).
- "What changed" bullet list (friendly: "Yeh sudhaara…").
- The rewritten resume in a clean preview.
- Two download buttons: **PDF** and **Word**.
- Soft re-score badge confirming improvement.

### Screen 4 — Pricing / Upgrade
- Two plans, side by side:
  - **Free (Bindaas)** — unlimited scoring, format tips. ₹0.
  - **Pro (Jhakaas)** — unlimited AI tailoring + PDF/Word export + history.
    Price in **₹/month** (e.g. ₹199/mo or ₹999/yr — owner to confirm).
- Clear "what you get" checklist per plan. UPI / cards as payment hint
  (Razorpay/Stripe). Local trust: "Cancel kabhi bhi. No tension."

### Screen 5 — Auth (Login / Signup)
- Email + Google sign-in (Supabase Auth).
- Warm copy: "Wapas aa gaya, boss! 👋" / "Naya hai? 30 second mein account bana."
- Minimal, single-card, mobile-friendly.

### Screen 6 — Dashboard / History (Pro)
- List of past scored resumes + JDs with their scores and dates.
- Re-open, re-score, re-download. Friendly empty state:
  "Abhi tak kuch nahi. Pehla resume score kar lelo!"

### Also design these small but important bits
- **Upgrade-limit modal** ("Free limit khatam, bhidu!") — appears when a free
  user hits a Pro action.
- **Score gauge component** in all three colour zones.
- **Keyword chip** component (matched vs missing).
- **Loading states** with the Hinglish loaders.
- **Toast / error** styles.

---

## 7. UX principles (non-negotiable)

1. **The free score must be instant and frictionless** — no login wall before
   the first score. Let them feel the value, *then* ask to sign up for AI/export.
2. **Never shame a low score** — always pair it with a fix path ("chal theek
   karte hai").
3. **Output stays professional** — the downloadable resume has zero slang.
4. **Mobile-first, thumb-friendly, fast.**
5. **Trust signals everywhere** — careers are emotional; show privacy + "made in
   Mumbai" + real numbers.
6. **Accessibility** — colour is never the only signal (pair score colour with
   the words + number); good contrast; readable Hinglish.

---

## 8. Deliverables to ask Claude for

- High-fidelity mockups for Screens 1–6 (mobile + desktop).
- The small components (score gauge, chips, modal, loaders).
- A one-page **style tile**: logo lockup, colour swatches, type scale, button
  styles, chip styles.
- All copy in the mockups should use the Hinglish microcopy above.

---

*Brand family note for the designer: this joins **LiftLelo** (carpooling) and
**NaukriLelo**. Keep the "Lelo" house feel — friendly, action-led, desi,
trustworthy — so the three feel like siblings.*
