# Resume Builder Competitor Analysis & Design Gap Analysis

## 1. Competitor Deep-Dive

### Novoresume

**Font choice / hierarchy**
- Primary: Merriweather (serif) for name; Open Sans (sans-serif) for body
- 4-tier scale: Name (~28pt bold) → Section title (~11pt uppercase, tracked) → Role title (~10pt semi-bold) → Body (~9pt regular)
- Tight but readable leading (~1.3)

**Skills display**
- Filled dot rows: ●●●●○ (5-dot proficiency scale)
- Dots rendered in accent color; empty dots in light grey
- Skills grouped by category in left sidebar

**Contact row**
- Icon + label inline pairs (phone, email, LinkedIn, location)
- Uses custom SVG icons, not emoji or Unicode
- All on a single row below name, separated by thin vertical pipes

**Accent color usage**
- Single accent (user-chosen) on: section titles, dot fills, thin left-rule on each section, divider line under name
- Body text stays dark slate; accent never appears on body copy

**Premium feel**
- Generous whitespace — sidebar breathing room, section padding ~8pt
- Two-column split: left sidebar 32% (contact, skills, education), right main 68% (summary, experience)
- Consistent left-edge alignment within each column

**ATS safety**
- Two-column layout uses textbox columns, not tables — passes most parsers
- No header/footer regions; all content in body
- Section headings use plain uppercase text, no icons inside headings

---

### Resume.io

**Font choice / hierarchy**
- Primary font pairing: Lato + Lato (mono-font, weight-differentiated)
- Name: 24–28pt bold; Section title: 9pt uppercase all-caps, wide letter-spacing (0.12em)
- Role title: 11pt semi-bold; Body: 9–10pt regular

**Skills display**
- Thin horizontal bar (progress bar style), ~8pt tall, rounded ends
- Fill in accent color (indigo default); background in light grey
- Label + bar on same line; no numeric percentage shown

**Contact row**
- Small pictograms (inline SVG, not emoji) before each item
- Items flow left-to-right in a tight single row; font 8.5pt
- Row separated from name by 4pt gap and a full-width hairline rule

**Accent color usage**
- Accent on: section-title uppercase text, bar fills, the colored side rule/border on two-column variant, link underlines
- Name and headings also colored with accent on some templates

**Premium feel**
- Very tight grid — 4pt base unit throughout
- Photo slot in top-left of two-column templates (circular crop, 60×60)
- Subtle micro-borders: thin top-rule on each section card

**ATS safety**
- Single-column templates fully ATS-safe
- Two-column templates use CSS columns (flagged by some parsers)
- No tables, no text boxes

---

### Enhancv

**Font choice / hierarchy**
- Headings: Montserrat Bold; Body: Source Sans Pro Regular
- Heavy weight contrast: name at 32pt bold, section titles at 8pt caps, role at 11pt semi-bold
- Deliberate visual hierarchy via weight alone (no size jump between role and body)

**Skills display**
- Three modes: star rating (★★★☆☆), percentage bar, or plain tag chips
- Stars rendered inline with Unicode in some exports
- Chips: rounded rectangles, accent fill, white text, 8pt

**Contact row**
- Each item on its own line in the left sidebar (no single-row layout)
- Tiny icon (Font Awesome subset) left of label; label in 8pt regular

**Accent color usage**
- Accent saturates the entire left sidebar background
- Name and section titles in the sidebar are white on accent
- Right column keeps white background with accent only on section titles
- Bold, high-contrast look; less ATS-neutral than competitors

**Premium feel**
- Sidebar-heavy design with personality section, hobbies, quote field
- Lots of whitespace within sidebar items
- Cover page / linen paper texture option

**ATS safety**
- Sidebar-on-colored-background templates can confuse parsers that expect left-to-right reading order
- Single-column "Functional" template is fully safe
- Recommends ATS-safe template explicitly in UI

---

### Zety

**Font choice / hierarchy**
- Lato across all weights; some templates use Roboto
- Name: 26pt bold; Section title: 10pt uppercase with colored underline rule; Role: 11pt semi-bold; Body: 9.5pt
- Line height: 1.4 — slightly more generous than competitors

**Skills display**
- Filled circle dots (●) in a row of 5; default 4 shown
- Alternative: plain text list with no rating
- Sidebar placement; skills label in 8pt uppercase

**Contact row**
- Single horizontal row; each item preceded by a small colored circle or line icon
- 8pt regular; email and phone clickable in PDF
- Separated from name by thin accent-colored rule

**Accent color usage**
- Accent on: left border rule on section cards, dot fills, divider lines, hyperlinks
- More restrained than Enhancv — never floods a sidebar background

**Premium feel**
- "Content analyzer" feedback inline in editor
- Template gallery has 20+ options including photo and no-photo variants
- Consistent 4pt grid; very tight spacing in compact templates

**ATS safety**
- All Zety templates pass standard ATS parsers per their docs
- Section labels use plain text; no graphics inside text flow
- Table-free layout

---

### Kickresume

**Font choice / hierarchy**
- Font varies per template: Merriweather, Playfair Display, Nunito Sans
- Larger name sizes (up to 36pt) on designer templates
- Some templates use thin/light weight for name (30pt light) for elegant look

**Skills display**
- Bubble chips (pill shape) in accent color — the default
- Optional: 5-bar proficiency column chart
- Language skills: flag emoji + bar (unique to Kickresume)

**Contact row**
- Inline icons (SVG) for phone, email, location, LinkedIn
- Some templates put contact details in the right-aligned header column
- Icon + text pairs, 8pt

**Accent color usage**
- Wide range: some templates use two accent colors (primary + secondary)
- Accent on section titles, chip fills, photo border/ring, divider lines
- "Prague" template: full-bleed dark header with white name — very visual

**Premium feel**
- Most visually diverse builder — truly designer-grade templates
- Photo slot prominently featured across ~60% of templates
- Cover letter matched styles (resume + CL pair)

**ATS safety**
- Designer templates (full-bleed headers, two-column) rated "not ATS safe" in UI
- ATS-safe templates explicitly labeled
- Photo-included templates not recommended for ATS

---

### VisualCV

**Font choice / hierarchy**
- Font varies: Helvetica Neue, Avenir, Georgia depending on template
- Name: 24–30pt; Section: 9pt caps; Role: 10.5pt semi-bold; Body: 9pt
- Templates lean toward editorial/portfolio aesthetics

**Skills display**
- Circular proficiency rings (CSS circle charts in web view, flattened in PDF)
- Alternative: plain text tags or bar
- Ring fill in accent color; label below ring in 7pt

**Contact row**
- Header-band approach: full-width colored band at top with name + contact in white text
- Single row in the band; icon glyphs (subset of Material Icons)

**Accent color usage**
- Accent fills the entire header band
- Section titles in accent; rest of page is white/light-grey
- Strong brand feeling; less flexible for personal customization

**Premium feel**
- Best hosting: resume lives at a URL, shareable as a microsite
- Analytics: view count, recruiter location (premium)
- PDF export quality is high

**ATS safety**
- Header band (image-based in some exports) can trip parsers
- "Classic" templates are safe; visual portfolio templates are not

---

## 2. Gap Analysis Table

| Design Element | Best-in-class | MazaCV current | Gap |
|---|---|---|---|
| Font hierarchy | 4-level scale, paired typefaces (Novoresume, Zety) | Single weight/size differentiation; system font | Large — no custom font embedding; no size/weight scale |
| Skill proficiency | 5-dot ●●●●○ (Novoresume, Zety) or bar (Resume.io) | No visual proficiency display; plain text list | Large — no dots, bars, or chips |
| Contact row | Icon + text single row, hairline rule below (Resume.io, Zety) | Plain text, no icons, no structured row | Medium — no icons, inconsistent spacing |
| Accent color usage | Accent on titles, borders, dots, links (all builders) | Accent only on some section titles in some templates | Medium — accent not propagated through dots, rules, links |
| Photo slot | Optional circular/square crop (Kickresume, VisualCV, Enhancv) | Not supported | Medium — missing for users who need it (EU/APAC markets) |
| Whitespace / grid | 4pt base grid, generous padding (Zety, Novoresume) | Inconsistent — some templates tight, some loose | Medium — no explicit spacing system |
| Typography scale | Name/section/role/body 4 tiers clearly distinct | Effectively 2 tiers (heading vs body) | Large — collapses role-title and body into one level |
| ATS safety | Single-column templates explicitly labeled safe | All templates claimed ATS-safe without differentiation | Small — labeling/differentiation needed |
| Cover letter match | Matched CL template (Kickresume) | Cover letter text only; no styled PDF | Medium — CL export uses same resume template styling |

---

## 3. Recommended Improvements (Future Sprint)

### 1. Custom font embedding in react-pdf (Poppins / Inter TTF)

Load `Poppins-Bold.ttf`, `Poppins-SemiBold.ttf`, `Inter-Regular.ttf`, `Inter-Medium.ttf` from `/public/fonts/`.
Register with `Font.register` in `src/lib/export.tsx` and apply across all templates.
Poppins for display (name, section titles), Inter for body copy.

### 2. 4-level typography scale (name / section-title / role-title / body)

Define a strict scale in a shared `typography.ts` constant:
- `name`: 26pt Poppins Bold
- `sectionTitle`: 9pt Poppins SemiBold, uppercase, letter-spacing 0.1em
- `roleTitle`: 11pt Poppins SemiBold
- `body`: 9.5pt Inter Regular, line-height 1.4

Apply to every template; remove ad-hoc `fontSize` overrides scattered in template files.

### 3. Skill proficiency dots (●●●○○)

Add an optional `level` field (1–5) to the skills array in `JsonResume`.
Render `●`.repeat(level) + `○`.repeat(5 - level) in the template.
Fallback to plain skill name if no level set.
Accepts Unicode U+25CF (●) and U+25CB (○) — ATS-safe, no SVG needed.

### 4. Proper contact icon row (Unicode symbols, not emoji)

Use Unicode punctuation/symbol characters for a clean contact row:
- Phone: ✆ (U+2706) or ☎ (U+260E)
- Email: ✉ (U+2709)
- Location: ⌖ (U+2316) or plain text "•"
- LinkedIn: plain text prefix "in/"

Render as a single `<View style={{ flexDirection: "row", gap: 12 }}>` with `<Text>` pairs.
Avoids emoji rendering issues in PDFs and is parsed by all ATS.

### 5. Photo slot option

Add `photoUrl?: string` to `JsonResume.basics`.
In templates that support it (SplitTemplate, ModernTemplate), render a `<Image>` in top-left corner: 60×60, `borderRadius: 30`.
Gate photo display on `parsedResume.basics.photoUrl` presence.
Label photo-enabled templates "Not ATS-safe" in the template picker.

### 6. 4pt spacing grid / generous whitespace

Introduce a `spacing` constant object:
```ts
export const sp = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
```
Replace all magic number `padding`/`margin` values in template files with `sp.*` references.
Target: section padding `sp.md`, list-item gap `sp.xs`, section separator `sp.lg`.

### 7. Accent color used throughout (not just section titles)

Pass `accentColor` to every template element that benefits from it:
- Section title text color
- Thin left border rule on each section card (`borderLeftWidth: 2, borderLeftColor: accentColor`)
- Skill dot fills
- Hyperlink color
- Name text (optional, for bold color-name look)
- Divider line color under header

Store `accentColor` in the `JsonResume` extras or pass as a template prop — already done in export pipeline; just propagate further.
