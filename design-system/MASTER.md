# Design System - Gerador de Orçamentos

## Overview
Professional SaaS dashboard for budget generation with dark mode support.

## Design Principles
1. **Accessibility First**: Minimum 4.5:1 contrast ratio, visible focus states
2. **Consistent Spacing**: 4, 8, 12, 16, 24, 32, 48px scale
3. **Smooth Transitions**: 150-300ms for micro-interactions
4. **No Emoji Icons**: Use SVG icons (Lucide) exclusively
5. **Cursor Pointer**: All clickable elements have `cursor-pointer`

## Color Palette

### Primary Colors
- Primary: `hsl(222.2, 47.4%, 11.2%)` - Dark slate (slate-950)
- Primary Foreground: `hsl(210, 40%, 98%)` - White-ish (slate-50)

### Secondary/Accent Colors
- Accent: `hsl(210, 100%, 50%)` - Blue 500
- Success: `hsl(142, 76%, 36%)` - Green 600
- Warning: `hsl(38, 92%, 50%)` - Amber 500
- Danger: `hsl(0, 84%, 60%)` - Red 500

### Neutral Colors (Light Mode)
- Background: `hsl(0, 0%, 100%)` - White
- Surface: `hsl(210, 40%, 98%)` - Slate 50
- Border: `hsl(214, 32%, 91%)` - Slate 200
- Text Primary: `hsl(222.2, 47.4%, 11.2%)` - Slate 900
- Text Secondary: `hsl(215, 16%, 47%)` - Slate 600

### Neutral Colors (Dark Mode)
- Background: `hsl(222.2, 47.4%, 3.9%)` - Slate 950
- Surface: `hsl(217.2, 32.6%, 17.5%)` - Slate 900
- Border: `hsl(217.2, 32.6%, 25%)` - Slate 800
- Text Primary: `hsl(210, 40%, 98%)` - Slate 50
- Text Secondary: `hsl(215, 20%, 65%)` - Slate 400

## Typography

### Font Family
- **Primary**: Inter (Google Fonts)
- **Monospace**: JetBrains Mono (for numbers/code)

### Type Scale
- **H1**: 32px / 40px line-height / 700 weight
- **H2**: 24px / 32px line-height / 600 weight
- **H3**: 20px / 28px line-height / 600 weight
- **H4**: 18px / 24px line-height / 600 weight
- **Body Large**: 16px / 24px line-height / 400 weight
- **Body**: 14px / 20px line-height / 400 weight
- **Small**: 12px / 16px line-height / 400 weight

## Spacing Scale
- 4px: `gap-1`, `p-1`
- 8px: `gap-2`, `p-2`
- 12px: `gap-3`, `p-3`
- 16px: `gap-4`, `p-4`
- 24px: `gap-6`, `p-6`
- 32px: `gap-8`, `p-8`
- 48px: `gap-12`, `p-12`

## Border Radius
- sm: `rounded-md` - 6px
- md: `rounded-lg` - 8px
- lg: `rounded-xl` - 12px
- full: `rounded-full` - 9999px

## Shadows
- sm: `shadow-sm` - Subtle elevation
- md: `shadow-md` - Medium elevation
- lg: `shadow-lg` - High elevation
- xl: `shadow-xl` - Modal/dropdown elevation

## Components

### Buttons
- Base: `h-9 px-3 text-sm font-medium rounded-lg`
- Primary: `bg-primary hover:bg-primary/90 text-primary-foreground`
- Secondary: `bg-gray-600 hover:bg-gray-700 text-white`
- Success: `bg-emerald-600 hover:bg-emerald-700 text-white`
- Danger: `bg-red-600 hover:bg-red-700 text-white`
- Ghost: `hover:bg-accent hover:text-accent-foreground`
- Transition: `transition-all duration-200`
- Touch target: Minimum 44x44px

### Cards
- Base: `bg-card text-card-foreground rounded-lg border shadow-sm`
- Padding: `p-4 md:p-6`
- Border: `border border-gray-200 dark:border-gray-800`
- Shadow: `shadow-sm`

### Tables
- Header: `bg-muted/50 font-medium text-muted-foreground`
- Rows: `border-b` (zebra striping with `even:bg-muted/30`)
- Hover: `hover:bg-muted/50`
- Cell padding: `px-4 py-3`
- Border: `border-border`

### Forms
- Input: `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`
- Label: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70`
- Focus: `ring-2 ring-ring ring-offset-2`

### Modals/Dialogs
- Overlay: `bg-black/50 backdrop-blur-sm`
- Content: `bg-background rounded-lg shadow-lg`
- Animation: `animate-in fade-in slide-in-from-bottom-4`
- Padding: `p-6`

### Sidebar
- Width expanded: `w-72` (288px)
- Width collapsed: `w-20` (80px)
- Background: `bg-background border-r border-border`
- Active item: `bg-primary text-primary-foreground`
- Hover: `hover:bg-accent hover:text-accent-foreground`
- Transition: `transition-all duration-300 ease-in-out`

### Breadcrumb
- Separator: `/` (Slash icon)
- Link: `hover:underline`
- Current: `text-foreground font-medium`

## Layout

### Container
- Max width: `max-w-7xl` (1280px)
- Padding: `px-4 md:px-6`
- Center: `mx-auto`

### Responsive Breakpoints
- Mobile: `375px` - Base styles
- Tablet: `768px` - `md:` prefix
- Desktop: `1024px` - `lg:` prefix
- Wide: `1440px` - `xl:` prefix

## States

### Loading
- Skeleton: `animate-pulse bg-muted`
- Spinner: `<Loader2 className="h-4 w-4 animate-spin" />`
- Button loading: `disabled` + spinner

### Empty
- Icon: `text-muted-foreground h-12 w-12`
- Text: `text-muted-foreground text-sm`

### Error
- Background: `bg-destructive/10`
- Text: `text-destructive`
- Icon: `<AlertCircle className="h-4 w-4" />`

## Accessibility

### Focus States
- Visible: `ring-2 ring-ring ring-offset-2`
- Skip to content: `sr-only focus:not-sr-only`

### ARIA
- Icon buttons: `aria-label`
- Dialogs: `role="dialog"`
- Live regions: `aria-live="polite"`

### Keyboard
- Tab order: Logical visual order
- Escape: Close modals
- Enter/Space: Activate buttons

## Animation

### Duration
- Fast: `150ms` - Micro-interactions
- Normal: `200ms` - Hover states
- Slow: `300ms` - Layout changes

### Easing
- Default: `ease-in-out`
- Enter: `ease-out`
- Exit: `ease-in`

### Properties
- Use: `opacity`, `transform`, `filter`
- Avoid: `width`, `height`, `left`, `top`

## Dark Mode

### Toggle
- Uses `next-themes` provider
- System preference detection
- Manual override available

### Adjustments
- Reduce opacity in light mode for glass effects
- Increase border visibility in dark mode
- Adjust shadows for dark backgrounds
