# CreatorPocket strategic simulation

## State and lifecycle

The simulation is local, single-player, and fictional. Its pure functions live in `src/game.js`. State version 2 retains the existing storage key so a v1 save is migrated on read. Legacy balances, equipment, counts and post metrics are retained; legacy posts are settled historical records and never enter the new revenue or eligibility calculation.

A fresh creator starts at zero subscribers and 120 game coins. Publishing pays only the selected production cost and consumes energy. The post first records a small deterministic trial distribution. Advancing the game day settles distribution, subscriber gains/losses, likes, comments, trust and eligible revenue once. There is no wall-clock processing, offline penalty, daily login reward, seven-day stop or unbounded passive revenue.

The seed is created at campaign start, persisted with the first draft/action, and combined with the sequential post ID. The ±10% delivery variation cannot change the sign of satisfaction or trust. A result reload restores the pending distribution rather than rerolling it. Repeated publish/continue attempts are rejected by phase guards.

## Decisions and causal feedback

The creator chooses one of three ideas, then format, hook, body and finish. Daily audience cues identify the current topic and desired value; the channel also has a persistent starting audience. Evaluation combines audience/demand fit, opening clarity, delivered substance, mismatch between promise and content, fatigue and repetition of the exact idea/hook/body. A genre alone is never penalized.

The current first slice uses deterministic three-day topic windows and three value types: practical steps, visible change and personal story. Expensive finishing is useful only for the right purpose. Equipment improves clarity or efficiency modestly and cannot turn a weak promise into good demand. A hype hook improves trial click-through but sets a larger promise and may reduce trust/subscribers. Honest low-demand experiments do not automatically lose subscribers.

Preview displays cost, intended audience and one concern; it does not expose guaranteed subscriber/revenue forecasts or a numerical fit score. Outcomes expose at most two causal reasons and one next action. Comments are sampled from pools attached to the same causes, with no duplicate wording in a post and no repeated representative comment across the recent sequence.

## Economy and progression

All thresholds are balancing parameters, not real YouTube or X rules.

Monetization requires 100 subscribers, 1,500 views in the latest seven eligible posts, three high-satisfaction posts in the latest five, and trust 60. A qualified application is approved on the next game day without random rejection. Only posts published after activation generate ad revenue. Revenue uses integer hundredth-coin units and cumulative rounding, so fractions carry forward without double payment.

The ledger records production expense, equipment expense, ad income and sponsor income separately. Old saved balances are not reclassified as new revenue. Every production plan has a zero-coin alternative, and rest remains available. Currency never becomes debt. Display metrics and wallet balance cap at 999,999,999; ledger units cap at 999,999,999,999. At that extreme wallet ceiling, only the available headroom is credited, and the post, balance and income ledger record the same credited delta. Fractional units are retained without creating uncapped arrears. These safeguards prevent overflow from invalidating long-campaign saves.

Three bounded event types are tied to actual outcomes: requests, expectation clarification, and fictional sponsor offers. At most one offer/event is active, with at least three posts between new events. Clarification spends 10 energy and repairs only a small amount of trust once. Planning/skipping has no numerical reward. Sponsors disclose topic, content requirement, disclosure requirement, four-game-day deadline, reward and audience mismatch warning. Content delivery, disclosure and deadline are checked once; an otherwise well-made mismatched sponsorship can pay while reducing audience satisfaction. Expiration imposes no surprise monetary fine.

Milestone awards are cosmetic. The fictional silver keepsake at 1,000 subscribers is permanent and records the game day and relevant post ID.

## Verification

Automated coverage includes seeded stage settlement, zero-view/zero-growth outcomes, misleading-hook churn, honest experimentation, genre consistency, repetition, resource recovery, no retroactive ad payment, fractional carry, sponsor fulfillment/expiration, event replay guards, permanent awards, legacy-save migration and draft reload persistence. Controller tests cover progressive decisions and keep the external-player consent, local recommendation, gesture and no-game-reward checks.

Balance suite: 100 seeds × 28 game days for a cue-aware strategy against a naive misleading strategy; 135 fixed legal decision recipes against the same 100 multi-audience contexts; 100 seeds × 210 days for recovery, monetization and the long award path; and four 1,100-day campaigns with save/restore equality checked every day through the numerical ceilings. In the verified run the cue-aware day-28 result was 95–114 subscribers, while no fixed recipe matched the adaptive strategy in all contexts. These are automated examples, not a promised player timeline or evidence that the model cannot be optimized further.

## Scope and remaining limits

- The current model has nine visual base ideas, three value variants, four audience types and three event types. It is a deliberately bounded first strategic iteration.
- The starting audience remains stable; full audience-cohort evolution, editable scripts/titles, long-form video production and deeper brand negotiations are outside this patch.
- No player comments are sent anywhere. There is no real sponsorship, payment, channel linkage or award shipping.
- YouTube is official link-out only for every queue entry, with no iframe, thumbnail or player API path. X retains separate explicit embed consent. The watch view shows the metadata card first; interests, queue management and update details are collapsed beneath it. Local preferences and likes remain separate from the game.
- Latest local preview access from Cloud Browser was blocked by `ERR_BLOCKED_BY_CLIENT`. Unit/jsdom checks do not prove mobile viewport layout, actual touch behavior, accessibility conformance or real external-video playback. Browser visual QA remains required before release.
