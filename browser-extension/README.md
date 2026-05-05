# NextRole Chrome Extension

## Load locally
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `browser-extension` folder

## Usage
1. Open a LinkedIn/Indeed/Greenhouse/Lever/Workday job page.
2. Click the extension.
3. Confirm parsed fields.
4. Set `NextRole Base URL` (e.g. `http://localhost:3000` for local dev).
5. Click `Capture + Evaluate`.

The extension sends a payload to `/api/pipeline`:

```json
{
  "job": {
    "title": "...",
    "company": "...",
    "url": "...",
    "description": "...",
    "source": "chrome_extension"
  },
  "steps": ["evaluate", "status_update"]
}
```

You must already be logged into the same NextRole base URL in your browser.
