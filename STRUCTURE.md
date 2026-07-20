# Project Structure

This document explains the organized file structure of the PILOT Training Tracker project.

## Directory Layout

```
training-tracker/
├── assets/                    # Static assets
│   └── images/               # Images (logo, branding, etc.)
│       ├── logo.png
│       └── White.png
│
├── styles/                    # Shared stylesheets
│   └── shared.css            # Global theme, colors, nav, base styles
│
├── scripts/                   # Shared JavaScript
│   └── shared.js             # Theme toggle, mobile nav, common utilities
│
├── pages/                     # Page-specific files organized by feature
│   │
│   ├── training-tracker/      # Training Tracker module
│   │   ├── styles.css         # Page-specific styles
│   │   └── script.js          # Page-specific functionality
│   │
│   ├── support-panel/         # Support Panel module
│   │   ├── styles.css
│   │   └── script.js
│   │
│   ├── skills-module/         # Skills Module
│   │   ├── styles.css
│   │   └── script.js
│   │
│   ├── index.css              # Landing page styles
│   ├── training-tracker.html
│   ├── support-panel.html
│   └── skills-module.html
│
├── docs/                      # Documentation files
│   ├── PILOT System Training Plan for 1st-Line Support (2 Weeks).md
│   ├── Training Plan for 3 Days_ PILOT Administrative Panel.md
│   └── telfeature.md
│
├── index.html                 # Landing page (stays in root)
├── README.md                  # Project overview
├── STRUCTURE.md               # This file
└── .env                       # Environment configuration
```

## How Files Reference Each Other

### From Root (`index.html`)
```html
<!-- CSS -->
<link rel="stylesheet" href="styles/shared.css">
<link rel="stylesheet" href="pages/index.css">

<!-- JavaScript -->
<script src="scripts/shared.js"></script>

<!-- Navigation Links -->
<a href="pages/training-tracker.html">Training Tracker</a>
<a href="pages/support-panel.html">Support Panel</a>
<a href="pages/skills-module.html">Skills Module</a>
```

### From Pages (`pages/training-tracker.html`, etc.)
```html
<!-- CSS -->
<link rel="stylesheet" href="../styles/shared.css">
<link rel="stylesheet" href="training-tracker/styles.css">

<!-- JavaScript -->
<script src="training-tracker/script.js"></script>
<script src="../scripts/shared.js"></script>

<!-- Navigation Links (back to root) -->
<a href="../index.html">Home</a>
<a href="support-panel.html">Support Panel</a>
```

## Why This Structure

### 1. **Scalability**
- Adding new modules? Just create a new folder in `/pages/`
- Adding new shared assets? Place them in `/assets/` or `/styles/`

### 2. **Maintainability**
- Each page's styles and logic are self-contained and easy to find
- Shared code is clearly separated from page-specific code
- Easy to debug because files are logically grouped

### 3. **Readability**
- File location tells you what it does
- No confusion about which CSS belongs to which page
- Clear distinction between shared and page-specific functionality

### 4. **Performance**
- Shared CSS loads once for all pages
- Page-specific CSS loads only when needed
- Easy to identify and optimize bloated stylesheets

## File Naming Conventions

- **Page folders**: kebab-case (e.g., `training-tracker`, `support-panel`)
- **Page HTML files**: kebab-case (e.g., `training-tracker.html`, `support-panel.html`)
- **CSS files**: Always named `styles.css` within their module folder
- **JS files**: Always named `script.js` within their module folder
- **Shared files**: Generic names in root folders (`shared.css`, `shared.js`)

## Adding a New Page

To add a new page to this project:

1. **Create the page folder** in `/pages/`
   ```
   pages/new-page/
   ├── styles.css
   └── script.js
   ```

2. **Create the HTML file** in `/pages/`
   ```html
   pages/new-page.html
   ```

3. **Link it from the navigation** in the `<nav>` section of all HTML files

4. **Update paths** in your new HTML file:
   ```html
   <link rel="stylesheet" href="../styles/shared.css">
   <link rel="stylesheet" href="new-page/styles.css">
   <script src="new-page/script.js"></script>
   <script src="../scripts/shared.js"></script>
   ```

## Path Reference Quick Guide

| From | To | Path |
|------|---|------|
| `index.html` | `pages/shared.css` | `styles/shared.css` |
| `index.html` | `pages/logo.png` | `assets/images/logo.png` |
| `pages/training-tracker.html` | Root `index.html` | `../index.html` |
| `pages/training-tracker.html` | `scripts/shared.js` | `../scripts/shared.js` |
| `pages/training-tracker.html` | `pages/support-panel.html` | `support-panel.html` |
| Page script | Page styles | `./styles.css` or `training-tracker/styles.css` |

## Common Tasks

### Modify shared styles
Edit: `styles/shared.css`
Affects: All pages

### Modify a page's styles
Edit: `pages/{page-name}/styles.css`
Affects: Only that page

### Add a new image
1. Place in: `assets/images/`
2. Reference: `assets/images/{filename}`

### Update navigation links
Edit: All HTML files in `/pages/` and `index.html`

### Add documentation
Place in: `docs/` folder
(These are not automatically linked, update README.md to reference them)

---

**Last updated:** 2026-07-20
**Refactored for:** Scalability, maintainability, and ease of debugging
