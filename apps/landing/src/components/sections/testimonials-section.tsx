"use client";

import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";

const testimonials = [
  {
    quote:
      "Switching to Docita was the best decision for my practice. Patient documentation is faster, prescriptions are digital, and I can focus more on actual patient care. My practice has grown by 25% since implementing this system.",
    name: "Dr. Rajesh Kumar",
    title: "General Physician, MBBS, MD",
    location: "Mumbai, Maharashtra",
    image: "/testimonials/doctor-1.jpg",
    rating: 5,
  },
  {
    quote:
      "Managing a pediatric practice with walk-ins was chaotic. Docita's queue management and appointment system brought order to the chaos. Parents love the WhatsApp reminders and the ability to access their child's medical history anytime.",
    name: "Dr. Priya Sharma",
    title: "Pediatrician, MBBS, DCH",
    location: "Delhi NCR",
    image: "/testimonials/doctor-2.jpg",
    rating: 5,
  },
  {
    quote:
      "I was skeptical about going paperless after 15 years of practice. The team helped migrate all our records seamlessly. Now I wonder how I ever managed without digital records. Insurance claims are processed 3x faster with proper ICD-10 coding.",
    name: "Dr. Arun Mehta",
    title: "Orthopedic Surgeon, MS Ortho",
    location: "Bangalore, Karnataka",
    image: "/testimonials/doctor-3.jpg",
    rating: 5,
  },
  {
    quote:
      "The AI-assisted diagnosis suggestions have been incredibly helpful for complex cases. Combined with comprehensive patient histories and lab integration, it's like having a medical assistant that never sleeps. Highly recommended for any modern practice.",
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
    <section className="px-6 py-24 bg-muted/30" id="testimonials">
      <div className="ui-page-shell">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-warning px-4 py-2 text-sm mb-4">
            <Star className="h-4 w-4 text-warning fill-amber-500" />
            <span className="font-medium text-warning dark:text-warning">
              Trusted by 500+ Facilities
            </span>
          </div>
          <SectionHeading
            align="center"
            size="section"
            title="What Doctors Are Saying"
            description="Join thousands of healthcare providers who have transformed their practice with Docita."
            descriptionClassName="mx-auto max-w-2xl"
          />
        </div>

        <div className="relative max-w-4xl mx-auto">
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
