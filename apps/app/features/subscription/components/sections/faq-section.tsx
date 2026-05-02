import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";

export function FaqSection() {
  const faqs = [
    {
      question: "Can I switch plans later?",
      answer:
        "Yes, you can upgrade or downgrade your plan at any time. If you upgrade, the prorated difference will be charged immediately. If you downgrade, the credit will be applied to your next billing cycle.",
    },
    {
      question: "Is there a long-term contract?",
      answer:
        "No, you can pay monthly and cancel at any time. We also offer annual plans with significant discounts if you prefer to commit for a year.",
    },
    {
      question: "What happens to my data if I cancel?",
      answer:
        "We retain your data for 90 days after cancellation, giving you ample time to export your patient records. After that period, data is permanently deleted for security.",
    },
    {
      question: "Do you offer discounts for non-profits?",
      answer:
        "Yes, we offer special pricing for non-profit and charitable clinics. Please contact our sales team with your organization details.",
    },
    {
      question: "Is my payment information secure?",
      answer:
        "Absolutely. All payments are processed through Razorpay, a PCI-DSS compliant payment gateway. We never store your card details on our servers.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto w-full">
      <h2 className="ui-section-title mb-8 text-center text-[var(--fs-2xl)]">
        Frequently Asked Questions
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-left">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
