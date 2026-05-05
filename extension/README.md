# NextRole Browser Extension

Detects job postings on any website and adds them to your NextRole pipeline in one click.

## Supported sites

| Site | Detection method |
|---|---|
| Any site with structured data | JSON-LD schema.org/JobPosting |
| LinkedIn | DOM selectors |
| Indeed | DOM selectors |
| Glassdoor | DOM selectors |
| Lever | DOM selectors + URL parsing |
| Greenhouse | DOM selectors |
| Ashby | DOM selectors |
| Workday | DOM selectors |
| SmartRecruiters | DOM selectors |
| Workable | DOM selectors |
| Everything else | Heuristic (title + largest content block) |

---

## Setup

### 1. Generate PNG icons

The extension needs `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png`.

Convert `icons/icon.svg` to PNG at those sizes using any of:
- [favicon.io/favicon-converter](https://favicon.io/favicon-converter/)
- Figma / Sketch export
- ImageMagick: `magick icon.svg -resize 128x128 icon128.png`

### 2. Load in Chrome (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder

### 3. Get your API token

1. Open NextRole → **Settings**
2. Scroll to **Browser Extension Token**
3. Click **Generate token** — copy the `nrt_...` token immediately (shown only once)

### 4. Configure the extension

1. Click the NextRole icon in Chrome → gear icon (⚙)  
   Or right-click → **Options**
2. Enter:
   - **NextRole URL**: `https://your-nextrole-app.vercel.app`
   - **Personal Access Token**: paste the `nrt_...` token
3. Click **Save**, then **Test connection**

---

## How it works

```
Job site page
    └─ content.js runs (document_idle)
         ├─ Tries JSON-LD → ATS extractors → heuristic
         └─ Stores result + notifies background (badge "1")

User clicks extension icon
    └─ popup.js asks content.js for extracted data
         ├─ Shows pre-filled form (title, company, URL, description)
         └─ User clicks "Add to Pipeline"
              └─ background/service-worker.js POSTs to /api/extension/job
                   └─ Job appears in NextRole pipeline
```

---

## Files

```
extension/
├─ manifest.json              MV3 manifest
├─ content/
│   └─ content.js             Extraction + messaging (runs on every page)
├─ popup/
│   ├─ popup.html
│   ├─ popup.js
│   └─ popup.css
├─ options/
│   ├─ options.html
│   └─ options.js
├─ background/
│   └─ service-worker.js      Badge updates + API calls
└─ icons/
    ├─ icon.svg               Source icon
    ├─ icon16.png             } Generate from SVG
    ├─ icon48.png             }
    └─ icon128.png            }
```
