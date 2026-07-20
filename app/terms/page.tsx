import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-12">
      <div>
        <h1 className="text-3xl font-bold text-[var(--ink)]">Terms of Service</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Last updated: July 2026
        </p>
      </div>

      <div className="space-y-1 rounded-lg border border-[var(--line)] bg-[var(--chip)] p-4">
        <p className="text-sm font-semibold text-[var(--ink)]">⚠️ Placeholder Notice</p>
        <p className="text-sm text-[var(--muted)]">
          This is placeholder text, not legal advice. These terms will be reviewed and replaced by a qualified legal professional before any real launch. Use this version for demo purposes only.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">1. User-Generated Content</h2>
        <p className="text-[var(--muted)]">
          When you upload photos or other content to Oculi, that content is published publicly and accessible to all visitors. By uploading, you confirm that you own or have the rights to share that content. You retain ownership of your uploads.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">2. Prohibited Content</h2>
        <p className="text-[var(--muted)]">
          You may not upload content that is:
        </p>
        <ul className="space-y-2 pl-6 text-[var(--muted)]">
          <li>• Infringing on intellectual property rights</li>
          <li>• Illegal or depicting illegal activity</li>
          <li>• Sexually explicit</li>
          <li>• Hateful, harassing, or discriminatory</li>
          <li>• Misleading or fraudulent</li>
          <li>• Spam or commercial advertising</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">3. Content Moderation</h2>
        <p className="text-[var(--muted)]">
          Oculi reserves the right to remove content that violates these terms. We may review uploads after publication and take action including removal or account restrictions.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">4. Takedown Requests</h2>
        <p className="text-[var(--muted)]">
          If you believe content violates your rights or these terms, please contact us at{" "}
          <span className="font-mono text-[var(--ink)]">report@oculi-demo.example</span>
          {" "}with details including the content URL and the reason for your report. We will respond as quickly as possible.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">5. Disclaimer</h2>
        <p className="text-[var(--muted)]">
          Oculi is provided &quot;as is&quot; without warranties. We are not liable for any indirect, incidental, or consequential damages. Your use of the service is at your own risk.
        </p>
      </section>

      <div className="flex items-center gap-4 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)]">
        <Link href="/privacy" className="hover:text-[var(--ink)]">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
