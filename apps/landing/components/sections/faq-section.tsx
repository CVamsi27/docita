"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { useState } from "react";
import { ContactSalesModal } from "@/components/dialogs/contact-sales-modal";

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
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);

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

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="bg-background rounded-lg border px-6 data-[state=open]:shadow-md transition-shadow"
            >
              <AccordionTrigger className="text-left font-medium py-4 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <Button
            variant="outline"
            onClick={() => setShowContactSalesModal(true)}
          >
            Contact Support
          </Button>
        </div>
      </div>
      <ContactSalesModal
        open={showContactSalesModal}
        onOpenChange={setShowContactSalesModal}
      />
    </section>
  );
}
