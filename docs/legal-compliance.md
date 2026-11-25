# Legal compliance checklist (Netherlands / EU)

Status of the legal requirements for a Dutch webshop selling refurbished laptops to consumers (and businesses).
Checked on 2026-10-29. **This is a developer's checklist, not legal advice:** have it reviewed by a lawyer or an
organisation such as Thuiswinkel.org before selling for real.

Legend: ✅ done in the code · 🟡 done, but placeholder data or a decision is needed · ❌ open · 👤 only the owner can do it

## 1. Company identity and contact

| Requirement | Source | Status | Where |
|---|---|---|---|
| Name, legal form, address, email, KVK and VAT number on the website | BW 3:15d, 6:230m; Handelsregisterwet | 🟡 | Footer on every page; `/info/contact`. Values are placeholders in `storefront/src/config/company.ts` and `backend/src/email/company.ts` |
| Telephone number shown if you have one | BW 6:230m | 🟡 | `/info/contact` (placeholder) |
| Register with KVK, get a VAT number | Handelsregisterwet, Wet OB | 👤 | — |

## 2. Before the order (pre-contractual information)

| Requirement | Source | Status | Where |
|---|---|---|---|
| Main characteristics of the product, incl. that it is second-hand and its condition | BW 6:230m; unfair commercial practices (BW 6:193a ff.) | ✅ | Product page: "Refurbished · conditie: …" plus description |
| Prices including VAT; all extra costs (shipping) before ordering | BW 6:230m; Besluit prijsaanduiding | ✅ | Product, cart, checkout |
| Payment methods, delivery time (max 30 days unless agreed) | BW 6:230m, 7:19a | ✅ | Checkout; `/info/verzending` |
| Withdrawal right: conditions, period, procedure, model form, who pays return shipping | BW 6:230m, 6:230o–s | ✅ | `/info/herroepingsrecht`, `/info/retourneren` (return costs consistent: customer pays, except defects/wrong item) |
| Statutory warranty (conformity) and commercial warranty; commercial warranty must not limit legal rights | BW 7:17, 7:6a | ✅ | `/info/garantie` |
| Complaint procedure | BW 6:230m | ✅ | `/info/algemene-voorwaarden` §9, `/info/contact` |
| General terms available before the contract is concluded | BW 6:234 | ✅ | Linked in the checkout right above the order button (and in the footer) |
| Link to the EU ODR platform | — | ✅ not needed | The platform closed on 20 July 2025; the obligation to link to it ended |

## 3. The order

| Requirement | Source | Status | Where |
|---|---|---|---|
| Order button clearly states that ordering means paying | BW 6:230v(3) | ✅ | Button text "Bestellen en betalen" (Dutch courts found "Bestelling plaatsen" insufficient) |
| No pre-ticked boxes for extra paid options | BW 6:230s | ✅ | None exist |
| No surcharge for a payment method | BW 6:230k; in3 terms | ✅ | in3 adds no costs |

## 4. After the order (durable medium)

| Requirement | Source | Status | Where |
|---|---|---|---|
| Confirmation on a durable medium (email) with: identity and address, price, withdrawal right + model form, warranty, terms | BW 6:230v(7) | ✅ | Order confirmation email |
| Refund within 14 days of withdrawal, incl. original standard shipping | BW 6:230r | ✅ | Stated in pages and email; the actual refund is done by staff in the Dashboard |

## 5. Privacy (AVG/GDPR) and cookies

| Requirement | Source | Status | Where |
|---|---|---|---|
| Privacy statement: controller, data, purposes, legal bases, recipients, retention, rights, complaint to AP | AVG art. 13 | ✅ | `/info/privacybeleid` |
| Cookies: only functional cookies → no consent banner needed, but inform users | Telecommunicatiewet 11.7a | ✅ | Listed in the privacy statement. If you ever add analytics or ads: a consent banner is required first |
| Security of personal data | AVG art. 32 | ✅ / 🟡 | Passwords hashed (Vendure); login cookie is `httpOnly` and `secure` in production; HTTPS must be set up at the host |
| Processing agreements (verwerkersovereenkomsten) with Mollie, PostNL, host, email provider | AVG art. 28 | 👤 | Usually part of their terms; check and keep copies |
| Register of processing activities | AVG art. 30 | 👤 | Simple spreadsheet; small businesses are usually exempt, but recommended |
| Handling data subject requests (access, deletion) | AVG art. 15–22 | 🟡 | Via email to the shop; there's no self-service account deletion |

## 6. Payments and in3

| Requirement | Source | Status | Where |
|---|---|---|---|
| Live payments only after Mollie approval; in3 requires in3's approval of the shop | Mollie / in3 contracts | 👤 | The code refuses non-test keys on purpose; remove that guard deliberately when going live |
| Advertising "pay later / 0% interest" | Wft; **new Consumer Credit Directive (EU) 2023/2225** | ❌ to check | From 20 Nov 2026 (EU date; the Dutch implementation date may differ) buy-now-pay-later falls under consumer-credit rules. Ask Mollie/in3 for the required advertising wording and update the in3 texts (hero, product pages, FAQ) before going live |
| in3 not for minors | Dutch implementation of CCD2 | 👤 | Enforced by in3; mention it in your terms once in3 confirms |

## 7. Tax and invoices

| Requirement | Source | Status | Where |
|---|---|---|---|
| Choose VAT treatment: normal 21% or **margin scheme for second-hand goods** | Wet OB art. 28b | 👤 | Decide with an accountant. Only possible when you bought the goods without VAT. Under the margin scheme you may **not** show VAT on invoices |
| Invoices with consecutive numbers for business customers | Wet OB art. 35a | 👤 | The order email is an order confirmation, not an invoice. Issue invoices from your accounting software (e.g. Moneybird, e-Boekhouden); consumers don't legally need one |
| Keep administration 7 years | AWR art. 52 | 👤 | Vendure keeps orders; also export to your accounting |

## 8. Product and environmental rules

| Requirement | Source | Status | Where |
|---|---|---|---|
| E-waste (AEEA/WEEE): inform customers, take back old equipment when selling new | Regeling AEEA | 🟡 | `/info/recycling` promises free "old for new" take-back; make sure you can honour it |
| Producer registration for electrical equipment if you import (also from other EU countries) | Regeling AEEA; Stichting OPEN | 👤 | Check whether your supplier is already registered as the producer |
| Batteries (laptop batteries): take-back and information | Batterijenbesluit / EU Battery Regulation | 🟡 | Covered on `/info/recycling`; check producer registration with your supplier |
| CE marking and safety of the products | Warenwet; product safety (GPSR) | 👤 | Buy from suppliers who supply CE-marked, safe goods and documentation |
| Trademarks: brand names used only to describe genuine products; no brand logos | Merkenrecht (exhaustion) | ✅ | Names in text only; placeholder images |

## 9. Accessibility

| Requirement | Source | Status | Where |
|---|---|---|---|
| European Accessibility Act for e-commerce (BW 6:230fa) | EAA, in force 28 June 2025 | ✅ exempt while a micro-enterprise | Applies once you have 10+ staff or more than €2 million turnover/balance. The shop already has labelled buttons and forms, keyboard-usable components (shadcn/ui) and a responsive layout; a full WCAG 2.1 AA audit is needed before you outgrow the exemption |

## 10. The demo (portfolio) itself

| Point | Status |
|---|---|
| No real transactions possible (Mollie test mode, non-test keys refused) | ✅ |
| Clearly marked as a portfolio project with fictional company details (footer, emails, terms, contact) | ✅ |
| Personal data entered by visitors of a public demo still falls under the AVG | ✅ privacy statement; consider wiping demo orders regularly |

## Sources used

- ACM checklist for webshops (order button): https://www.acm.nl/nl/download/bijlage/?id=11871
- Order button case law: https://www.aaff.nl/artikelen/webwinkels-opgelet-bestellen-is-niet-genoeg
- End of the EU ODR platform: https://cm.twobirds.com/en/insights/2025/global/the-end-of-the-european-online-dispute-resolution-platform
- Consumer Credit Directive 2 and BNPL in the Netherlands: https://cms.law/en/nld/publication/draft-bill-dutch-implementation-of-revised-consumer-credit-directive, https://www.loyensloeff.com/insights/news--events/news/implementation-act-consumer-credit-directive-ii/, https://briqpay.com/blog/ccd2-explained-eu-consumer-credit-directive-bnpl-country-by-country
- European Accessibility Act for e-commerce: https://www.taylorwessing.com/en/insights-and-events/insights/2025/09/european-accessibility-act-requirements-for-e-commerce-services
- Margin scheme: https://ondernemersplein.overheid.nl/geldzaken-en-belastingen/omzetbelasting-btw/margeregeling-voor-de-btw/
- E-waste producer responsibility: https://leveranciers.bol.com/?p=7692, https://www.officielebekendmakingen.nl/stcrt-2016-4066.pdf
