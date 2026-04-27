import { Button } from "@workspace/ui/components/button";
import { SectionHeading } from "@workspace/ui/components/section-heading";

const faqs = [
  {
    question: "Do I need any special hardware?",
    answer:
      "No. Docita works on any computer, tablet, or smartphone with a modern web browser. No installation required.",
  },
  {
    question: "Is my patient data secure?",
    answer:
      "Docita uses encrypted transport and storage, role-based access, audit trails, and India-hosted backend systems. We describe the controls we currently operate rather than claiming unsupported certifications.",
  },
  {
    question: "Can I import my existing patient data?",
    answer:
      "Absolutely. We support Excel/CSV imports today, and the rollout is designed so standard clinic data can be reviewed and moved quickly without forcing the team to start from scratch.",
  },
  {
    question: "How does the pricing work?",
    answer:
      "Each paid plan includes a base quota of consultations, users, WhatsApp messages, and plan-specific limits. Guided setup is quoted separately because each clinic has different records, templates, and training needs. If you go beyond plan usage, extra usage is billed at a per-unit rate at the start of the next month.",
  },
  {
    question: "What does guided setup include?",
    answer:
      "Guided setup can include Excel import, patient list cleanup, prescription format configuration, clinic letterhead, doctor signature, WhatsApp message templates, billing basics, and staff walkthroughs. Starter setup begins from ₹4,999 after reviewing the current workflow.",
  },
  {
    question: "What happens if I exceed my plan limits?",
    answer:
      "Nothing stops — Docita keeps working. We meter your usage automatically. At the start of each month we calculate any overage from the prior month and add it to your next invoice. Higher tiers have lower per-unit rates. You can see the exact rates for your currency in the pricing section above, or upgrade to a higher tier to reduce per-unit costs.",
  },
  {
    question: "What if I need help?",
    answer:
      "We offer email and chat support for all plans. Higher tiers are intended for stronger rollout support, and enterprise customers can work with us on custom onboarding needs.",
  },
];

export function FaqSection() {
  return (
    <section className="px-6 py-24 bg-muted/30" id="faq">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          align="center"
          size="section"
          title="Frequently Asked Questions"
          description="Everything you need to know about Docita"
          className="mb-16"
        />

        <div className="space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-lg border bg-background px-6 py-4 shadow-sm transition-shadow open:shadow-md"
            >
              <summary className="cursor-pointer list-none text-left font-medium outline-none">
                <span className="flex items-center justify-between gap-4">
                  <span>{faq.question}</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <Button asChild variant="outline">
            <a href="/contact">Contact Support</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
