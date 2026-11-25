# Problems and lessons learned

Short notes on things that went differently than expected, and what they taught.

## Read the code, not only the README

The Mollie plugin's README says it uses Mollie's **Orders API**; its code uses the **Payments API** (with order
lines and billing address). That difference decided whether in3 would work without a custom payment handler.
The same reading found that the plugin only appends the order code to its *fallback* redirect URL — passing our own
`redirectUrl` would have sent customers back to a confirmation page without an order code.
**Lesson:** for anything payment-related, verify behaviour in the source or a test, not in documentation.

## Webhooks are not a request/response flow

Mollie calls the backend whenever it likes, possibly late, possibly twice, and its body only contains a payment ID.
The plugin re-fetches the payment from Mollie before changing the order, our e2e test sends the same webhook twice,
and the confirmation page polls and falls back to `syncMolliePaymentStatus`.
**Lesson:** design for "late, duplicated, or never", and never trust what an external caller tells you.

## A rule in the UI is not a rule

Hiding in3 in the checkout isn't enforcement: anyone can call the Shop API directly. The in3 rules are therefore in
the backend (`In3PaymentInterceptor`). The code review then found a second path: a payment *without* a named method
lets Mollie's own page offer in3. The fix was to check that case too.
**Lesson:** list every way a request can reach the sensitive action, not only the one the UI uses.

## Money as integer cents, input as strings

Prices are stored as integer cents everywhere. The supplier feed parser converts "549.5" to cents with string
handling, not floating point. Writing its tests revealed that a Dutch decimal comma ("549,00") would silently shift
columns and be read as € 549 — the parser now rejects rows with the wrong number of columns.
**Lesson:** tests for parsers are where you discover the input you didn't think of.

## Demo defaults can hurt production

The supplier sync first defaulted to the bundled sample feed. In production that would have overwritten real stock
and prices every night. Now only development has a default; elsewhere the task is off until a feed is configured.
**Lesson:** a convenient default for development must be checked against what it does in production.

## Containers reveal assumptions

Building and running the Docker images found that the non-root user couldn't create the uploads folder, which never
shows up when running locally as yourself.
**Lesson:** run the real artefact (the image), not only the code.

## Serialized jobs and entity getters

The first return-confirmation email crashed: it passed a full `Order` entity to the email job, whose serialization
called a getter that needed relations that weren't loaded. Passing plain values (order code, first name) fixed it.
**Lesson:** data that crosses a process boundary (job queue) should be plain data.

## Same tools everywhere, or CI breaks

CI failed on a commit that only regenerated the lockfiles on a Windows machine with npm 11, while CI used npm 10
(bundled with Node 22). npm 11 leaves out a few optional entries that npm 10 requires, so `npm ci` refused the
lockfile before any test ran. The fix was one toolchain everywhere: Node 24 / npm 11 in `.nvmrc`, `engines` with
`engine-strict`, CI and the Dockerfiles, and installing with `npm ci` instead of `npm install`.
**Lesson:** the lockfile is shared state; every machine that writes it must use the same npm.

## Build from a clean clone

The storefront Dockerfile copied `public/`, which was empty. Git doesn't store empty folders, so the build only
failed when building from a fresh clone, exactly what a server does. Testing the production stack from a copy made
of the files in git found it.
**Lesson:** verify deployments from what's in the repository, not from your working directory.

## Things not done (yet)

- A live in3 payment in Mollie test mode — the development environment couldn't reach `api.mollie.com`. The four
  steps to verify it are in decision 0001.
- Invoices: the confirmation email is not an invoice; issue invoices from accounting software (see docs/legal-compliance.md).
- Rate limiting on public endpoints such as `requestReturn` (best done at the reverse proxy).
- Deployment to a real server — the production stack is ready and tested (docs/deployment.md).
