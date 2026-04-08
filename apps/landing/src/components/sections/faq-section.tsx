import { Button } from "@workspace/ui/components/button";

const faqs = [
  {
    question: "Do I need any special hardware?",
    answer:
      "No. Docita works on any computer, tablet, or smartphone with a modern web browser. No installation required.",
  },
  {
    question: "Is my patient data secure?",
    answer:
      "Yes. We use banking-grade 256-bit encryption and comply with HIPAA and local data protection regulations.",
  },
  {
    question: "Can I import my existing patient data?",
    answer:
      "Absolutely. We offer easy bulk import tools for Excel/CSV files, and our support team can help you migrate from other software.",
  },
  {
    question: "How does the pricing work?",
    answer:
      "Each paid plan includes a base quota of consultations, users, WhatsApp messages, and plan-specific limits. Your flat monthly fee covers that quota. If you go beyond it, extra usage is billed at a per-unit rate at the start of the next month. Annual subscribers still get overage billed monthly, not at year-end. No hard limits, no service interruptions. Every plan starts with a 14-day free trial, no credit card required.",
  },
  {
    question: "What happens if I exceed my plan limits?",
    answer:
      "Nothing stops — Docita keeps working. We meter your usage automatically. At the start of each month we calculate any overage from the prior month and add it to your next invoice. Higher tiers have lower per-unit rates. You can see the exact rates for your currency in the pricing section above, or upgrade to a higher tier to reduce per-unit costs.",
  },
  {
    question: "What if I need help?",
    answer:
      "We offer email and chat support for all plans. Enterprise plans include a dedicated account manager and priority phone support.",
  },
];

export function FaqSection() {
  return (
    <section className="px-6 py-24 bg-muted/30" id="faq">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Docita
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-lg border bg-background px-6 py-4 shadow-sm transition-shadow open:shadow-md"
            >
              <summary className="cursor-pointer list-none text-left font-medium outline-none">
                <span className="flex items-center justify-between gap-4">
                  <span>{faq.question}</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
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
