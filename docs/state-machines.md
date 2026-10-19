# State machines and money rules

These rules are enforced in code, not only documented. The transition tables live in
`src/features/membership/domain/state-machines.ts`; services call `assertTransition` before every
status write, and the tests in `state-machines.test.ts` fix the allowed moves.

## Applications (`AlumniApplication.status`)

| From | To |
| --- | --- |
| DRAFT | SUBMITTED |
| SUBMITTED | UNDER_REVIEW, CHANGES_REQUESTED, APPROVED, REJECTED |
| UNDER_REVIEW | CHANGES_REQUESTED, APPROVED, REJECTED |
| CHANGES_REQUESTED | SUBMITTED |
| APPROVED, REJECTED | (terminal) |

Submission requires a verified email, both attestations, and a complete application
(`features/registration/domain/completeness.ts`). Staff decisions use the application `version`
as a compare-and-set token, so a stale screen cannot overwrite a newer decision.

## Registration orders (`RegistrationOrder.status`)

| From | To | Trigger |
| --- | --- | --- |
| UNPAID | AWAITING_REVIEW | Transfer evidence submitted |
| AWAITING_REVIEW | UNPAID | Evidence rejected (member may resubmit; the order is reused, never duplicated) |
| AWAITING_REVIEW | CONFIRMED | Finance confirms the transfer |
| CONFIRMED | REFUNDED | A refund is recorded as processed |

"Rejected" is a state of the **attempt**, not the order. The order returns to UNPAID so the
member can correct the evidence without paying twice.

## Payment attempts (`PaymentAttempt.status`)

SUBMITTED moves to CONFIRMED or REJECTED. CONFIRMED and REJECTED are final.

Database guarantees, created in the initial migration:

- At most one SUBMITTED attempt per order (partial unique index).
- A transfer reference is accepted once per payment method and receiving account, unless the
  earlier attempt was rejected (partial unique index on `normalizedReference`).
- Amounts are positive integers in paisa (CHECK constraints).

## Confirmed payments

`ConfirmedPayment` rows are written once and never updated or deleted. A trigger raises an
exception on any UPDATE or DELETE. Approval locks the attempt row (`SELECT ... FOR UPDATE`) and
then uses compare-and-set updates, so two reviewers acting at the same moment produce one payment
and one receipt number. The second call returns the first receipt.

## Refunds (`Refund.status`)

| From | To |
| --- | --- |
| REQUESTED | APPROVED, REJECTED |
| APPROVED | PROCESSED, FAILED |
| FAILED | APPROVED (retry) |
| PROCESSED, REJECTED | (terminal) |

A refund request opens automatically when an application is rejected after its fee was
confirmed. Finance must record the transfer reference before a refund can be marked PROCESSED.
Nothing is marked returned by the system alone.

## Membership (`Membership.status`)

| From | To | Rule |
| --- | --- | --- |
| PENDING | ACTIVE | Every eligibility fact holds (see below) |
| PENDING | CLOSED | Application rejected |
| ACTIVE | SUSPENDED | Staff suspension, or an approved refund |
| ACTIVE | CLOSED | Staff closure, or a processed refund |
| SUSPENDED | ACTIVE | Staff reinstatement, only when every fact holds again |
| SUSPENDED | CLOSED | Staff closure |
| CLOSED | (terminal) | |

Suspension and closure delete the member's sessions in the same transaction, so access ends
immediately.

### Eligibility (all required)

1. `User.emailVerified` is true.
2. The application is complete (required fields and attestations).
3. The application is APPROVED.
4. A `ConfirmedPayment` exists for the member's order.
5. No refund is APPROVED or PROCESSED.

A receipt upload, an approval, or a confirmed fee alone never activates membership. The sync
function `syncMembershipForUser` runs inside the approval transactions, and its
`updateMany ... WHERE status = 'PENDING'` makes activation happen exactly once.

### Refund consequences

- Refund approved: an ACTIVE membership becomes SUSPENDED and sessions end. A PENDING membership stays PENDING, because it cannot be suspended.
- Refund processed in full: membership becomes CLOSED and the order becomes REFUNDED.
- Only full refunds exist at launch. Partial refunds are not supported.

## Money

- Stored as integer paisa. PKR 500 is `50000`. Display uses `formatRupees`.
- The fee in force is a dated `FeeSchedule` row. Orders copy the amount and the receiving
  account when they are created, and changing the fee never edits an existing order.
- The amount paid must equal the order fee. A mismatch is refused at submission and at review.
- Revenue on the overview counts CONFIRMED payments only. Refunds count only when PROCESSED.
