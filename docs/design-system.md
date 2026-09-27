# Merch Tent design system

This document records the visual and interaction rules already used by the public shop, artist dashboard and Backstage. It is a working contract for new UI, not a mandate to redesign stable screens.

## Audience by surface

| Surface | Primary audience | Primary job |
| --- | --- | --- |
| Homepage, category and product pages | Fans | Discover, trust and buy official artist merchandise |
| `/start`, artist sign-up and artist dashboard | Artists | Evaluate the model, create products and operate a drop |
| Backstage | Merch Tent operators | Review, fulfil and administer the marketplace |

Secondary audience links are welcome, but should not compete with the primary action above the fold.

## Core tokens

The canonical CSS variables live in `src/app/globals.css`.

- `--mt-ink`: principal black surface
- `--mt-paper`: warm light retail surface
- `--mt-lime`: primary action and positive status
- `--mt-red`: live-scene accent, urgency and destructive emphasis
- `--mt-border-dark` and `--mt-border-light`: structural dividers
- `--mt-muted-dark` and `--mt-muted-light`: secondary copy

Use red and lime deliberately. Neither should become a full-page monochrome theme.

## Type

- Page heroes may use the condensed display voice and large uppercase headlines.
- Product cards, panels and dashboards use compact headings with normal letter spacing.
- Labels are short, uppercase and secondary to the value they describe.
- Operational interfaces use `.operational-surface` to keep typography dense and predictable.

## Spacing and layout

- Base spacing steps: 4, 8, 12, 16, 20, 24, 32 and 40 pixels.
- Public sections are full-width bands with constrained inner content.
- Cards are reserved for individual repeated entities, not whole page sections.
- Product media always has an explicit aspect ratio.
- Loading placeholders must reserve the same image, text and action space as loaded content.

## Component states

Every interactive component should account for:

1. Default, hover and keyboard-focus states.
2. Loading without changing dimensions.
3. Empty state with a useful next action.
4. Error state written for the current audience.
5. Disabled state with a discoverable reason where necessary.

Skeletons use structural blocks rather than repeated loading copy. Motion must respect `prefers-reduced-motion`.

## Status language

- Lime: ready, live, successful or selected.
- Amber: waiting for review or user action.
- Red: destructive action, failed state or urgent exception.
- Neutral: draft, unavailable or informational.

Status must always include text; colour is supporting information only.

## Trust claims

Customer-facing production, delivery, review and replacement wording comes from `src/lib/trust-evidence.ts`. Do not add earnings examples, reviews, delivery guarantees or case-study results without a traceable source and permission to publish them.
