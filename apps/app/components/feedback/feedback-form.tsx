"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";

// List of features to choose from
const AVAILABLE_FEATURES = [
  "Patient Management",
  "Appointments & Scheduling",
  "Queue Management",
  "Prescription Generation",
  "Clinical Documentation",
  "Lab Tests",
  "Invoicing & Billing",
  "Document Management",
  "Analytics & Reports",
  "WhatsApp Integration",
  "Mobile Access",
  "Search & Filters",
  "User Interface",
  "Performance & Speed",
  "Data Import/Export",
  "Templates",
  "Reminders & Notifications",
  "Multi-doctor Support",
  "Custom Fields",
  "Medical Coding (ICD/CPT)",
];

const FEEDBACK_CATEGORIES = [
  { value: "GENERAL", label: "General Feedback" },
  { value: "UI_UX", label: "User Interface & Experience" },
  { value: "PERFORMANCE", label: "Performance Issues" },
  { value: "FEATURES", label: "Feature Requests" },
  { value: "BILLING", label: "Billing & Subscription" },
  { value: "SUPPORT", label: "Support & Help" },
  { value: "OTHER", label: "Other" },
];

export interface FeedbackFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function FeedbackForm({ trigger, onSuccess }: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [overallRating, setOverallRating] = useState(0);
  const [goodFeatures, setGoodFeatures] = useState<string[]>([]);
  const [goodFeaturesReason, setGoodFeaturesReason] = useState("");
  const [badFeatures, setBadFeatures] = useState<string[]>([]);
  const [badFeaturesReason, setBadFeaturesReason] = useState("");
  const [improvementAreas, setImprovementAreas] = useState<string[]>([]);
  const [improvementReason, setImprovementReason] = useState("");
  const [featureRequests, setFeatureRequests] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  const [category, setCategory] = useState("GENERAL");

  const resetForm = () => {
    setStep(1);
    setOverallRating(0);
    setGoodFeatures([]);
    setGoodFeaturesReason("");
    setBadFeatures([]);
    setBadFeaturesReason("");
    setImprovementAreas([]);
    setImprovementReason("");
    setFeatureRequests("");
    setGeneralComments("");
    setCategory("GENERAL");
  };

  const toggleFeature = (
    feature: string,
    list: string[],
    setList: (list: string[]) => void,
  ) => {
    if (list.includes(feature)) {
      setList(list.filter((f) => f !== feature));
    } else {
      setList([...list, feature]);
    }
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast.error("Please provide an overall rating");
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating,
          goodFeatures,
          goodFeaturesReason: goodFeaturesReason || undefined,
          badFeatures,
          badFeaturesReason: badFeaturesReason || undefined,
          improvementAreas,
          improvementReason: improvementReason || undefined,
          featureRequests: featureRequests || undefined,
          generalComments: generalComments || undefined,
          category,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      toast.success("Thank you for your feedback!");
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to submit feedback. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setOverallRating(star)}
          className={cn(
            "p-2 rounded-full transition-all hover:scale-110",
            overallRating >= star
              ? "text-yellow-500"
              : "text-gray-300 hover:text-yellow-400",
          )}
        >
          <Star
            className="h-8 w-8"
            fill={overallRating >= star ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );

  const renderFeatureSelector = (
    label: string,
    icon: React.ReactNode,
    selected: string[],
    setSelected: (list: string[]) => void,
    colorClass: string,
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="text-base">{label}</Label>
      </div>
      <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
        {AVAILABLE_FEATURES.map((feature) => (
          <Badge
            key={feature}
            variant={selected.includes(feature) ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              selected.includes(feature) && colorClass,
            )}
            onClick={() => toggleFeature(feature, selected, setSelected)}
          >
            {selected.includes(feature) ? (
              <Check className="h-3 w-3 mr-1" />
            ) : null}
            {feature}
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Give Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve by sharing your experience. Your feedback is
            valuable!
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-2 rounded-full transition-colors",
                step >= s ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {/* Step 1: Overall Rating */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">
                How would you rate your overall experience?
              </h3>
              {renderStars()}
              <p className="text-sm text-muted-foreground">
                {overallRating === 0 && "Click to rate"}
                {overallRating === 1 && "Poor 😞"}
                {overallRating === 2 && "Fair 😐"}
                {overallRating === 3 && "Good 🙂"}
                {overallRating === 4 && "Very Good 😊"}
                {overallRating === 5 && "Excellent! 🎉"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Feedback Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={overallRating === 0}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Good Features */}
        {step === 2 && (
          <div className="space-y-6">
            {renderFeatureSelector(
              "What features do you like the most?",
              <ThumbsUp className="h-5 w-5 text-green-500" />,
              goodFeatures,
              setGoodFeatures,
              "bg-green-500 hover:bg-green-600",
            )}

            {goodFeatures.length > 0 && (
              <div className="space-y-2">
                <Label>Why do you like these features? (Optional)</Label>
                <Textarea
                  value={goodFeaturesReason}
                  onChange={(e) => setGoodFeaturesReason(e.target.value)}
                  placeholder="Tell us what makes these features great..."
                  className="min-h-20"
                />
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 3: Bad Features & Improvements */}
        {step === 3 && (
          <div className="space-y-6">
            {renderFeatureSelector(
              "Which features need improvement?",
              <ThumbsDown className="h-5 w-5 text-red-500" />,
              badFeatures,
              setBadFeatures,
              "bg-red-500 hover:bg-red-600",
            )}

            {badFeatures.length > 0 && (
              <div className="space-y-2">
                <Label>What&apos;s wrong with these features? (Optional)</Label>
                <Textarea
                  value={badFeaturesReason}
                  onChange={(e) => setBadFeaturesReason(e.target.value)}
                  placeholder="Describe the issues you've encountered..."
                  className="min-h-20"
                />
              </div>
            )}

            {renderFeatureSelector(
              "What areas would you like us to improve?",
              <Lightbulb className="h-5 w-5 text-yellow-500" />,
              improvementAreas,
              setImprovementAreas,
              "bg-yellow-500 hover:bg-yellow-600 text-black",
            )}

            {improvementAreas.length > 0 && (
              <div className="space-y-2">
                <Label>How should we improve these? (Optional)</Label>
                <Textarea
                  value={improvementReason}
                  onChange={(e) => setImprovementReason(e.target.value)}
                  placeholder="Share your suggestions..."
                  className="min-h-20"
                />
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 4: Feature Requests & Comments */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-purple-500" />
                Any new features you&apos;d like to see?
              </Label>
              <Textarea
                value={featureRequests}
                onChange={(e) => setFeatureRequests(e.target.value)}
                placeholder="Describe the features you wish we had..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Any other comments or suggestions?
              </Label>
              <Textarea
                value={generalComments}
                onChange={(e) => setGeneralComments(e.target.value)}
                placeholder="Share anything else on your mind..."
                className="min-h-[100px]"
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium">Feedback Summary</h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Rating:</span>{" "}
                  {"⭐".repeat(overallRating)}
                </p>
                {goodFeatures.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Liked:</span>{" "}
                    {goodFeatures.slice(0, 3).join(", ")}
                    {goodFeatures.length > 3 &&
                      ` +${goodFeatures.length - 3} more`}
                  </p>
                )}
                {badFeatures.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Issues:</span>{" "}
                    {badFeatures.slice(0, 3).join(", ")}
                    {badFeatures.length > 3 &&
                      ` +${badFeatures.length - 3} more`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Feedback
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Dialog version for external control (used by FloatingFeedbackButton)
export interface FeedbackFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackFormDialog({
  open,
  onOpenChange,
}: FeedbackFormDialogProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [overallRating, setOverallRating] = useState(0);
  const [goodFeatures, setGoodFeatures] = useState<string[]>([]);
  const [goodFeaturesReason, setGoodFeaturesReason] = useState("");
  const [badFeatures, setBadFeatures] = useState<string[]>([]);
  const [badFeaturesReason, setBadFeaturesReason] = useState("");
  const [improvementAreas, setImprovementAreas] = useState<string[]>([]);
  const [improvementReason, setImprovementReason] = useState("");
  const [featureRequests, setFeatureRequests] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  const [category, setCategory] = useState("GENERAL");

  const resetForm = () => {
    setStep(1);
    setOverallRating(0);
    setGoodFeatures([]);
    setGoodFeaturesReason("");
    setBadFeatures([]);
    setBadFeaturesReason("");
    setImprovementAreas([]);
    setImprovementReason("");
    setFeatureRequests("");
    setGeneralComments("");
    setCategory("GENERAL");
  };

  const toggleFeature = (
    feature: string,
    list: string[],
    setList: (list: string[]) => void,
  ) => {
    if (list.includes(feature)) {
      setList(list.filter((f) => f !== feature));
    } else {
      setList([...list, feature]);
    }
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast.error("Please provide an overall rating");
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating,
          goodFeatures,
          goodFeaturesReason,
          badFeatures,
          badFeaturesReason,
          improvementAreas,
          improvementReason,
          featureRequests,
          generalComments,
          category,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit feedback");

      toast.success("Thank you for your feedback!", {
        description: "Your input helps us improve Docita.",
      });
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("Failed to submit feedback", {
        description: "Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve Docita by sharing your thoughts. Your feedback is
            valuable! (Step {step}/4)
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Overall Rating */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <Label className="text-lg">
                How would you rate your overall experience?
              </Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setOverallRating(rating)}
                    className="transition-all"
                  >
                    <Star
                      className={cn(
                        "h-10 w-10 transition-all",
                        rating <= overallRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground hover:text-yellow-400",
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {overallRating === 0 && "Click to rate"}
                {overallRating === 1 && "Poor - Needs significant improvement"}
                {overallRating === 2 && "Fair - Has some issues"}
                {overallRating === 3 && "Good - Meets expectations"}
                {overallRating === 4 && "Great - Exceeds expectations"}
                {overallRating === 5 && "Excellent - Outstanding experience"}
              </p>
            </div>

            <div className="space-y-3">
              <Label>Feedback Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={overallRating === 0}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: What you like */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-green-600" />
                <Label className="text-lg">
                  What do you like about Docita?
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Select features that work well for you (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_FEATURES.map((feature) => (
                  <Badge
                    key={feature}
                    variant={
                      goodFeatures.includes(feature) ? "default" : "outline"
                    }
                    className={cn(
                      "cursor-pointer transition-all",
                      goodFeatures.includes(feature) &&
                        "bg-green-600 hover:bg-green-700",
                    )}
                    onClick={() =>
                      toggleFeature(feature, goodFeatures, setGoodFeatures)
                    }
                  >
                    {goodFeatures.includes(feature) && (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    {feature}
                  </Badge>
                ))}
              </div>
              {goodFeatures.length > 0 && (
                <div className="space-y-2">
                  <Label>What makes these features great? (optional)</Label>
                  <Textarea
                    placeholder="Tell us more about what you like..."
                    value={goodFeaturesReason}
                    onChange={(e) => setGoodFeaturesReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 3: What needs improvement */}
        {step === 3 && (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ThumbsDown className="h-5 w-5 text-red-600" />
                <Label className="text-lg">What could be improved?</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Select features that need work (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_FEATURES.map((feature) => (
                  <Badge
                    key={feature}
                    variant={
                      badFeatures.includes(feature) ? "default" : "outline"
                    }
                    className={cn(
                      "cursor-pointer transition-all",
                      badFeatures.includes(feature) &&
                        "bg-red-600 hover:bg-red-700",
                    )}
                    onClick={() =>
                      toggleFeature(feature, badFeatures, setBadFeatures)
                    }
                  >
                    {badFeatures.includes(feature) && (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    {feature}
                  </Badge>
                ))}
              </div>
              {badFeatures.length > 0 && (
                <div className="space-y-2">
                  <Label>What issues have you encountered? (optional)</Label>
                  <Textarea
                    placeholder="Tell us about the problems..."
                    value={badFeaturesReason}
                    onChange={(e) => setBadFeaturesReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                <Label className="text-lg">Areas for improvement</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_FEATURES.map((feature) => (
                  <Badge
                    key={feature}
                    variant={
                      improvementAreas.includes(feature) ? "default" : "outline"
                    }
                    className={cn(
                      "cursor-pointer transition-all",
                      improvementAreas.includes(feature) &&
                        "bg-yellow-600 hover:bg-yellow-700",
                    )}
                    onClick={() =>
                      toggleFeature(
                        feature,
                        improvementAreas,
                        setImprovementAreas,
                      )
                    }
                  >
                    {improvementAreas.includes(feature) && (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    {feature}
                  </Badge>
                ))}
              </div>
              {improvementAreas.length > 0 && (
                <div className="space-y-2">
                  <Label>How can we improve these? (optional)</Label>
                  <Textarea
                    placeholder="Share your suggestions..."
                    value={improvementReason}
                    onChange={(e) => setImprovementReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 4: Feature requests & final comments */}
        {step === 4 && (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <Label className="text-lg">Feature Requests</Label>
              </div>
              <Textarea
                placeholder="What new features would you like to see in Docita?"
                value={featureRequests}
                onChange={(e) => setFeatureRequests(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <Label className="text-lg">Additional Comments</Label>
              </div>
              <Textarea
                placeholder="Anything else you'd like to share?"
                value={generalComments}
                onChange={(e) => setGeneralComments(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Feedback
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
