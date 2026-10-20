import { useState } from "react";
import { AppPageScaffold, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, PageHeader } from "@workspace/ui/components";
import { AlertCircle, CheckCircle, Clock, Eye, MessageSquare, RefreshCw, Star } from "lucide-react";
import { formatDateTime, enIN } from "@workspace/utils";
import { useApiQuery } from "@/hooks/use-api-query";

interface Feedback { id: string; overallRating: number; category: string; status: string; generalComments?: string; goodFeatures: string[]; badFeatures: string[]; improvementAreas: string[]; user: { name: string }; clinic: { name: string }; createdAt: string; adminNotes?: string; }
interface FeedbackStats { total: number; averageRating: number; recentFeedback: number; byStatus: Record<string, number>; topGoodFeatures: Array<{ feature: string; count: number }>; topBadFeatures: Array<{ feature: string; count: number }>; topImprovementAreas: Array<{ feature: string; count: number }>; }

function RatingStars({ rating }: { rating: number }) {
  return <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => (
    <Star key={star} className={`h-4 w-4 ${rating >= star ? "text-warning fill-warning" : "text-muted-foreground"}`} />
  ))}</div>;
}

export function FeedbackPage() {
  const {
    data: feedbacks = [],
    isLoading: feedbacksLoading,
    isError: feedbacksError,
    refetch: refetchFeedbacks,
  } = useApiQuery<Feedback[]>("/api/internal/feedback/all");
  const { data: stats, isLoading: statsLoading } = useApiQuery<FeedbackStats>("/api/internal/feedback/stats");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const loading = feedbacksLoading || statsLoading;

  return (
    <AppPageScaffold header={<PageHeader title={<span className="flex items-center gap-2"><MessageSquare className="h-7 w-7" /> Feedback Portal</span>}
      description="View and manage user feedback from all clinics" size="compact"
      actions={<Button variant="outline" onClick={() => { void refetchFeedbacks(); }}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>} />}>
      <DataState
        status={feedbacksError ? "error" : loading ? "loading" : "success"}
        loadingMessage="Loading feedback..."
        errorMessage="We could not load user feedback. Please try again."
        onRetry={() => { void refetchFeedbacks(); }}
      >
        {stats && (
          <div className="grid gap-4 md:grid-cols-5 mb-6">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><MessageSquare className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">{stats.total}</div><p className="text-xs text-muted-foreground">{stats.recentFeedback} recent</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg Rating</CardTitle><Star className="h-4 w-4 text-warning" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">{stats.averageRating.toFixed(1)}</div><RatingStars rating={Math.round(stats.averageRating)} /></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">New</CardTitle><AlertCircle className="h-4 w-4 text-info" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums text-info">{stats.byStatus.NEW || 0}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">In Progress</CardTitle><Clock className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums text-primary">{stats.byStatus.IN_PROGRESS || 0}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Resolved</CardTitle><CheckCircle className="h-4 w-4 text-success" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums text-success">{stats.byStatus.RESOLVED || 0}</div></CardContent></Card>
          </div>
        )}

        <Card><CardHeader><CardTitle>All Feedback</CardTitle><CardDescription>{feedbacks.length} feedback entries</CardDescription></CardHeader>
          <CardContent>
            {feedbacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground"><MessageSquare className="h-10 w-10 mb-4" /><p>No feedback yet</p></div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((fb) => (
                  <div key={fb.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <RatingStars rating={fb.overallRating} />
                        <Badge variant="outline">{fb.status}</Badge>
                        <Badge variant="outline">{fb.category}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">{fb.user.name}</span>
                        <span className="text-muted-foreground">{fb.clinic.name}</span>
                        <span className="text-muted-foreground">{formatDateTime(fb.createdAt, undefined, { locale: enIN })}</span>
                      </div>
                      {fb.generalComments && <p className="text-sm text-muted-foreground line-clamp-2">{fb.generalComments}</p>}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" aria-label={`View feedback: ${fb.user.name}`} onClick={() => { setSelectedFeedback(fb); }}><Eye className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </DataState>

      <Dialog open={!!selectedFeedback} onOpenChange={() => { setSelectedFeedback(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Feedback Details</DialogTitle><DialogDescription>
            {selectedFeedback?.user.name} - {selectedFeedback?.clinic.name}</DialogDescription></DialogHeader>
          {selectedFeedback && <div className="space-y-4">
            <RatingStars rating={selectedFeedback.overallRating} />
            <p className="text-sm">{selectedFeedback.generalComments}</p>
            {selectedFeedback.goodFeatures.length > 0 && <div><p className="font-medium mb-1">Liked Features</p>{selectedFeedback.goodFeatures.map((f) => <Badge key={f} variant="secondary" className="mr-1">{f}</Badge>)}</div>}
          </div>}
        </DialogContent>
      </Dialog>
    </AppPageScaffold>
  );
}
