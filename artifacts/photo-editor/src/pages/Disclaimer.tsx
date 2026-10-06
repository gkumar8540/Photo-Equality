import React from "react";

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-[#0c1d39] px-4 py-8 text-black">
      <div className="mx-auto max-w-4xl rounded-xl border border-[#30363d] bg-[#ffffff] p-6 md:p-10">
        <h1 className="mb-2 text-3xl font-bold">Disclaimer</h1>

        <p className="mb-8 text-sm text-gray-400">
          Last Updated: October 5, 2026
        </p>

        <div className="space-y-7 text-sm leading-7 text-black">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-black">
              1. General Information
            </h2>
            <p>
              Photo-Equality is an image editing tool designed to provide
              image editing, customization, and related features. The service
              is provided for general use and is not intended to provide
              professional, legal, financial, medical, or other specialized
              advice.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-black">
              2. User Responsibility
            </h2>
            <p>
              Users are responsible for the images, text, and other content
              they select, edit, download, or otherwise process using
              Photo-Equality. Users must ensure that they have the necessary
              rights, permissions, or licenses to use such content.
            </p>

            <p className="mt-2">
              Photo-Equality does not take responsibility for content created
              or processed by users or for the way users choose to use the
              edited content.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-black">
              3. Image Processing and Backup
            </h2>
            <p>
              Depending on the feature being used, images may be processed
              locally on the user's device or browser. Users should maintain
              their own backup copies of important images and content.
            </p>

            <p className="mt-2">
              Photo-Equality should not be considered a permanent storage,
              backup, or archival service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-black">
              4. Third-Party Services
            </h2>
            <p>
              Photo-Equality may use third-party services for advertising,
              analytics, hosting, security, or other functionality. These
              third-party services may operate under their own terms,
              policies, and privacy practices.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-black">
              5. Advertisements
            </h2>
            <p>
              Advertisements may appear on the Photo-Equality website or
              mobile application. Advertisements may be provided by
              third-party advertising services. We do not control every
              advertisement displayed and are not responsible for the products,
              services, claims, or content provided by third-party advertisers.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-black">
              6. External Links
            </h2>
            <p>
              Photo-Equality may contain links to external websites or
              services. We are not responsible for the content, privacy
              practices, security, availability, or policies of external
              websites or services.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-black">
              7. Service Availability
            </h2>
            <p>
              We do not guarantee that Photo-Equality will always be
              available, uninterrupted, secure, or completely free from
              errors. Features may be modified, temporarily unavailable, or
              discontinued when necessary.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-black">
              8. No Guarantee of Results
            </h2>
            <p>
              Photo-Equality provides image editing tools, but we do not
              guarantee that the results of editing or processing will meet
              every user's expectations or requirements.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-black">
              9. Changes
            </h2>
            <p>
              Features, content, services, and policies may change from time
              to time without prior notice. This Disclaimer may also be
              updated when necessary. The updated version will be posted on
              this page with a revised date.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

