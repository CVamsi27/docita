"use client";

import { FC, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { SearchInput } from "@workspace/ui/components/form/search-input";
import { WhatsAppButton } from "@/components/whatsapp/whatsapp-button";
import {
  getSupportPhoneNumber,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_MESSAGE_DEFAULT,
} from "@/lib/constants/support-contact";
import {
  BookOpen,
  ChevronRight,
  HelpCircle,
  Mail,
  MessageCircle,
} from "lucide-react";

const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Docita support")}`;

const HELP_CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    articles: 5,
  },
  {
    id: "patients",
    title: "Patient Management",
    icon: HelpCircle,
    articles: 8,
  },
  { id: "appointments", title: "Appointments", icon: HelpCircle, articles: 6 },
  { id: "billing", title: "Billing & Invoices", icon: HelpCircle, articles: 4 },
  { id: "settings", title: "Settings & Config", icon: HelpCircle, articles: 7 },
];

export const HelpCenter: FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return HELP_CATEGORIES;
    return HELP_CATEGORIES.filter((cat) => cat.title.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="ui-page-title text-[var(--fs-2xl)] sm:text-[var(--fs-3xl)]">
          How can we help you?
        </h1>
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          placeholder="Enter topic"
          ariaLabel="Search help articles"
        />
      </div>

      {filteredCategories.length === 0 ? (
        <div className="text-center text-[var(--fs-sm)] text-muted-foreground">
          No help topics match your search.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => (
          <Card
            key={cat.id}
            className="ui-card-surface hover:shadow-md transition-shadow duration-150 cursor-pointer group"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary transition-colors group-hover:bg-foreground group-hover:text-background">
                  <cat.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{cat.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {cat.articles} articles
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="ui-card-surface">
          <CardHeader>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">WhatsApp</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Message our support team on WhatsApp
            </p>
            <WhatsAppButton
              phoneNumber={getSupportPhoneNumber()}
              message={SUPPORT_WHATSAPP_MESSAGE_DEFAULT}
              variant="outline"
              size="sm"
              label="Open WhatsApp"
            />
          </CardContent>
        </Card>

        <Card className="ui-card-surface">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Email support</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get help via email at {SUPPORT_EMAIL}
            </p>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href={SUPPORT_MAILTO}>
                <Mail className="h-4 w-4" aria-hidden />
                Contact Us
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const FAQSection: FC<{
  faqs?: Array<{ question: string; answer: string }>;
}> = ({ faqs = [] }) => {
  const defaultFaqs = [
    {
      question: "How do I add a new patient?",
      answer: "Navigate to Patients and click 'Add Patient'",
    },
    {
      question: "How do I schedule an appointment?",
      answer: "Go to Appointments and click 'Schedule'",
    },
    {
      question: "How do I generate an invoice?",
      answer: "After a consultation, click 'Generate Invoice'",
    },
  ];

  const displayFaqs = faqs.length > 0 ? faqs : defaultFaqs;

  return (
    <Card className="ui-card-surface">
      <CardHeader>
        <CardTitle>Frequently Asked Questions</CardTitle>
        <CardDescription>Quick answers to common questions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayFaqs.map((faq, i) => (
          <div key={i} className="ui-panel-muted p-4 space-y-2">
            <h4 className="font-medium">{faq.question}</h4>
            <p className="text-sm text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default { HelpCenter, FAQSection };
