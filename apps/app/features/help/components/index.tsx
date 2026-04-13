"use client";

import { FC, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Mail,
  MessageCircle,
  Search,
  Video,
} from "lucide-react";

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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">How can we help you?</h1>
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {HELP_CATEGORIES.map((cat) => (
          <Card
            key={cat.id}
            className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer group"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Video Tutorials</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Watch step-by-step video guides
            </p>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Watch Videos
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Live Chat</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Chat with our support team
            </p>
            <Button variant="outline" size="sm" className="gap-2">
              Start Chat
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Email Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get help via email
            </p>
            <Button variant="outline" size="sm" className="gap-2">
              Contact Us
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
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Frequently Asked Questions</CardTitle>
        <CardDescription>Quick answers to common questions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayFaqs.map((faq, i) => (
          <div key={i} className="p-4 rounded-lg bg-muted/50 space-y-2">
            <h4 className="font-medium">{faq.question}</h4>
            <p className="text-sm text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default { HelpCenter, FAQSection };
