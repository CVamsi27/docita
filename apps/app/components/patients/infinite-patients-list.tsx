"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { apiHooks } from "@/lib/api-hooks";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Users } from "lucide-react";
import { format } from "date-fns";

interface InfinitePatientsListProps {
  searchQuery?: string;
  onPatientSelect?: (patientId: string) => void;
}

/**
 * Infinite scrolling patient list with cursor pagination
 * ✅ OPTIMIZATION: Uses cursor pagination for O(1) performance
 * ✅ OPTIMIZATION: Automatic infinite scroll with intersection observer
 * ✅ OPTIMIZATION: React Query caching with 5-minute staleTime
 * 
 * @example
 * <InfinitePatientsList searchQuery={search} onPatientSelect={handleSelect} />
 */
export function InfinitePatientsList({
  searchQuery,
  onPatientSelect,
}: InfinitePatientsListProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = apiHooks.useInfinitePatients({
    limit: 50,
    search: searchQuery,
  });

  // Intersection observer for automatic loading
  const { ref: bottomRef, inView } = useInView({
    threshold: 0,
    rootMargin: "100px", // Load more when 100px from bottom
  });

  // Auto-fetch when scrolled to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated data
  const patients = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.count ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">
            Failed to load patients: {(error as Error).message}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (patients.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? "No patients found matching your search" : "No patients yet"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="text-sm text-muted-foreground">
        Showing {patients.length} of {totalCount} patients
      </div>

      {/* Patient cards */}
      <div className="grid gap-4">
        {patients.map((patient) => (
          <Card
            key={patient.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => patient.id && onPatientSelect?.(patient.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>
                    {patient.firstName?.[0]}
                    {patient.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {patient.dateOfBirth && (
                      <span>
                        {format(new Date(patient.dateOfBirth), "MMM d, yyyy")}
                      </span>
                    )}
                    {patient.phoneNumber && <span>{patient.phoneNumber}</span>}
                  </div>
                </div>

                {patient.bloodGroup && (
                  <div className="text-sm font-medium px-2 py-1 bg-secondary rounded">
                    {patient.bloodGroup}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading indicator at bottom */}
      <div ref={bottomRef} className="py-4">
        {isFetchingNextPage && (
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading more patients...
            </span>
          </div>
        )}
        
        {!hasNextPage && patients.length > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No more patients to load
          </p>
        )}
      </div>

      {/* Manual load more button (fallback) */}
      {hasNextPage && !isFetchingNextPage && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
