

# UI Improvements & Animations Plan

## Overview
Enhance all three main pages (Calculator, Results, Index) with polished animations, better visual hierarchy, and modern micro-interactions.

## Changes

### 1. Results Page — Card List Animations & Visual Polish
- **Staggered fade-in**: Each card fades in with a slight delay (index * 100ms) using CSS animation
- **Hover lift effect**: Cards translate up slightly on hover with a smooth shadow increase
- **Best Pick card**: Add a subtle gradient border glow/pulse on the top card
- **Savings number**: Animate the net saving value with a count-up effect using a small hook
- **Apply Now button**: Add a shimmer/glow animation on hover
- **Loading state**: Replace plain spinner with a skeleton card placeholder (3 skeleton cards)
- **Header**: Add a gradient accent line under the header

### 2. Calculator Page — Input Experience
- **Form card**: Add a subtle entrance animation (slide up + fade)
- **Quick spend chips**: Add a press/ripple animation and subtle scale bounce on tap
- **Input focus**: Glowing ring animation on focus state for fuel spend input
- **Loading overlay**: Improve with a progress bar animation instead of just bouncing dots
- **Section transitions**: Stagger the form sections appearing

### 3. Index/Home Page — Polish
- **Bento grid items**: Add staggered scale-in animation on mount
- **Banner card**: Subtle parallax-like entrance
- **Bottom sheet**: Smooth slide-up entrance animation

### 4. Shared CSS Additions (index.css)
Add new keyframes and utility classes:
- `animate-slide-up` — translateY(20px) → 0 with fade
- `animate-card-hover` — translateY(-4px) with shadow boost
- `animate-glow-pulse` — subtle border glow pulse for best pick card
- `animate-skeleton` — skeleton shimmer for loading state
- `animate-count-up` — for number reveals
- Stagger utility: `.stagger-delay-{n}` classes for sequential animations

### 5. Skeleton Loading Component
Create a `CardSkeleton` component that mimics the card layout with animated shimmer placeholders, shown 3x during loading.

## Files to Edit
- `src/index.css` — New keyframes and animation utilities
- `src/pages/Results.tsx` — Card animations, skeleton loading, hover effects, count-up savings
- `src/pages/Calculator.tsx` — Form entrance animations, improved loading state
- `src/pages/Index.tsx` — Staggered bento grid entrance
- `src/components/FuelFilters.tsx` — Minor transition polish

## Technical Details
- All animations use CSS keyframes + Tailwind classes (no extra libraries needed)
- Staggered delays via inline `style={{ animationDelay }}` 
- Hover effects via Tailwind `hover:` and `transition-all`
- Skeleton uses the existing shimmer keyframe from index.css

