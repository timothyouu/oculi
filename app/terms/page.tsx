import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — Oculi",
  description: "Terms for using Oculi.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--ink)]/70 hover:text-[var(--ink)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Oculi
        </Link>

        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        <p className="mt-1 text-sm text-[var(--ink)]/60">Last updated July 11, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-[var(--ink)]/85">
          <p>
            By using Oculi, you agree to these terms and the{" "}
            <Link href="/privacy" className="underline decoration-[var(--gold)] underline-offset-2">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the service.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Accounts</h2>
            <p>
              Oculi starts with an anonymous authenticated session and may let you link it to Google.
              You are responsible for activity performed through your session and for maintaining access
              to any linked account. You must be at least 13 years old to use Oculi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Your uploads</h2>
            <p>
              You retain ownership of content you upload. You grant Oculi a non-exclusive, worldwide,
              royalty-free license to host, copy, resize, display, and distribute that content only as
              needed to operate, secure, promote, and improve Oculi. You confirm that you have the rights
              and permissions needed to upload the content and grant this license.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Acceptable use</h2>
            <p>You may not use Oculi to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>upload unlawful, infringing, deceptive, abusive, or privacy-invasive content;</li>
              <li>harass others, impersonate someone, or expose personal information without permission;</li>
              <li>bypass access controls, probe for vulnerabilities, disrupt the service, or automate abuse;</li>
              <li>misrepresent route suggestions or community content as professional safety advice.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Maps, routes, and location information</h2>
            <p>
              Photo-spot details, accessibility labels, arrival times, routes, and external map links are
              planning aids and may be incomplete or wrong. Check current closures, laws, weather,
              transportation, property boundaries, and personal safety before visiting a location. Oculi
              is not turn-by-turn navigation or emergency guidance.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Moderation and termination</h2>
            <p>
              We may review, reject, remove, or restrict content and accounts that violate these terms,
              create risk, or interfere with the service. To report a photo or request a takedown, email{" "}
              <a className="underline decoration-[var(--gold)] underline-offset-2" href="mailto:timothyou02@gmail.com">
                timothyou02@gmail.com
              </a>{" "}
              with the relevant URL and a short explanation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Service changes and availability</h2>
            <p>
              Oculi is an early-stage service. Features and catalog data may change, and the service may
              be interrupted or discontinued. We may update these terms by posting a revised version and
              changing the date above.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Disclaimers and liability</h2>
            <p>
              To the fullest extent permitted by law, Oculi is provided “as is” and “as available,”
              without warranties of merchantability, fitness for a particular purpose, or non-infringement.
              To the fullest extent permitted by law, Oculi and its operator will not be liable for
              indirect, incidental, special, consequential, or punitive damages arising from use of the
              service or reliance on its content.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Contact</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a className="underline decoration-[var(--gold)] underline-offset-2" href="mailto:timothyou02@gmail.com">
                timothyou02@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
