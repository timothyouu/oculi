import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-12">
      <div>
        <h1 className="text-3xl font-bold text-[var(--ink)]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Last updated: July 2026
        </p>
      </div>

      <div className="space-y-1 rounded-lg border border-[var(--line)] bg-[var(--chip)] p-4">
        <p className="text-sm font-semibold text-[var(--ink)]">⚠️ Placeholder Notice</p>
        <p className="text-sm text-[var(--muted)]">
          This is placeholder text, not legal advice. This policy will be reviewed and replaced by a qualified legal professional before any real launch. Use this version for demo purposes only.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">1. Information We Collect</h2>
        <p className="text-[var(--muted)]">
          When you use Oculi, we collect:
        </p>
        <ul className="space-y-2 pl-6 text-[var(--muted)]">
          <li>• <strong>Session data:</strong> An anonymous session identifier stored locally in your browser</li>
          <li>• <strong>Interaction history:</strong> Which photos you&apos;ve viewed, which places you&apos;ve saved, which photographers you follow, and which photos you&apos;ve liked</li>
          <li>• <strong>Uploaded photos:</strong> Images you submit are stored in our cloud storage with associated metadata (captions, tags, location)</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">2. How We Use Your Data</h2>
        <p className="text-[var(--muted)]">
          We use the information collected to:
        </p>
        <ul className="space-y-2 pl-6 text-[var(--muted)]">
          <li>• Provide and personalize the service (e.g., showing your saved places and liked photos)</li>
          <li>• Persist your preferences across sessions</li>
          <li>• Display your uploaded content publicly</li>
          <li>• Improve the service and fix bugs</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">3. Data Storage and Security</h2>
        <p className="text-[var(--muted)]">
          Your data is stored in Supabase, a cloud database service. We take reasonable steps to protect your information, but no system is 100% secure. Uploaded photos are stored in cloud storage and are publicly accessible.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">4. Deleting Your Data</h2>
        <p className="text-[var(--muted)]">
          To request deletion of your data, uploaded photos, or account information, please contact us at{" "}
          <span className="font-mono text-[var(--ink)]">report@oculi-demo.example</span>
          {" "}with your request. We will process deletion requests as quickly as possible, though some information may be retained for legal or operational reasons.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">5. Public Content</h2>
        <p className="text-[var(--muted)]">
          Photos, places, and user profiles on Oculi are publicly visible. By uploading or creating content, you consent to it being displayed publicly and indexed by search engines.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">6. Changes to This Policy</h2>
        <p className="text-[var(--muted)]">
          We may update this privacy policy from time to time. Continued use of Oculi constitutes acceptance of any changes.
        </p>
      </section>

      <div className="flex items-center gap-4 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)]">
        <Link href="/terms" className="hover:text-[var(--ink)]">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
