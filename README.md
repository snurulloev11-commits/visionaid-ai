# EcoScan — AI Environmental Assistant

**Live website:** https://ecoscan-dushanbe.floot.app

EcoScan is an environmental photo-analysis web app. It uses AI to analyze user-supplied images of pollution, explain possible environmental risks, recommend safe responses, and answer follow-up questions. The example case studies are illustrative pilot scenarios, not verified field deployments.

## Source files

This branch contains the **actual application-specific source-code snapshot exported from the owner's Floot workspace on 20 October 2026**: the responsive React/TypeScript interface, CSS styles, environmental-analysis endpoint, AI follow-up endpoint, supporting UI components, and typed API schemas.

The running app is hosted on **Floot**. These files use Floot's project framework and the platform-provided `@floot/ai` and typed endpoint helpers; this export is **not** a standalone npm/Vite project and cannot be redeployed unchanged outside Floot. UI toolkit imports are available in the original Floot project.

## Project structure

- `pages/_index.tsx` — EcoScan interface and analysis workflow.
- `pages/_index.module.css` — responsive application styles.
- `endpoints/analyze_POST.ts` — structured environmental image analysis using Floot AI.
- `endpoints/ask_POST.ts` — follow-up question answering.
- `endpoints/*schema.ts` — endpoint request/response types.
- `components/*` — application UI elements used by the page.
- `base.css` — shared design tokens and global CSS.

## Authorship and competition eligibility

The product was developed with AI-assisted building tools. Publishing these source files does **not** certify that its core structure and logic were personally written without AI. Any competition requiring fully participant-authored core code and structure must be evaluated against its rules before submission. The code is provided transparently as an export of the current EcoScan project, **not** as proof of independent manual authorship.

## Security

Only project code is included here. No private deployment credentials or API keys are included; AI services are configured inside Floot's managed environment.
