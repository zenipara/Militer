# Responsive CSS Utilities Guide

## Overview
Comprehensive responsive CSS utilities added to `src/index.css` for mobile-first design with consistent touch targets and adaptive layouts across all screen sizes.

## 🎯 Key Principles
- **Mobile-first**: Design for 390px (mobile) → scale up to 1280px+ (desktop)
- **Touch-friendly**: All interactive elements ≥ 44px (44pt diameter)
- **Accessible**: WCAG 2.5.5 compliant minimum touch target sizes
- **Consistent**: Unified spacing, padding, and grid systems

## 📐 Breakpoints
```
Mobile:       < 640px
Small (sm):   640px - 767px
Tablet (md):  768px - 1023px  
Desktop (lg): 1024px - 1279px
Large (xl):   ≥ 1280px
```

## 🔧 Utility Classes

### 1. Touch-Friendly Sizing
For buttons, links, form controls - ensures minimum 44px touch targets on mobile.

**Usage:**
```tsx
// Button with touch-friendly sizing
<button className="btn touch-target-sm">
  Click me
</button>

// Form input with responsive height
<input className="form-control form-input-responsive" />

// Link with touch padding
<a href="#" className="link-responsive">
  Open profile
</a>
```

**Available classes:**
- `.touch-target-sm`: 44px × 44px (standard touch target)
- `.touch-target-md`: 48px × 48px (comfortable)
- `.touch-target-lg`: 52px × 52px (generous)
- `.touch-spacing`: 0.5rem margin between interactive elements

---

### 2. Responsive Button Heights
Automatically adjusts height based on screen size.

**Usage:**
```tsx
<button className="btn btn-responsive">
  Save Changes
</button>
```

**Behavior:**
- Mobile (< 768px): 44px height + 1rem font size
- Tablet+ (≥ 768px): 40px height + 0.875rem font size

---

### 3. Form Grid Layouts (Mobile-first)
Stack form inputs vertically on mobile, horizontally on larger screens.

**Usage - 3 column:**
```tsx
<div className="form-grid-responsive gap-4">
  <input placeholder="Field 1" className="form-control" />
  <input placeholder="Field 2" className="form-control" />
  <input placeholder="Field 3" className="form-control" />
</div>
```

**Usage - 2 column:**
```tsx
<div className="form-grid-2col">
  <input placeholder="First Name" className="form-control" />
  <input placeholder="Last Name" className="form-control" />
</div>
```

**Behavior:**
- Mobile (< 640px): 1 column (full width)
- Tablet (640px - 1023px): 2 columns
- Desktop (≥ 1024px): 3 columns (or 2 for form-grid-2col)

**Real example in UserManagement:**
```tsx
<div className="form-grid-responsive">
  <input type="text" placeholder="Cari nama atau NRP..." className="form-control" />
  <select className="form-control">
    <option>Semua Role</option>
    {/* roles */}
  </select>
  <select className="form-control">
    <option>Semua Status</option>
  </select>
</div>
```

---

### 4. Responsive Padding
Automatically scales padding/margins based on screen size.

**Usage:**
```tsx
// For cards/panels
<div className="app-card card-padding-responsive">
  Content with responsive padding
</div>

// For sections
<section className="section-padding-responsive">
  Section with adaptive padding
</section>
```

**Behavior:**
- Mobile: 1rem (16px)
- Tablet: 1.25rem (20px)
- Tablet+: 1.5rem (24px)
- Desktop: 1.75rem (28px)

---

### 5. Responsive Gap System
For flex/grid containers, adjusts gap between items.

**Usage:**
```tsx
// Small gap that scales
<div className="flex gap-responsive-sm">
  <item>Small gap</item>
</div>

// Medium gap
<div className="grid gap-responsive-md">
  <item>Medium gap</item>
</div>

// Large gap
<div className="flex flex-col gap-responsive-lg">
  <item>Large gap</item>
</div>
```

**Behavior:**
- `gap-responsive-sm`: 0.5rem → 0.75rem → 1rem
- `gap-responsive-md`: 0.75rem → 1rem → 1.25rem
- `gap-responsive-lg`: 1rem → 1.25rem → 1.5rem

---

### 6. Flex Stacking (Column → Row)
Stack items vertically on mobile, horizontally on tablet+.

**Usage:**
```tsx
// Simple horizontal stack
<div className="flex-responsive">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Centered items
<div className="flex-responsive--align-center">
  <span>Icon</span>
  <span>Text</span>
</div>
```

**Behavior:**
- Mobile: Column layout (flex-col)
- Tablet+ (≥ 768px): Row layout (flex-row)

---

### 7. Grid Cards Layout
Responsive grid for card layouts across all breakpoints.

**Usage:**
```tsx
<div className="grid-cards-responsive">
  <div className="app-card">Card 1</div>
  <div className="app-card">Card 2</div>
  <div className="app-card">Card 3</div>
</div>
```

**Behavior:**
- Mobile: 1 column
- Small (sm): 2 columns
- Desktop (lg): 3 columns
- Large (xl): 4 columns

---

### 8. Overlay/Modal Responsive
Adapts modal layout for mobile (bottom sheet) vs desktop (centered dialog).

**Usage:**
```tsx
<div className="overlay-responsive">
  <div className="overlay-content-responsive">
    Modal content
  </div>
</div>
```

**Behavior:**
- Mobile: Fixed overlay, bottom-sheet appearance (slide-up animation)
- Desktop: Absolute centered dialog (scale-in animation)

---

### 9. Typography Scaling
Automatically scales text sizes for readability.

**Usage:**
```tsx
<h2 className="text-responsive-lg">Heading</h2>
<p className="text-responsive-md">Body text</p>
```

**Behavior:**
- Large: 1rem → 1.125rem → 1.25rem
- Medium: 0.875rem → 1rem

---

### 10. Container Margins
Adaptive side margins for full-width sections.

**Usage:**
```tsx
<section className="container-margin-responsive">
  Centered content with responsive margins
</section>
```

**Behavior:**
- Mobile: 1rem (16px) side margin
- Tablet: 1.5rem (24px) side margin
- Desktop: 2rem (32px) side margin

---

## 🎨 Common Patterns

### Pattern 1: Search/Filter Form
```tsx
<div className="app-card p-4">
  <div className="form-grid-responsive">
    <div>
      <label>Search</label>
      <input 
        type="text" 
        placeholder="Cari..." 
        className="form-control form-input-responsive w-full" 
      />
    </div>
    <select className="form-control form-input-responsive">
      <option>Filter 1</option>
    </select>
    <select className="form-control form-input-responsive">
      <option>Filter 2</option>
    </select>
  </div>
</div>
```

### Pattern 2: Statistics Cards
```tsx
<div className="grid-cards-responsive">
  <div className="card-primary card-padding-responsive">
    <h3>Stat 1</h3>
    <p className="text-2xl">123</p>
  </div>
  <div className="card-primary card-padding-responsive">
    <h3>Stat 2</h3>
    <p className="text-2xl">456</p>
  </div>
</div>
```

### Pattern 3: Action Buttons
```tsx
<div className="flex-responsive gap-responsive-md">
  <button className="btn btn-responsive">Create New</button>
  <button className="btn btn-secondary btn-responsive">Cancel</button>
</div>
```

### Pattern 4: Touch-Friendly Navigation
```tsx
<nav className="flex flex-col gap-responsive-sm">
  <a href="#" className="link-responsive">Home</a>
  <a href="#" className="link-responsive">Profile</a>
  <a href="#" className="link-responsive">Settings</a>
</nav>
```

---

## 📋 Migration Checklist

- [ ] Apply `.form-grid-responsive` to UserManagement search/filter
- [ ] Apply `.form-grid-responsive` to GatePassMonitorPage filters
- [ ] Apply `.form-grid-2col` to AuditLog search row
- [ ] Apply `.grid-cards-responsive` to stat cards
- [ ] Apply `.card-padding-responsive` to dashboard cards
- [ ] Apply `.btn-responsive` to primary action buttons
- [ ] Apply `.touch-target-sm` to icon buttons
- [ ] Apply `.link-responsive` to navigation links
- [ ] Test responsive behavior at 390px, 768px, 1280px viewports
- [ ] Run E2E tests on mobile/tablet/desktop breakpoints

---

## 🧪 Testing Guidelines

### Mobile (390px)
- Touch targets visible and easy to tap (44px minimum)
- Forms stack in single column
- Text readable without zoom
- Modal appears as bottom sheet

### Tablet (768px)
- Forms display with 2 columns
- Cards 2-3 per row
- Compact padding (1.25rem)
- Modal remains bottom sheet

### Desktop (1024px+)
- Full responsive layout active
- 3-4 cards per row
- Generous padding (1.75rem)
- Modal displays as centered dialog

---

## 🚀 Performance Notes
- All responsive utilities use CSS media queries (no JavaScript overhead)
- Utilities compose well with Tailwind classes
- Minimal CSS size increase (~5KB gzipped)
- Zero runtime performance impact

---

## ✨ Best Practices

1. **Always start with mobile-first**: Design for 390px, then enhance for larger screens
2. **Use utilities for consistency**: Prefer `.form-grid-responsive` over custom breakpoints
3. **Combine utilities**: Stack `.card-padding-responsive` with `.gap-responsive-md`
4. **Test at breakpoints**: Verify layout at sm/md/lg/xl breakpoints
5. **Maintain touch targets**: Ensure interactive elements ≥ 44px everywhere
6. **Validate accessibility**: Use browser DevTools mobile emulation

---

## 🔗 Related Files
- CSS Source: [src/index.css](src/index.css) (Lines 1905-2212)
- Responsive Enhancement: [form-control--responsive mixin](src/index.css#L2343)
- Dashboard Examples: AdminDashboard, UserManagement, GatePassMonitorPage

---

Last updated: 2025-04-26
Version: v1.0
