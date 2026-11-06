import {
  ArrowRight,
  CalendarDays,
  Download,
  Files,
  MessageCircle,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { PageContainer } from "@workspace/ui/components/layout/page-container";
import { Section } from "@workspace/ui/components/layout/section";

import { PracticePreview } from "@/components/sections/practice-preview";
import { VisitPreview } from "@/components/sections/visit-preview";

/** Static illustrations contain synthetic examples and never load patient data. */
export function EditorialHomepage({ appUrl }: { appUrl: string }) {
  return (
    <PageContainer className="editorial-shell">
      <div id="editorial-home">
        <Section contentClassName="editorial-content" className="hero wrap">
          <div>
            <MicroLabel as="p" className="eyebrow">
              Clinic management software for India
            </MicroLabel>
            <h1>
              A calmer <br />
              clinic day.
            </h1>
            <p className="lede">
              Appointments, consultations, prescriptions and billing—connected
              from reception to follow-up.
            </p>
            <SetupActions appUrl={appUrl} />
            <p className="small">
              One workspace for reception and clinicians.
              <br />
              Start with the workflows your practice needs.
            </p>
          </div>
          <div>
            <PracticePreview />
            <div className="capture-note">
              Illustrative demo workspace · Sample data
            </div>
          </div>
        </Section>
        <div className="capabilities wrap">
          <article>
            <CategoryAvatar
              className="icon"
              tone="primary"
              size="lg"
              icon={<CalendarDays aria-hidden="true" strokeWidth={1.5} />}
            />
            <h3>Appointments, your way</h3>
            <p>Walk-ins and bookings in one organised schedule.</p>
          </article>
          <article>
            <CategoryAvatar
              className="icon"
              tone="primary"
              size="lg"
              icon={<Files aria-hidden="true" strokeWidth={1.5} />}
            />
            <h3>Consultations connected</h3>
            <p>Records, notes and prescriptions in the same workspace.</p>
          </article>
          <article>
            <CategoryAvatar
              className="icon"
              tone="primary"
              size="lg"
              icon={<Receipt aria-hidden="true" strokeWidth={1.5} />}
            />
            <h3>Billing alongside care</h3>
            <p>Create invoices and keep payments with the visit.</p>
          </article>
          <article>
            <CategoryAvatar
              className="icon"
              tone="primary"
              size="lg"
              icon={<MessageCircle aria-hidden="true" strokeWidth={1.5} />}
            />
            <h3>Stay in touch</h3>
            <p>Consent-aware WhatsApp messages and follow-ups.</p>
          </article>
        </div>
        <Section
          contentClassName="editorial-content"
          id="product"
          className="workflow wrap"
        >
          <MicroLabel as="p" className="eyebrow">
            A connected visit workflow
          </MicroLabel>
          <h2>From check-in to follow-up, seamlessly.</h2>
          <p className="workflow-intro">
            A simple, connected flow for everyday clinic work.
          </p>
          <div className="stages">
            <article className="stage">
              <div className="stage-title">
                <span className="number">1</span>
                <h3>Check in</h3>
              </div>
              <p>
                See today's queue, manage appointments and keep the next patient
                in view.
              </p>
              <VisitPreview stage="check-in" />
            </article>
            <article className="stage">
              <div className="stage-title">
                <span className="number">2</span>
                <h3>Consult</h3>
              </div>
              <p>
                Keep patient context open while you record notes, prescribe and
                plan the next step.
              </p>
              <VisitPreview stage="consult" />
            </article>
            <article className="stage">
              <div className="stage-title">
                <span className="number">3</span>
                <h3>Close the visit</h3>
              </div>
              <p>
                Create the bill, share visit documents and arrange follow-ups
                with patient consent.
              </p>
              <VisitPreview stage="close" />
            </article>
          </div>
        </Section>
        <Section
          contentClassName="editorial-content"
          id="pricing"
          className="pricing wrap"
        >
          <div>
            <MicroLabel as="p" className="eyebrow">
              Pricing
            </MicroLabel>
            <h2>Find the plan that fits your clinic.</h2>
            <p>Compare software plans and guided setup.</p>
          </div>
          <Button asChild variant="outline" size="lg" className="button">
            <a href="/pricing">
              View pricing <ArrowRight aria-hidden="true" strokeWidth={1.5} />
            </a>
          </Button>
        </Section>
        <Section contentClassName="editorial-content" className="close wrap">
          <div>
            <MicroLabel as="p" className="eyebrow">
              Get started
            </MicroLabel>
            <h2>
              Your whole team,
              <br />
              on the same page.
            </h2>
            <p>
              See how Docita connects reception, clinical work and billing in
              one visit.
            </p>
            <SetupActions appUrl={appUrl} />
          </div>
          <div className="close-right">
            <div className="trust-item">
              <ShieldCheck aria-hidden="true" strokeWidth={1.5} />
              <div>
                Role-based access<span>Reception, clinicians and admins.</span>
              </div>
            </div>
            <div className="trust-item">
              <MessageCircle aria-hidden="true" strokeWidth={1.5} />
              <div>
                Patient communication preferences
                <span>Consent belongs in the follow-up workflow.</span>
              </div>
            </div>
            <div className="trust-item">
              <Download aria-hidden="true" strokeWidth={1.5} />
              <div>
                Data export<span>Keep access to your practice's records.</span>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </PageContainer>
  );
}

function SetupActions({ appUrl }: { appUrl: string }) {
  return (
    <div className="actions">
      <Button asChild variant="primary" size="lg" className="button primary">
        <a href={`${appUrl}/onboarding`}>
          Start clinic setup <ArrowRight aria-hidden="true" strokeWidth={1.5} />
        </a>
      </Button>
      <Button asChild variant="outline" size="lg" className="button">
        <a href="/contact">Book a demo</a>
      </Button>
    </div>
  );
}
