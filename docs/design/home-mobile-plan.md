# Home & Mascot Experience Plan (2025-11-08)

Inspired by Duolingo's playful mascot-first UX, we will keep iterating on three pillars.

1. **Hero “Tutor Eagle” Hub**
   - Animated mascot leads the first fold, giving rotating hints (3–5s cadence) about daily goals.
   - CTA buttons stay within thumb reach on mobile (stacked, 16px radius, 56px height).
   - Background gradients shift subtly per time of day (follow-up task, needs `prefers-color-scheme`).

2. **Progress & Tasks Strip**
   - Stats cards condense to a swipeable carousel under 640px (planned via horizontal scroll + snap).
   - Each block gets a tiny EagleGuide chip (“🦅 복습부터!”) to reinforce the mascot persona.
   - Quick actions adopt icon badges + press feedback for tap confidence.

3. **Guided Rituals (Review Queue, Vocabulary, Mock Exam)**
   - Review section keeps encouraging copy + shimmering progress meter.
   - Upcoming work: embed micro-confetti when 복습 완료, and show eagle “glide” animation when queue is empty.

**Implementation Notes**
- New `eagleHints` array + timed rotation already live; extend with per-user context once API exposes streak data.
- Mobile styles sit beside desktop styles in `HomePage.js` for now; migrate to CSS modules or styled-components if complexity grows.
- Bronze/Silver/Gold icons now 🐢/🛡️/✨ style (bronze purposely “low tier”).

Next design iteration will focus on making stat cards horizontally scrollable on mobile and adding “streak flame” similar to Duolingo’s daily streak.
