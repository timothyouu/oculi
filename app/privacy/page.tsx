import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Oculi",
  description: "What Oculi collects, how it is used, and the choices available to you.",
};

export default function PrivacyPage() {
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

        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p className="mt-1 text-sm text-[var(--ink)]/60">Last updated July 11, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-[var(--ink)]/85">
          <p>
            This policy explains the information Oculi handles, why it is needed, and the choices
            available to you. Oculi does not sell personal information or use it for targeted advertising.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Information we collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Account and session data.</strong> Oculi creates an anonymous Supabase
                authentication session so saves and uploads can be tied to one visitor. If you choose
                Google sign-in, Oculi also receives the account information Google and Supabase provide
                for authentication.
              </li>
              <li>
                <strong>Activity and profile data.</strong> This includes saved places, liked and viewed
                photos, followed users, route plans, and profile fields you edit.
              </li>
              <li>
                <strong>Uploads.</strong> We store the photo, caption, tags, selected place, time and
                camera notes you submit, an owner identifier, creation time, and moderation status.
              </li>
              <li>
                <strong>Device and request data.</strong> Theme, map camera, and similar preferences are
                stored in your browser. Oculi and its hosting providers may process standard request data
                such as IP address, browser type, timestamps, and requested URLs for delivery, security,
                and troubleshooting.
              </li>
              <li>
                <strong>Location.</strong> If you grant browser permission, your current location is used
                on your device to suggest nearby places and calculate distance. Oculi does not persist
                your precise device location in its database.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">How we use information</h2>
            <p>
              We use this information to operate accounts, remember your activity, publish and moderate
              photos, generate shoot routes, show map results, prevent abuse, troubleshoot failures, and
              improve the service. We limit collection to information needed for those purposes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Service providers and external content</h2>
            <p>
              Supabase provides authentication, database, and photo storage. Mapbox provides map data.
              Google processes authentication only if you choose Google sign-in. Some catalog images load
              from Wikimedia Commons or other attributed image hosts, which may receive ordinary web
              request information when your browser loads them. Opening Google Maps, Apple Maps, or an
              attribution link takes you to that provider under its own privacy terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Public content and moderation</h2>
            <p>
              Approved photo uploads, captions, tags, and associated profile information are public.
              Pending or rejected database records are visible only to their owner and authorized
              moderators. Do not upload private or sensitive material, or content you do not have the
              right to share.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Retention and your choices</h2>
            <p>
              We keep account activity and uploads while they are needed to provide Oculi, resolve abuse
              reports, or meet legal obligations. Browser-only data can be removed through your browser
              controls. To request access, correction, deletion, account closure, or a photo takedown,
              email{" "}
              <a className="underline decoration-[var(--gold)] underline-offset-2" href="mailto:timothyou02@gmail.com">
                timothyou02@gmail.com
              </a>
              . Include the relevant profile, place, or photo URL so the request can be verified and located.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Security and tracking</h2>
            <p>
              Oculi uses encrypted connections, authenticated sessions, and owner-scoped database rules.
              No internet service can guarantee absolute security. Oculi does not include advertising
              trackers or cross-site behavioral analytics, so it does not respond differently to browser
              “Do Not Track” signals.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">Changes and contact</h2>
            <p>
              Material changes will be reflected by updating the date on this page. Questions, privacy
              requests, and takedown notices can be sent to{" "}
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
