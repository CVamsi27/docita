"use client";

import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";

const testimonials = [
  {
    quote:
      "We moved our OPD workflow out of paper files and WhatsApp into one place. Prescriptions are legible, billing is faster, and follow-ups actually go out on time. Staff picked it up quickly.",
    name: "Dr. Rajesh Kumar",
    title: "General Physician, MBBS, MD",
    location: "Mumbai, Maharashtra",
    image: "/testimonials/doctor-1.jpg",
    rating: 5,
  },
  {
    quote:
      "Our reception stopped juggling registers and calls. The queue + appointment flow is simple, and sharing prescriptions on WhatsApp from the visit screen saves time every day.",
    name: "Dr. Priya Sharma",
    title: "Pediatrician, MBBS, DCH",
    location: "Delhi NCR",
    image: "/testimonials/doctor-2.jpg",
    rating: 5,
  },
  {
    quote:
      "I was hesitant to go paperless after years of files. Migration was straightforward, and now every visit starts with the right context—previous prescriptions, reports, and notes are all in one timeline.",
    name: "Dr. Arun Mehta",
    title: "Orthopedic Surgeon, MS Ortho",
    location: "Bangalore, Karnataka",
    image: "/testimonials/doctor-3.jpg",
    rating: 5,
  },
  {
    quote:
      "For a small clinic, the biggest win is fewer handoff mistakes. Consultation notes, prescription, bill, and follow-up instructions stay connected, so the team doesn’t miss steps.",
    name: "Dr. Sunita Patel",
    title: "Internal Medicine, MBBS, MD",
    location: "Ahmedabad, Gujarat",
    image: "/testimonials/doctor-4.jpg",
    rating: 5,
  },
];

export function TestimonialsSection() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="landing-section landing-section-muted" id="testimonials">
      <div className="ui-page-shell">
        <div className="text-center mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-sm">
            <Star className="h-4 w-4 text-warning fill-amber-500" />
            <span className="font-medium text-foreground">
              Built for 1-5 doctor clinics
            </span>
          </div>
          <SectionHeading
            align="center"
            size="section"
            title="What Doctors Are Saying"
            description="Practical workflows for OPD, billing, records, and follow-ups—without the admin overhead."
            descriptionClassName="mx-auto max-w-2xl"
          />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <Card
            className="relative overflow-hidden shadow-lg"
            density="spacious"
          >
            <Quote className="absolute top-6 left-6 h-12 w-12 text-primary/10" />

            <CardContent className="relative z-10 px-8 md:px-12">
              <p className="text-xl md:text-2xl text-foreground mb-8 leading-relaxed">
                &ldquo;{testimonials[activeTestimonial].quote}&rdquo;
              </p>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xl">
                    {testimonials[activeTestimonial].name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {testimonials[activeTestimonial].name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonials[activeTestimonial].title},{" "}
                      {testimonials[activeTestimonial].location}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  {[...Array(testimonials[activeTestimonial].rating)].map(
                    (_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-warning fill-amber-500"
                      />
                    ),
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              onClick={() =>
                setActiveTestimonial(
                  (prev) =>
                    (prev - 1 + testimonials.length) % testimonials.length,
                )
              }
              className="rounded-full bg-muted hover:bg-muted/80"
              size="icon-sm"
              variant="ghost"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === activeTestimonial
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <Button
              onClick={() =>
                setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
              }
              className="rounded-full bg-muted hover:bg-muted/80"
              size="icon-sm"
              variant="ghost"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
