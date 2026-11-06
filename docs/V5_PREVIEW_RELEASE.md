# TODAY FRIDAY V5.0 · preview release

## Approved experience
- One cinematic yacht-at-sunset background with **no embedded interface text**. All typography, 99→50 ₽ discount, CTA, cards, icons, and footer links are HTML/CSS.
- Landing page: “Сегодня пятница?” / “Узнай прямо сейчас и получи ответ за 50 рублей”, crossed-out 99 ₽, red 50 ₽, gold “Узнать сейчас”.
- Compact footer: 100% точность, безопасная оплата, моментальный ответ; legal links at lower right.
- Results: gold “ДА!” or “НЕТ!” in a dark gold-bordered panel. Result is rendered only after server confirms payment.
- Checkout: real per-order HTTPS Tochka payment link, displayed as QR with gold frame on desktop, direct bank link on mobile. **QR encodes the bank payment page, not an SBP payload**; no invented QR.
- Email for electronic receipt; order status polling via backend; 50 ₽ (5000 kopecks) enforced by existing payment configuration.
- Responsive desktop/mobile design. No changes to bank API, Neon schema, payment confirmation, fiscal request, or Production branch.

## Reversibility
- Working V4.1 was preserved before changes in branch `backup/v41-before-v5`.
- V5 currently deploys to the existing branch-scoped Preview `codex/restore-v41-preview`, so it can reuse already verified Preview-only Tochka credentials.
- Public Production stays unchanged until explicit approval and legal release gates are closed.

## Asset limitation
- The approved mockup was a **flattened image containing text and buttons**. It cannot serve as a clean background for dynamic HTML.
- Current V5 Preview uses a **licensed, clean Unsplash yacht photo** with a similar palette. It is **not an exact pixel-identical reproduction** of the approved illustration. For exact fidelity, export a background-only version of the approved image and replace `.v5-scene` source.
- Photo reference: https://unsplash.com/photos/a-view-of-the-back-of-a-boat-on-the-water-78l-Rg_-1cI

## Before Production
- Check V5 on Safari, Chrome, iOS and Android.
- Verify real 50 ₽ payment, result, electronic receipt and webhook handling.
- Finalize privacy policy, offer, contact details, and Roskomnadzor/FNS compliance.
