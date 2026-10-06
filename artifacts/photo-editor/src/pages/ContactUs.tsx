import React from "react";

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-[#0c1d39] px-4 py-6 text-black">
      <div className="mx-auto max-w-4xl rounded-xl border border-[#30363d] bg-[#ffffff] p-6 md:p-10">
        <h1 className="mb-0 text-3xl font-bold">Contact Us</h1>

        <p className="mb-5 text-sm text-black">
          We are happy to hear from you.
        </p>

        <div className="space-y-2 text-sm leading-7 text-black">
          <section>
            <h2 className="mb-0 text-xl font-semibold text-black">
              Get in Touch
            </h2>

            <p>
              If you have questions, suggestions, feedback, or need help with
              Photo-Equality, you can contact us using the email address below.
            </p>

            <div className="mt-4 rounded-lg border border-[#30363d] bg-[#0c1d39] p-4">
              <p className="text-sm text-gray-400">Support Email</p>

              <a
                href="mailto:princekumar85494@gmail.com"
                className="mt-1 inline-block text-base font-medium text-[#f3ad61] hover:underline"
              >
                princekumar85494@gmail.com
              </a>
            </div>
          </section>

          <section>
            <h2 className="mb-0 text-xl font-semibold text-black">
              Before Contacting Us
            </h2>

            <p>
              For faster assistance, please include a clear description of
              your question or issue. If you are reporting a technical
              problem, mention the device, browser or application version, and
              the steps that caused the problem when possible.
            </p>
          </section>

          <section>
            <h2 className="mb-0 text-xl font-semibold text-black">
              Feedback
            </h2>

            <p>
              Your feedback helps us improve Photo-Equality and make the
              editing experience better.
            </p>
          </section>

          <section>
            <h2 className="mb-0 text-xl font-semibold text-black">
              Response Time
            </h2>

            <p>
              We will review your message and respond as soon as reasonably
              possible. Response times may vary depending on the nature and
              volume of requests.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

