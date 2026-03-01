# AI News - Project Notes

## UI Style

The UI follows **Apple Liquid Glass** design language:

- **Glassmorphism**: Semi-transparent backgrounds with `backdrop-filter: blur()` effects
- **CSS Variables**: `--glass-bg`, `--glass-bg-heavy`, `--glass-blur`, `--glass-blur-heavy`, `--glass-border`, `--glass-shadow`, `--glass-shadow-elevated`, `--glass-radius`, `--glass-radius-sm`, `--glass-radius-xs`
- **Color Palette**: Apple-inspired system colors (`#007aff` accent, `#f2f2f7` background in light mode, `#000000` in dark mode)
- **Typography**: SF Pro font stack (`-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text'`)
- **Borders**: Subtle `rgba` borders that feel translucent
- **Shadows**: Layered soft shadows for elevation
- **Border Radius**: Rounded corners with `16px`, `12px`, `8px` tiers
- **Dark Mode**: Automatic via `prefers-color-scheme`, with matching glass tints

## Architecture

- Vue 3 + TypeScript + Vite
- Responsive: desktop (3-column), mobile (<=768px, full-width with bottom nav bar)
- Mobile article navigation uses fixed bottom buttons (not swipe/overscroll)
- Read status tracked via localStorage with URL hashing
