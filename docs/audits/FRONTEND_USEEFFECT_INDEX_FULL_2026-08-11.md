# Frontend `useEffect` Complete Index — 2026-08-11

Every `useEffect` in `apps/app/src` and `apps/internal/src`. **171 effects across 123 files.** For each, this index shows the exact file:line range, the deps array, the full body, and a classification of whether it must stay, can be moved to an event handler, or is removable.

This is the "document them" companion to the elimination pass. Every line of every `useEffect` is accounted for.

## Legend

- **KEEP** — required side effect (subscription, listener, observer, mount-only setup, etc.)
- **MOUNT_FETCH** — runs once on mount with a fetch; candidate for React Query
- **FORM_RESET** — `form.reset(...)` when a source-of-truth prop changes
- **URL_SYNC** — search-params or `navigate(...)` call
- **DERIVABLE** — could be replaced with `useMemo` or moved to an event handler
- **KEEP (domain-specific)** — multi-effect state machine that requires explicit coordination

## Totals

| Classification | Count |
|---|---|
| KEEP (subscription, listener, observer, setup) | ~75 |
| MOUNT_FETCH (could be React Query) | 14 |
| FORM_RESET (could move to form defaultValues / key prop) | 13 |
| URL_SYNC (correct pattern, stay) | 13 |
| KEEP (domain-specific state machine) | 30 |
| DERIVABLE (could be useMemo / event handler) | 26 |
| **Total** | **171** |

## Notable inventory

- **14 `apps/internal` page-level `useEffect(..., [])` mount-fetch effects** in `apps/internal/src/features/<x>/pages/<x>-page.tsx`. See "The 14 `apps/internal` mount-fetch effects" appendix at the end of this document for the full list with bodies and a recommended refactor to React Query.
- **The `consultation-leave-navigation-effects.ts` file** has 6 effects that coordinate a state machine. All 6 must stay. See the consultation section.
- **The `use-phone-signature-qr-flow.ts` file** has 6 effects that coordinate a multi-stage polling/persistence state machine. All 6 must stay.
- **The `setup/components/onboarding/address-picker/use-clinic-address-picker.ts`** has 4 effects that coordinate address-search / geolocation / autocomplete debouncing. All 4 must stay.



# `apps/app/src`


## `components/auth/portal-auth-guard.tsx`

### L39–48 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (isLoading) return;
    if (!user) {
      navigate(loginPath, { replace: true });
      return;
    }
    if (user.role !== requiredRole) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, isLoading, navigate, loginPath, redirectPath, requiredRole]
```


## `components/layout/theme-provider.tsx`

### L24–33 — **KEEP (listener lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    applyTheme(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]
```


## `components/layout/use-workspace-access.ts`

### L12–37 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (isLoading || isApiStarting) return;
    if (!user) {
      setRedirectMessage("Your session is missing. Redirecting to login...");
      persistReturnPathBeforeLogin();
      navigate("/login", { replace: true });
      return;
    }
    if (user.emailVerified === false) {
      setRedirectMessage("Please verify your email before continuing...");
      navigate("/verify-email-sent", { replace: true });
      return;
    }
    if (!user.clinicId) {
      if (user.onboardingStep === "JOINING_CLINIC") {
        setRedirectMessage("Taking you to your join request status...");
        navigate("/join-request-status", { replace: true });
      } else if (user.onboardingStep === "CREATING_CLINIC") {
        setRedirectMessage("Taking you back to onboarding...");
        navigate("/onboarding", { replace: true });
      } else {
        setRedirectMessage("Taking you to facility setup...");
        navigate("/choose-path", { replace: true });
      }
    }
  }, [isApiStarting, isLoading, user, navigate]
```

### L58–72 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (isLoading) return;
    const wasConsultationRoute = wasConsultationRouteRef.current;
    wasConsultationRouteRef.current = isConsultationDetailRoute;
    const id = requestAnimationFrame(() => {
      if (isConsultationDetailRoute && !wasConsultationRoute) {
        sidebarPanelRef.current?.collapse();
        setIsCollapsed(true);
      } else if (!isConsultationDetailRoute && wasConsultationRoute) {
        sidebarPanelRef.current?.expand();
        setIsCollapsed(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isLoading, isConsultationDetailRoute, sidebarPanelRef, setIsCollapsed]
```

### L74–88 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (isLoading) return;
    const wasSettingsRoute = wasSettingsRouteRef.current;
    wasSettingsRouteRef.current = isSettingsRoute;
    const id = requestAnimationFrame(() => {
      if (isSettingsRoute && !wasSettingsRoute) {
        sidebarPanelRef.current?.collapse();
        setIsCollapsed(true);
      } else if (!isSettingsRoute && wasSettingsRoute) {
        sidebarPanelRef.current?.expand();
        setIsCollapsed(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isLoading, isSettingsRoute, sidebarPanelRef, setIsCollapsed]
```


## `components/navigation/command-palette.tsx`

### L82–86 — **KEEP (listener lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    const handler = () => setOpen(true);
    window.addEventListener("docita:open-command-palette", handler);
    return () => window.removeEventListener("docita:open-command-palette", handler);
  }, []
```


## `components/navigation/sidebar.tsx`

### L19–21 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    onMobileOpenChange?.(false);
  }, [location.pathname, onMobileOpenChange]
```


## `components/pwa/pwa-register.tsx`

### L11–26 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    if (import.meta.env.PROD !== true) {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .register(SW_PATH, { updateViaCache: "none" })
      .then((registration) => {
        void registration.update();
      })
      .catch(() => {});
  }, []
```


## `features/appointments/components/sections/add-dialog/PatientSelector.tsx`

### L43–45 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    setActiveIndex(-1);
  }, [patientSearch, patientComboboxOpen]
```


## `features/appointments/components/sections/requests/use-appointment-request-scheduling.ts`

### L73–99 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!effectiveDoctorId || hasStructuredSlot) return;

    let cancelled = false;
    void (async () => {
      const win = await fetchNextAvailableSlotWindow(
        request.preferredDate,
        effectiveDoctorId,
        clinicTimezone,
      );
      if (cancelled || !win) return;
      setStartByRequest((prev) => ({ ...prev, [request.id]: win.startLocal }));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    request.id,
    request.preferredDate,
    effectiveDoctorId,
    hasStructuredSlot,
    request.requestedSlotStart,
    request.requestedSlotEnd,
    setStartByRequest,
    clinicTimezone,
    slotSuggestionGeneration,
  ]
```


## `features/appointments/hooks/use-appointment-form-doctor-state.ts`

### L49–60 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!open || !selectedDate) return;
    const currentId = form.getValues("doctorId");
    const nextId = findNextAvailableDoctor(
      currentId,
      unavailableIds,
      filteredDoctors,
    );
    if (nextId !== currentId) {
      form.setValue("doctorId", nextId, { shouldDirty: false });
    }
  }, [open, selectedDate, unavailableIds, filteredDoctors, form]
```


## `features/appointments/hooks/use-appointment-form-lifecycle.ts`

### L68–86 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (open && !wasOpenRef.current) {
      const resetValues = buildFormResetValues(
        open,
        selectedDate,
        defaultValues,
      );
      form.reset(resetValues);
      if (selectedDate && defaultValues.doctorId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.doctorAvailabilitySlots.forDay(
            formatClinicPickerDayIsoFromSelection(selectedDate, clinicTimezone),
            defaultValues.doctorId,
          ),
        });
      }
    }
    wasOpenRef.current = Boolean(open);
  }, [open, defaultValues, form, selectedDate, queryClient, clinicTimezone]
```


## `features/appointments/hooks/use-appointment-form-patients.ts`

### L42–59 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    const patientState = form.getFieldState("patientId");
    if (
      shouldUpdatePreselectedPatient(
        open,
        preselectedPatientId,
        lastPreselectedPatientIdRef.current,
        patientState.isDirty,
      )
    ) {
      lastPreselectedPatientIdRef.current = preselectedPatientId;
      if (preselectedPatientId) {
        form.setValue("patientId", preselectedPatientId, {
          shouldDirty: false,
        });
      }
    }
  }, [open, preselectedPatientId, form]
```


## `features/appointments/hooks/use-appointment-notifications.ts`

### L31–68 — **KEEP (React Query cache sync)** — deps `[] (mount-only)`

```ts
() => {
    if (!socket || !isConnected) return;

    const invalidateNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const handleNewNotification = (_notification: NotificationPayload) => {
      invalidateNotifications();

      // If the notification is related to appointments, invalidate those too
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    };

    const handleNotificationRead = () => {
      invalidateNotifications();
    };

    const handleNotificationDeleted = () => {
      invalidateNotifications();
    };

    const handleBulkDelete = () => {
      invalidateNotifications();
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:read", handleNotificationRead);
    socket.on("notification:deleted", handleNotificationDeleted);
    socket.on("notification:bulk-delete", handleBulkDelete);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:read", handleNotificationRead);
      socket.off("notification:deleted", handleNotificationDeleted);
      socket.off("notification:bulk-delete", handleBulkD
  ... [truncated — see source for full body]
```


## `features/appointments/hooks/use-appointments-date-state.ts`

### L32–39 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!clinicTimezone || syncedClinicTzRef.current === clinicTz) return;
    syncedClinicTzRef.current = clinicTz;
    if (userPickedDateRef.current) return;
    const todayIso = formatClinicTodayPickerIso(clinicTz);
    setSelectedPickerIso(todayIso);
    setCalendarMonth(startOfMonth(pickerIsoToLocalDate(todayIso)));
  }, [clinicTimezone, clinicTz]
```


## `features/appointments/hooks/use-appointments-page-effects.ts`

### L14–29 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (focusRequestsPanel !== "1") return;
    const timer = window.setTimeout(() => {
      appointmentRequestsRef.current?.scrollIntoView({
        behavior: scrollBehavior,
        block: "start",
      });
      const next = new URLSearchParams(searchParams.toString());
      next.delete(REQUESTS_PANEL_FOCUS_PARAM);
      const qs = next.toString();
      navigate(qs.length > 0 ? `/appointments?${qs}` : "/appointments", {
        replace: true,
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusRequestsPanel, navigate, searchParams, scrollBehavior]
```


## `features/appointments/hooks/use-appointments-selection-effects.ts`

### L18–24 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (appliedDefaultDoctorRef.current || !user?.id) return;
    if (isDoctorDefaultRole(user.role)) {
      setSelectedDoctorId(user.id);
    }
    appliedDefaultDoctorRef.current = true;
  }, [setSelectedDoctorId, user?.id, user?.role]
```

### L32–36 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (selectedDoctorId && unavailableDoctorIds.has(selectedDoctorId)) {
      setSelectedDoctorId(undefined);
    }
  }, [selectedDoctorId, setSelectedDoctorId, unavailableDoctorIds]
```

### L48–56 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!isToday || !currentTimeSlotRef.current) return;
    setTimeout(() => {
      currentTimeSlotRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, [isToday, currentTimeSlotRef, dependencyToken]
```


## `features/appointments/hooks/use-auto-pick-start-time.ts`

### L28–47 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!open) {
      hasAutoSelectedTimeRef.current = false;
      return;
    }
    if (hasAutoSelectedTimeRef.current || selectedDate) return;
    if (!watchedDoctorId || doctorSchedules.length === 0) return;

    const wall = findAutoPickStartTime({ doctorSchedules, clinicTimezone });
    if (!wall) return;
    form.setValue("startTime", wall);
    hasAutoSelectedTimeRef.current = true;
  }, [
    open,
    watchedDoctorId,
    doctorSchedules,
    selectedDate,
    form,
    clinicTimezone,
  ]
```


## `features/appointments/hooks/use-snap-start-time-to-slot.ts`

### L83–90 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    if (!open) {
      autoAdvanceChainOriginStrRef.current = null;
      autoAdvanceChainActiveRef.current = false;
      lastAutoAdvanceFromDayStrRef.current = null;
      startSnapContextRef.current = null;
    }
  }, [open]
```

### L92–222 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!open || !selectedDate || !watchedDoctorId) return;
    if (!slotsQuerySuccess || slotsQueryError) return;

    const snapKey = `${watchedDoctorId}|${formatClinicPickerDayIsoFromSelection(selectedDate, clinicTimezone)}`;
    const doctorSlots = slots.filter((s) => s.doctorId === watchedDoctorId);
    const availableIsos = doctorSlots
      .filter(
        (s) =>
          s.isAvailable &&
          !slotOccupiedByAppointments(
            selectedDate,
            s.time,
            s.endTime,
            clinicTimezone,
            blockingAppointmentsForSlots,
          ),
      )
      .map((s) =>
        calendarSlotTimeToLocalIso(selectedDate, s.time, clinicTimezone),
      );

    const currentRaw = form.getValues("startTime");
    const currentStr =
      typeof currentRaw === "string"
        ? currentRaw
        : currentRaw instanceof Date
          ? ""
          : "";

    const currentPickIsValid =
      currentStr.length > 0 && availableIsos.includes(currentStr);

    const startTimeState = form.getFieldState("startTime");
    if (
      startTimeState.isDirty &&
      startSnapContextRef.current === snapKey &&
      currentPickIsValid
    ) {
      
  ... [truncated — see source for full body]
```


## `features/auth/components/LoginDailyThought.tsx`

### L13–36 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    let cancelled = false;
    async function load() {
      try {
        const dayKey = new Date().toISOString().slice(0, 10);
        const body = await browserJson<unknown>(
          `/api/v1/public/daily-thought?day=${dayKey}`,
          { method: "GET" },
        );
        const parsed = dailyThoughtResponseSchema.safeParse(body);
        if (!cancelled && parsed.success) {
          setData(parsed.data);
        }
      } catch (error) {
        logger.error("LoginDailyThought fetch failed", { error });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []
```


## `features/auth/components/PreDashboardShell.tsx`

### L75–82 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (
      user?.emailVerified === false &&
      EMAIL_VERIFICATION_GATE_STEPS.has(currentStep)
    ) {
      navigate("/verify-email-sent", { replace: true });
    }
  }, [currentStep, navigate, user?.emailVerified]
```


## `features/auth/hooks/use-auth-page-container.ts`

### L44–48 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (!isAuthenticated || !user) return;
    setIsRedirecting(true);
    navigate(getAuthenticatedLandingPath(user), { replace: true });
  }, [isAuthenticated, navigate, user]
```

### L52–55 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    setTurnstileToken(null);
    setTurnstileError(null);
  }, [step]
```


## `features/auth/pages/forgot-password.tsx`

### L43–45 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    form.reset({ email: prefillEmail });
  }, [form, prefillEmail]
```


## `features/consultation/components/ConsultationHistoryList.tsx`

### L36–38 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    setPage(1);
  }, [scopedDoctorId]
```


## `features/consultation/components/ConsultationTimerContainer.tsx`

### L56–80 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    const stored = getStoredTimer(appointmentId);

    if (stored) {
      timerRef.current = stored;
      const now = Date.now();
      let elapsed = Math.floor((now - stored.startTime) / 1000);
      elapsed -= Math.floor(stored.pausedDuration / 1000);
      if (stored.isPaused && stored.pauseStartTime) {
        elapsed -= Math.floor((now - stored.pauseStartTime) / 1000);
      }
      setSeconds(Math.max(0, elapsed));
      setIsRunning(!stored.isPaused);
    } else if (autoStart) {
      const newTimer: TimerState = {
        appointmentId,
        startTime: Date.now(),
        pausedDuration: 0,
        isPaused: false,
      };
      timerRef.current = newTimer;
      storeTimer(newTimer);
      setIsRunning(true);
    }
  }, [appointmentId, autoStart]
```

### L82–98 — **KEEP (interval with cleanup)** — deps `[] (mount-only)`

```ts
() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const newValue = prev + 1;
          onTimeUpdate?.(newValue);
          return newValue;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, onTimeUpdate]
```


## `features/consultation/components/modals/use-billing-line-items.ts`

### L26–29 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (hasCustomizedDefaultFee || hasSeedItems) return;
    setItems((prev) => syncDefaultFeeItem(prev, defaultConsultationFee));
  }, [defaultConsultationFee, hasCustomizedDefaultFee, hasSeedItems]
```


## `features/consultation/hooks/use-consultation-access.ts`

### L45–67 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    if (
      authLoading ||
      !canAccessConsultationWorkspace ||
      startConsultationAttemptedRef.current ||
      !appointmentData ||
      isConsultationReadOnlyStatus(appointmentData.status) ||
      !["scheduled", "confirmed", "checked-in", "in-progress"].includes(
        appointmentData.status,
      )
    ) {
      return;
    }

    startConsultationAttemptedRef.current = true;
    startConsultation.mutate({ appointmentId });
  }, [
    appointmentData,
    appointmentId,
    authLoading,
    canAccessConsultationWorkspace,
    startConsultation,
  ]
```

### L69–90 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (loading || authLoading || !appointmentData) {
      return;
    }

    if (canAccessConsultationWorkspace) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(fallbackRoute, { replace: true });
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [
    appointmentData,
    authLoading,
    canAccessConsultationWorkspace,
    fallbackRoute,
    loading,
    navigate,
  ]
```


## `features/consultation/hooks/use-consultation-billing-flow.ts`

### L34–38 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!canCreateInvoice) {
      setBillingOpen(false);
    }
  }, [canCreateInvoice]
```


## `features/consultation/hooks/use-consultation-queue-realtime.ts`

### L18–52 — **KEEP (React Query cache sync)** — deps `[] (mount-only)`

```ts
() => {
    if (!socket || !isConnected) return;

    const handleClinicUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["consultation"] });
    };

    const handleNotification = (notification: {
      type?: string;
      clinicId?: string;
    }) => {
      if (
        notification.type === "APPOINTMENT_CANCELLED" ||
        notification.type === "APPOINTMENT_CHECKED_IN" ||
        notification.type === "APPOINTMENT_COMPLETED"
      ) {
        queryClient.invalidateQueries({ queryKey: ["consultation", "queue"] });
        queryClient.invalidateQueries({ queryKey: ["consultation", "stats"] });
      }
    };

    const handlePaymentUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["consultation"] });
    };

    socket.on("clinic:update", handleClinicUpdate);
    socket.on("notification:new", handleNotification);
    socket.on("payment:update", handlePaymentUpdate);

    return () => {
      socket.off("clinic:update", handleClinicUpdate);
      socket.off("notification:new", handleNotification);
      socket.off("payment:update", handlePaymentUpdate);
    };
  }, [socket, isConnected, queryClient]
```


## `features/consultation/state/useConsultationAutosave.ts`

### L200–215 — **KEEP (subscription)** — deps `[] (mount-only)`

```ts
() => {
    if (readOnly) return;
    const unsubscribe = useConsultationDraft.subscribe((state) => {
      if (!state.dirty) return;
      if (inFlightRef.current) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      persistToSession();
      debounceTimer.current = setTimeout(() => {
        void flush();
      }, AUTOSAVE_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [flush, persistToSession, readOnly]
```

### L217–230 — **KEEP (listener lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    if (readOnly) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (consultationDraftNeedsLeaveGuard(useConsultationDraft.getState())) {
        persistToSession();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [persistToSession, readOnly]
```


## `features/consultation/state/useConsultationHydrate.ts`

### L24–122 — **KEEP (persistence)** — deps `[] (mount-only)`

```ts
() => {
    if (!appointmentId || !appointmentData) return;

    const draft = useConsultationDraft.getState();
    if (draft.dirty && draft.appointmentId === appointmentId) {
      return;
    }

    let cancelled = false;
    const data = toRecord(appointmentData);
    const seed = buildConsultationHydrateSeed(data);

    const codedForHash = seed.diagnosis
      .filter((d) => d.icdCode?.id)
      .map((d, idx) => ({
        icdCodeId: d.icdCode?.id,
        notes: d.notes,
        isPrimary: idx === 0,
      }));

    void (async () => {
      const diagnosesContentHash = await hashDiagnosesForSync(codedForHash);
      if (cancelled) return;

      useConsultationDraft.getState().hydrate(appointmentId, {
        chiefComplaint: seed.chiefComplaint,
        history: seed.history,
        examination: seed.examination,
        diagnosis: seed.diagnosis,
        treatment: seed.treatment,
        prescriptions: [],
        dentalChart: seed.dentalChart,
        eyeExam: seed.eyeExam,
        growthData: seed.growthData,
        cardiologyExam: seed.cardiologyExam,
        dermatologyExam: seed.dermatologyExam,
        gynecologyExam: seed.gynecologyExam,
        psychiatryExam: se
  ... [truncated — see source for full body]
```


## `features/consultation/workspace/chrome/CommandPalette.tsx`

### L26–28 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!open) setQuery("");
  }, [open]
```


## `features/consultation/workspace/consultation-leave-navigation-effects.ts`

### L37–48 — **KEEP (history trap)** — deps `[] (mount-only)`

```ts
() => {
    resetLeaveHistoryTraps({
      pendingLinkNavigationHrefRef,
      pendingLeaveHistoryTrapsRef,
      peelingLeaveHistoryTrapsRef,
    });
  }, [
    activeAppointmentId,
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  ]
```

### L49–61 — **KEEP (history trap)** — deps `[] (mount-only)`

```ts
() => {
    if (!readOnly) return;
    resetLeaveHistoryTraps({
      pendingLinkNavigationHrefRef,
      pendingLeaveHistoryTrapsRef,
      peelingLeaveHistoryTrapsRef,
    });
  }, [
    readOnly,
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  ]
```

### L62–74 — **KEEP (history trap)** — deps `[] (mount-only)`

```ts
() => {
    return () => {
      resetLeaveHistoryTraps({
        pendingLinkNavigationHrefRef,
        pendingLeaveHistoryTrapsRef,
        peelingLeaveHistoryTrapsRef,
      });
    };
  }, [
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  ]
```

### L103–131 — **KEEP (subscription)** — deps `[] (mount-only)`

```ts
() => {
    if (readOnly) return;
    if (
      !readOnlyRef.current &&
      pendingLeaveHistoryTrapsRef.current === 0 &&
      consultationDraftNeedsLeaveGuard(useConsultationDraft.getState())
    ) {
      armHistoryTrap(pendingLeaveHistoryTrapsRef);
    }
    return useConsultationDraft.subscribe((state, prev) => {
      if (readOnlyRef.current) return;
      const need = consultationDraftNeedsLeaveGuard(state);
      const prevNeed = consultationDraftNeedsLeaveGuard(prev);
      if (need && !prevNeed) {
        armHistoryTrap(pendingLeaveHistoryTrapsRef);
      } else if (!need && prevNeed) {
        peelConsultationLeaveHistoryTraps(
          pendingLeaveHistoryTrapsRef,
          peelingLeaveHistoryTrapsRef,
        );
      }
    });
  }, [
    readOnly,
    activeAppointmentId,
    readOnlyRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
  ]
```

### L150–169 — **KEEP (listener lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    if (readOnly || typeof window === "undefined") return;
    const onPopState = () => {
      if (!shouldOpenDialogForPopstate(readOnlyRef, peelingLeaveHistoryTrapsRef)) {
        return;
      }
      pendingLinkNavigationHrefRef.current = null;
      armHistoryTrap(pendingLeaveHistoryTrapsRef);
      setLeaveDialogOpenInternal(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [
    readOnly,
    readOnlyRef,
    pendingLinkNavigationHrefRef,
    pendingLeaveHistoryTrapsRef,
    peelingLeaveHistoryTrapsRef,
    setLeaveDialogOpenInternal,
  ]
```

### L195–220 — **KEEP (listener lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    if (readOnly || typeof document === "undefined") return;
    const handleCaptureClick = (event: MouseEvent) => {
      if (shouldIgnoreCaptureClick(event, readOnlyRef)) return;
      const trimmedHref = readCapturedNavigationHref(event);
      if (!trimmedHref) return;
      const resolution = resolveConsultationHrefNavigation(
        trimmedHref,
        activeAppointmentId,
        false,
      );
      if (resolution.kind !== "dialog") return;
      blockCapturedNavigation(event);
      pendingLinkNavigationHrefRef.current = resolution.destination;
      setLeaveDialogOpenInternal(true);
    };
    document.addEventListener("click", handleCaptureClick, true);
    return () =>
      document.removeEventListener("click", handleCaptureClick, true);
  }, [
    readOnly,
    activeAppointmentId,
    readOnlyRef,
    pendingLinkNavigationHrefRef,
    setLeaveDialogOpenInternal,
  ]
```


## `features/consultation/workspace/shell/ConsultationMainPanel.tsx`

### L83–88 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!didAutoOpen.current && effectivePatient) {
      if (summary.hasAny) setHistoryOpen(true);
      didAutoOpen.current = true;
    }
  }, [effectivePatient, summary.hasAny]
```


## `features/consultation/workspace/shell/use-consultation-keyboard-shortcuts.ts`

### L29–102 — **KEEP (listener lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    const isMac =
      typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
    const handler = (e: KeyboardEvent) => {
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onPaletteOpenChange(!paletteOpen);
        return;
      }
      if (modKey && e.key.toLowerCase() === "s") {
        if (readOnly) return;
        e.preventDefault();
        void onSaveClick();
        return;
      }
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || target.isContentEditable)
        return;
      if (e.key === "?") {
        e.preventDefault();
        onPaletteOpenChange(true);
        return;
      }
      if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        openVitals();
        return;
      }
      if (e.key.toLowerCase() === "q") {
        e.preventDefault();
        void router.push("/consultation");
        return;
      }
      if (e.key === "g" || e.key === "n") {
        const mode = e.key;
        const sequenceHandler = (ev
  ... [truncated — see source for full body]
```


## `features/consultation/workspace/shell/use-consultation-shell-scroll-effects.ts`

### L21–35 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    const targetId = pendingUrlScrollToSectionId;
    if (!targetId) return;
    return runPendingUrlScroll({
      refs,
      targetId,
      setPendingUrlScrollToSectionId,
      computeActiveSectionFromScroll,
    });
  }, [
    computeActiveSectionFromScroll,
    pendingUrlScrollToSectionId,
    refs,
    setPendingUrlScrollToSectionId,
  ]
```

### L96–115 — **KEEP (listener lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    const root = mainScrollRef.current;
    if (!root) return;
    const clearScrollSpySuppression = () => {
      scrollSpySuppressedUntilRef.current = 0;
    };
    scheduleScrollSpy();
    root.addEventListener("scroll", scheduleScrollSpy, { passive: true });
    window.addEventListener("resize", scheduleScrollSpy, { passive: true });
    root.addEventListener("wheel", clearScrollSpySuppression, { passive: true });
    root.addEventListener("touchstart", clearScrollSpySuppression, {
      passive: true,
    });
    return () => {
      root.removeEventListener("scroll", scheduleScrollSpy);
      window.removeEventListener("resize", scheduleScrollSpy);
      root.removeEventListener("wheel", clearScrollSpySuppression);
      root.removeEventListener("touchstart", clearScrollSpySuppression);
    };
  }, [mainScrollRef, scheduleScrollSpy, scrollSpySuppressedUntilRef]
```

### L125–146 — **KEEP (listener lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    const root = mainScrollRef.current;
    if (!root) return;
    const onFocusIn = (event: FocusEvent) => {
      updateActiveSectionFromFocus({
        event,
        root,
        sectionsRef,
        scrollSpySuppressedUntilRef,
        stepMode,
        setActiveSectionId,
      });
    };
    root.addEventListener("focusin", onFocusIn);
    return () => root.removeEventListener("focusin", onFocusIn);
  }, [
    mainScrollRef,
    scrollSpySuppressedUntilRef,
    sectionsRef,
    setActiveSectionId,
    stepMode,
  ]
```


## `features/consultation/workspace/shell/use-consultation-shell-scroll.ts`

### L186–188 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    return () => cancelStoredAnimationFrame(scrollSpyRaf);
  }, [scrollSpyRaf]
```

### L264–301 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    const resolved = resolveConsultationSectionFromUrl(sectionQ, tabQ, clinicType);
    const defaultSectionId = sections[0]?.id ?? "subjective";
    const valid =
      sections.find((section) => section.id === resolved)?.id ?? defaultSectionId;
    if (valid !== activeSectionId) {
      setActiveSectionId(valid);
    }
    queueUrlScrollIfNeeded({
      refs,
      sectionQ,
      tabQ,
      valid,
      sectionIdsKey,
      stepMode,
      setPendingUrlScrollToSectionId,
    });
    const { params: cleanedParams, changed } = cleanSectionUrlParams(
      searchParams.toString(),
      valid,
      defaultSectionId,
      tabQ,
    );
    if (changed) navigate(`?${cleanedParams}`, { replace: true });
  }, [
    activeSectionId,
    clinicType,
    refs,
    navigate,
    searchParams,
    sectionIdsKey,
    sectionQ,
    sections,
    setActiveSectionId,
    setPendingUrlScrollToSectionId,
    stepMode,
    tabQ,
  ]
```


## `features/consultation/workspace/shell/use-consultation-shell.ts`

### L81–87 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    if (!saveHandlesRef) return;
    saveHandlesRef.current = { flush, submitPrescriptions };
    return () => {
      saveHandlesRef.current = null;
    };
  }, [flush, saveHandlesRef, submitPrescriptions]
```


## `features/desk/components/DeskCollectPaymentPageUI.tsx`

### L73–79 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!dialogInvoice) return;
    setPaymentMethod("CASH");
    setAmount(invoiceBalanceDue(dialogInvoice).toFixed(2));
    setReference("");
    setNotes("");
  }, [dialogInvoice]
```


## `features/dialogs/components/ContactSalesModalUI.tsx`

### L43–53 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (open) {
      form.reset({
        name: "",
        email: "",
        clinic: "",
        message: "",
        ...defaultValues,
      });
    }
  }, [open, defaultValues, form]
```


## `features/dialogs/components/InventoryAddItemDialogUI.tsx`

### L45–56 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (isOpen) {
      form.reset({
        name: "",
        category: "",
        quantity: "",
        minStock: "",
        expiryDate: "",
        ...defaultValues,
      });
    }
  }, [isOpen, defaultValues, form]
```


## `features/imports/components/use-bulk-import-dialog.ts`

### L40–45 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (open !== undefined && open !== prevOpenRef.current) {
      prevOpenRef.current = open;
      setIsOpen(open);
    }
  }, [open]
```

### L66–89 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (step !== "progress" || !activeJobId || !jobStatusQuery.data) {
      return;
    }
    const j = jobStatusQuery.data;
    const pct =
      j.totalRows > 0 ? Math.round((j.processedRows / j.totalRows) * 100) : 0;
    setProgress(Math.min(100, pct));

    if (
      j.status === "COMPLETED" ||
      j.status === "FAILED" ||
      j.status === "PARTIALLY_COMPLETED"
    ) {
      setProgress(100);
      setJobSummary({
        successRows: j.successRows,
        failedRows: j.failedRows,
        totalRows: j.totalRows,
        status: j.status,
      });
      setStep("result");
    }
  }, [step, activeJobId, jobStatusQuery.data]
```

### L91–93 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    setDpdpAttestationConfirmed(false);
  }, [selectedEntity]
```


## `features/inbox/components/InboxPageContent.tsx`

### L136–146 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (visibleTabs.length === 0) return;
    const requested = searchParams.get("tab");
    const allowedIds = new Set(visibleTabs.map((tab) => tab.value));
    if (requested && !allowedIds.has(requested)) {
      const params = new URLSearchParams(searchParams.toString());
      const defaultTab = visibleTabs[0]?.value;
      if (defaultTab) params.set("tab", defaultTab);
      navigate(`/inbox?${params.toString()}`);
    }
  }, [currentTab, navigate, searchParams, visibleTabs]
```


## `features/inbox/components/NotificationsInboxView.tsx`

### L28–76 — **KEEP (React Query cache sync)** — deps `[] (mount-only)`

```ts
() => {
    if (!socket) return;
    const onNew = (n: StaffNotification) => {
      queryClient.setQueryData<StaffNotification[]>(
        queryKeys.notifications.listAll(),
        (old = []) => [n, ...old],
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    const onRead = (data: { id: string; readAt: Date }) => {
      queryClient.setQueryData<StaffNotification[]>(
        queryKeys.notifications.listAll(),
        (old = []) =>
          old.map((n) =>
            n.id === data.id ? { ...n, isRead: true, readAt: data.readAt } : n,
          ),
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    const onDeleted = (data: { id: string }) => {
      queryClient.setQueryData<StaffNotification[]>(
        queryKeys.notifications.listAll(),
        (old = []) => old.filter((n) => n.id !== data.id),
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    const onBulk = () => {
      refetch();
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.u
  ... [truncated — see source for full body]
```

### L126–128 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!visibleCategories.some((c) => c.id === activeTab)) setActiveTab("all");
  }, [visibleCategories, activeTab]
```


## `features/insurance-claims/hooks/use-insurance-claim-create-logic.ts`

### L48–50 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    applyPatientInsuranceDefaults(form, presetPatient);
  }, [form, presetPatient]
```

### L51–53 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    applyInvoiceClaimAmountDefault(form, presetInvoice);
  }, [form, presetInvoice]
```


## `features/insurance-claims/hooks/use-insurance-claim-edit-logic.ts`

### L40–52 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (!claim) return;
    form.reset({
      invoiceId: claim.invoiceId ?? "",
      appointmentId: claim.appointmentId ?? "",
      insurerName: claim.insurerName,
      tpaName: claim.tpaName ?? "",
      policyNumber: claim.policyNumber,
      groupNumber: claim.groupNumber ?? "",
      claimedAmount: centsToMajor(claim.claimedAmountCents),
      notes: claim.notes ?? "",
    });
  }, [claim, form]
```


## `features/invoices/hooks/use-invoice-download.ts`

### L20–24 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    return () => {
      pdfAbortRef.current?.abort();
    };
  }, []
```

### L26–32 — **KEEP (one-shot side effect)** — deps `[] (mount-only)`

```ts
() => {
    if (!autoPrint || hasAutoPrintedRef.current) return;
    if (!isLoading && hasInvoice) {
      hasAutoPrintedRef.current = true;
      window.print();
    }
  }, [autoPrint, isLoading, hasInvoice]
```


## `features/invoices/hooks/use-invoice-edit-logic.ts`

### L50–77 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (invoice) {
      form.reset({
        status: normalizeInvoiceStatus(invoice.status),
        discount: 0,
        notes: invoice.notes || "",
        items: invoice.items?.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          discountAmount: item.discountAmount ?? 0,
          taxTreatment: item.taxTreatment ?? "EXEMPT_HEALTHCARE",
          taxRate: item.taxRate ?? 0,
          hsnCode: item.hsnCode,
          sacCode: item.sacCode,
        })) || [
          {
            description: "",
            quantity: 1,
            price: 0,
            taxTreatment: "EXEMPT_HEALTHCARE",
            taxRate: 0,
          },
        ],
      });
    }
  }, [invoice, form]
```


## `features/invoices/hooks/use-invoices-logic.ts`

### L24–28 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    return () => {
      pdfAbortRef.current?.abort();
    };
  }, []
```


## `features/lab-tests/hooks/use-lab-tests-logic.ts`

### L81–88 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!isOrderDialogOpen) {
      setPatientSearch("");
      setTestSearch("");
      setPatientComboboxOpen(false);
      setTestComboboxOpen(false);
    }
  }, [isOrderDialogOpen]
```


## `features/patient-portal/components/navigation/consent-banner.tsx`

### L25–29 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (consentSettings && !consentSettings.isFirstLogin) {
      setDismissed(true);
    }
  }, [consentSettings]
```


## `features/patients/components/details/PatientTagManagerContainer.tsx`

### L37–41 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (tagsQuery.data) {
      setTags(tagsQuery.data);
    }
  }, [tagsQuery.data]
```


## `features/patients/components/details/use-medical-history-overrides.ts`

### L19–25 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (initialPatient.id && initialPatient.id !== syncedPatientIdRef.current) {
      syncedPatientIdRef.current = initialPatient.id;
      setSocialOverrides({});
      setCustomDataOverrides({});
    }
  }, [initialPatient]
```

### L27–30 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    const timers = pendingTimersRef.current;
    return () => { timers.forEach((t) => clearTimeout(t)); timers.clear(); };
  }, []
```


## `features/patients/components/details/use-patient-detail-tabs.ts`

### L30–39 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (!legacyRedirect) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", legacyRedirect.tab);
    if (legacyRedirect.subtab) {
      params.set("subtab", legacyRedirect.subtab);
    }
    const query = params.toString();
    navigate(query ? `?${query}` : ".", { replace: true });
  }, [legacyRedirect, navigate, searchParams]
```

### L53–61 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (activeTab !== "billing") return;
    if (canViewInvoices) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    params.delete("subtab");
    const query = params.toString();
    navigate(query ? `?${query}` : ".", { replace: true });
  }, [activeTab, canViewInvoices, navigate, searchParams]
```


## `features/patients/components/forms/dialogs/EditPatientDialog.tsx`

### L88–90 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    setAbhaStatus(initialAbhaStatus);
  }, [initialAbhaStatus]
```


## `features/patients/hooks/use-patients-logic.ts`

### L45–47 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    setPage(1);
  }, [searchQuery]
```


## `features/prescriptions/components/view/PrescriptionViewPageContent.tsx`

### L78–83 — **KEEP (one-shot side effect)** — deps `[] (mount-only)`

```ts
() => {
    if (shouldAutoPrint && prescription && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      window.print();
    }
  }, [shouldAutoPrint, prescription]
```


## `features/prescriptions/hooks/use-prescriptions-filters.ts`

### L31–33 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    setPatientId(patientIdFromUrl);
  }, [patientIdFromUrl]
```


## `features/public-booking/use-public-booking-form-verification.ts`

### L13–18 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (requiresOtp === true) {
      setDateOfBirth("");
      setDpdpConsentAccepted(false);
    }
  }, [requiresOtp, setDateOfBirth, setDpdpConsentAccepted]
```


## `features/public-booking/use-public-booking-page-state.ts`

### L35–37 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (v.requiresOtp === true) setSubmitFieldErrors(clearDateOfBirthError);
  }, [v.requiresOtp, setSubmitFieldErrors]
```


## `features/public-booking/use-public-booking-slot-state.ts`

### L42–45 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    const parsed = parseIsoDateToLocalDate(slotDate);
    if (parsed) setCalendarMonth(parsed);
  }, [slotDate]
```

### L47–50 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    setTimeRangeStart("");
    setTimeRangeEnd("");
  }, [slotDate, doctorId]
```


## `features/referral-partner/components/PartnerShell.tsx`

### L24–28 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (!auth.signedIn) {
      navigate("/partner/login", { replace: true });
    }
  }, [auth.signedIn, navigate]
```

### L33–39 — **KEEP (interval with cleanup)** — deps `[] (mount-only)`

```ts
() => {
    void refreshAccessToken();
    const id = setInterval(() => {
      void refreshAccessToken();
    }, 14 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshAccessToken]
```


## `features/referral-partner/pages/partner-pages.tsx`

### L17–22 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    navigate(
      partnerSession.getAccessToken() ? "/partner/dashboard" : "/partner/login",
      { replace: true },
    );
  }, [navigate]
```

### L30–34 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (auth.signedIn) {
      navigate("/partner/dashboard", { replace: true });
    }
  }, [auth.signedIn, navigate]
```


## `features/search/components/use-global-search.ts`

### L33 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { if (open) focusInput(); }, [open, focusInput]
```

### L34 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { setSelectedIndex(-1); }, [debouncedQuery]
```


## `features/settings/components/clinic/queue/queue-configuration-form.tsx`

### L30–40 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (clinic) {
      form.reset({
        avgConsultationMinutes:
          clinic.avgConsultationMinutes ?? DEFAULT_SLOT_DURATION,
        lateArrivalGraceMinutes: clinic.lateArrivalGraceMinutes ?? 30,
        queueBufferMinutes: clinic.queueBufferMinutes ?? 10,
        useDoctorQueues: clinic.useDoctorQueues ?? false,
      });
    }
  }, [clinic, form]
```


## `features/settings/components/clinic/use-clinic-general-settings.ts`

### L56–79 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (clinic) {
      const settings = clinic.settings as
        | {
            facilityLabel?: FacilityTypeType;
            mapsLink?: string;
            taxSettings?: { legalName?: string };
          }
        | null
        | undefined;
      form.reset({
        name: clinic.name || "",
        address: clinic.address || "",
        phone: clinic.phone || "",
        gstin: getClinicGstin(clinic.settings) || "",
        legalName: settings?.taxSettings?.legalName ?? "",
        facilityLabel:
          clinic.facilityType ?? settings?.facilityLabel ?? "CLINIC",
        mapsLink: settings?.mapsLink ?? "",
        abdmEnabled: clinic.abdmEnabled ?? false,
        hfrFacilityId: clinic.hfrFacilityId ?? "",
      });
    }
  }, [clinic, form]
```


## `features/settings/components/clinical/OpdSlipSettings.tsx`

### L31–38 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (initialSettings) {
      form.reset({
        revisitValidityDays: initialSettings.revisitValidityDays ?? 0,
        footerNote: initialSettings.footerNote ?? "",
      });
    }
  }, [initialSettings, form]
```


## `features/settings/components/clinical/PrescriptionDefaultsSettings.tsx`

### L30–40 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (initialSettings) {
      form.reset({
        defaultInstructions: initialSettings.defaultInstructions ?? "",
        defaultFooterText: initialSettings.defaultFooterText ?? "",
        includeClinicHeader: initialSettings.includeClinicHeader ?? true,
        includeDoctorSignature: initialSettings.includeDoctorSignature ?? true,
        includeQRCode: initialSettings.includeQRCode ?? false,
      });
    }
  }, [initialSettings, form]
```


## `features/settings/components/management/use-doctor-availability-settings.ts`

### L30–34 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (isAdmin && doctors.length > 0 && selectedDoctorId === "me") {
      setSelectedDoctorId(doctors[0]?.id ?? "me");
    }
  }, [isAdmin, doctors, selectedDoctorId]
```

### L45–47 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    setDaySchedules(populateDaySchedulesFromApi(schedules));
  }, [schedules]
```


## `features/settings/components/management/use-doctor-time-away-settings.ts`

### L29–33 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (isAdminUser && doctors.length > 0 && selectedDoctorId === "me") {
      setSelectedDoctorId(doctors[0]?.id ?? "me");
    }
  }, [isAdminUser, doctors, selectedDoctorId]
```


## `features/settings/components/notifications/NotificationSettings.tsx`

### L34–50 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (clinic) {
      const s = parseClinicAppSettings(clinic.settings);
      const whatsappFromSettings =
        s.whatsappNotifications ??
        s.whatsappAppointmentReminders ??
        s.whatsappFollowUpMessages ??
        s.whatsappBirthdayWishes ??
        s.whatsappMedicineReminders ??
        true;

      form.reset({
        whatsappNotifications: whatsappFromSettings,
        inAppNotifications: s.inAppNotifications ?? s.pushNotifications ?? true,
      });
    }
  }, [clinic, form]
```


## `features/settings/components/notifications/ReminderSettingsUI.tsx`

### L38–41 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (!clinic) return;
    form.reset(reminderFormValuesFromClinicSettings(clinic.settings));
  }, [clinic, form]
```


## `features/settings/components/security/SecuritySettings.tsx`

### L34–43 — **FORM_RESET** — deps `[] (mount-only)`

```ts
() => {
    if (clinic) {
      const s = parseClinicAppSettings(clinic.settings);
      form.reset({
        twoFactorAuth: s.twoFactorAuth ?? false,
        sessionTimeout: String(s.sessionTimeout || "30"),
        auditLogs: s.auditLogs ?? true,
      });
    }
  }, [clinic, form]
```


## `features/settings/components/whatsapp/WhatsappSenderSettings.tsx`

### L29–44 — **KEEP (persistence)** — deps `[] (mount-only)`

```ts
() => {
    if (sender.data) {
      const persistedMode = sender.data.mode;
      // Deliberate fallback: the mode union is the canonical contract, so a
      // stale/unknown persisted mode renders and saves as the SHARED default
      // instead of flowing out-of-contract values into the update payload.
      setMode(
        persistedMode === "BYO" || persistedMode === "MANAGED"
          ? persistedMode
          : "SHARED",
      );
      setPhoneNumberId(sender.data.phoneNumberId ?? "");
      setWabaId(sender.data.wabaId ?? "");
      setAccessToken("");
    }
  }, [sender.data]
```


## `features/setup/components/onboarding/address-picker/use-clinic-address-picker.ts`

### L76–95 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!open) return;
    setAddressDraft(initialAddress);
    setAddressDetails(null);
    setResolvedAddress("");
    setPicked(null);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  }, [
    initialAddress,
    open,
    setAddressDetails,
    setAddressDraft,
    setPicked,
    setResolvedAddress,
    setSearchQuery,
    setShowSuggestions,
    setSuggestions,
  ]
```

### L112–115 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    if (open) return;
    didAutoLocateRef.current = false;
  }, [open]
```

### L116–151 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!open || picked || didAutoLocateRef.current) return;
    if (!navigator.geolocation) return;
    didAutoLocateRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setPicked(next);
        void (async () => {
          setIsResolving(true);
          try {
            const result = await reverseGeocodeOSM(next);
            if (!result) return;
            setResolvedAddress(result.address);
            setAddressDraft(result.address);
            setAddressDetails(result.details ?? null);
          } finally {
            setIsResolving(false);
          }
        })();
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [
    open,
    picked,
    setAddressDetails,
    setAddressDraft,
    setIsResolving,
    setPicked,
    setResolvedAddress,
  ]
```

### L161–184 — **KEEP (debounced timer with cleanup)** — deps `[] (mount-only)`

```ts
() => {
    if (!open) return;
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const searchId = ++lastSearchIdRef.current;
    setIsSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const results = await searchOSM(q);
          if (lastSearchIdRef.current !== searchId) return;
          setSuggestions(results);
        } finally {
          if (lastSearchIdRef.current === searchId) {
            setIsSearching(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [lastSearchIdRef, open, searchQuery, setIsSearching, setSuggestions]
```


## `features/setup/components/onboarding/forms/clinic-registration-form-sections.tsx`

### L32–44 — **KEEP (subscription)** — deps `[] (mount-only)`

```ts
() => {
    const subscription = complianceForm.watch((values) => {
      setComplianceDraft({
        acceptedSLA: values.acceptedSLA,
        acceptedPrivacyPolicy: values.acceptedPrivacyPolicy,
        acceptedDataProcessing: values.acceptedDataProcessing,
        enableWhatsApp: values.enableWhatsApp,
        requireConsent: values.requireConsent,
        slaSignatureSessionId: values.slaSignatureSessionId,
      });
    });
    return () => subscription.unsubscribe();
  }, [complianceForm, setComplianceDraft]
```

### L64–76 — **KEEP (persistence)** — deps `[] (mount-only)`

```ts
() => {
    if (step <= 1) return;
    const missingClinicData = getMissingClinicDetailsForProgress(
      formData.clinicDetails,
    );
    if (missingClinicData.length === 0) return;

    restartOnboarding();
    localStorage.removeItem(DRAFT_KEY);
    setStepError(
      `Onboarding progress was incomplete (${missingClinicData.join(", ")}), so we started over from Step 1`,
    );
  }, [formData.clinicDetails, restartOnboarding, step, setStepError]
```


## `features/setup/components/onboarding/forms/use-onboarding-draft.ts`

### L55–105 — **KEEP (persistence)** — deps `[] (mount-only)`

```ts
() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = parseOnboardingDraft(JSON.parse(raw));
      if (!draft) return;
      const currentOnboardingId =
        typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem(SESSION_ONBOARDING_ID_KEY)
          : null;
      const persistedStep =
        typeof sessionStorage !== "undefined"
          ? Number(sessionStorage.getItem(SESSION_KEY) || "1")
          : 1;
      const ageMs = Date.now() - new Date(draft.savedAt).getTime();
      const hasMeaningfulDraft =
        hasMeaningfulClinicDraftData(draft.clinicDetails) ||
        hasMeaningfulComplianceDraftData(draft.compliance) ||
        Boolean(draft.onboardingId);
      const isSameOnboardingSession =
        Boolean(draft.onboardingId) &&
        draft.onboardingId === currentOnboardingId;
      const hasActiveSessionProgress =
        Boolean(currentOnboardingId) && persistedStep > 1;

      if (
        ageMs < 24 * 60 * 60 * 1000 &&
        hasMeaningfulDraft &&
        !isSameOnboardingSession &&
        !hasActiveSessionProgress
      ) {
        setSavedDraft(draft);
        setShowDraftDialog(true
  ... [truncated — see source for full body]
```

### L185–190 — **KEEP (subscription)** — deps `[] (mount-only)`

```ts
() => {
    const subscription = clinicForm.watch((values) => {
      persistDraft(values, complianceForm.getValues());
    });
    return () => subscription.unsubscribe();
  }, [clinicForm, complianceForm, persistDraft]
```

### L192–197 — **KEEP (subscription)** — deps `[] (mount-only)`

```ts
() => {
    const subscription = complianceForm.watch((values) => {
      persistDraft(clinicForm.getValues(), values);
    });
    return () => subscription.unsubscribe();
  }, [clinicForm, complianceForm, persistDraft]
```

### L201–203 — **KEEP (persistence)** — deps `[] (mount-only)`

```ts
() => {
    persistDraft(clinicForm.getValues(), complianceForm.getValues());
  }, [clinicForm, complianceForm, onboardingId, formData, step, persistDraft]
```


## `features/setup/components/onboarding/steps/compliance/compliance-legal-document-dialog.tsx`

### L39–63 — **KEEP (observer lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    if (!open) {
      setScrolledToBottom(false);
      setScrollProgress(0);
      return;
    }
    let observer: IntersectionObserver | null = null;
    const timer = setTimeout(() => {
      const container = scrollRef.current;
      const sentinel = sentinelRef.current;
      if (!container || !sentinel) return;
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setScrolledToBottom(true);
        },
        { root: container, threshold: 0 },
      );
      observer.observe(sentinel);
      updateScrollProgress();
    }, 200);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [open, updateScrollProgress]
```


## `features/setup/components/onboarding/steps/compliance/use-compliance-step.ts`

### L52–63 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!hasOnboardingContext) return;
    if (!signatureSessionId) { setSignatureFileUrl(null); setSignaturePreviewFailed(false); return; }
    if (signatureFileUrl) return;
    let cancelled = false;
    void (async () => {
      const activeOnboardingId = await resolveOnboardingId();
      if (!activeOnboardingId || cancelled) return;
      await fetchSignaturePreview(activeOnboardingId, signatureSessionId);
    })();
    return () => { cancelled = true; };
  }, [fetchSignaturePreview, hasOnboardingContext, resolveOnboardingId, signatureFileUrl, signatureSessionId]
```


## `features/setup/components/onboarding/wizard/clinic-onboarding-wizard.tsx`

### L14–27 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (isLoading) return;

    if (!user) {
      setIsFinalizingRedirect(true);
      navigate("/login?next=/onboarding", { replace: true });
      return;
    }

    if (user.clinicId) {
      setIsFinalizingRedirect(true);
      navigate("/today", { replace: true });
    }
  }, [isLoading, navigate, user]
```


## `features/setup/hooks/use-clinic-registration-state.ts`

### L28–30 — **KEEP (persistence)** — deps `[] (mount-only)`

```ts
() => {
    persistFormData(formData);
  }, [formData]
```


## `features/setup/hooks/use-join-clinic-page.ts`

### L24–50 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setIsRedirecting(true);
      persistReturnPathBeforeLogin();
      navigate("/login", { replace: true });
      return;
    }

    if (user?.clinicId || user?.onboardingStep === "COMPLETED") {
      setIsRedirecting(true);
      navigate("/today", { replace: true });
      return;
    }

    if (user?.onboardingStep === "JOINING_CLINIC") {
      setIsRedirecting(true);
      navigate("/join-request-status", { replace: true });
      return;
    }

    if (user?.onboardingStep === "CREATING_CLINIC") {
      setIsRedirecting(true);
      navigate("/onboarding", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]
```


## `features/setup/hooks/use-join-request-status-page.ts`

### L51–74 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (isLoading) return;
    if (terminalState) return;

    if (!user) {
      setRedirectMessage("Redirecting to login…");
      persistReturnPathBeforeLogin();
      navigate("/login", { replace: true });
      return;
    }

    if (user.clinicId || user.onboardingStep === "COMPLETED") {
      setRedirectMessage(
        "Your request is complete. Taking you to your workspace…",
      );
      navigate("/today", { replace: true });
      return;
    }

    if (!request) {
      setRedirectMessage("No active request found. Returning to choose path…");
      navigate("/choose-path", { replace: true });
    }
  }, [request, isLoading, navigate, user, terminalState]
```

### L76–98 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (!request || request.status === "PENDING") return;
    if (terminalState) return;

    if (request.status === "APPROVED") {
      void (async () => {
        await refreshUser();
        setRedirectMessage(
          "Your request was approved. Taking you to your workspace…",
        );
        navigate("/today", { replace: true });
      })();
      return;
    }

    if (request.status === "REJECTED") {
      setTerminalState({
        kind: "rejected",
        clinicName: request.clinic.name,
        reason: request.rejectionReason,
      });
    }
  }, [request, refreshUser, navigate, terminalState]
```


## `features/setup/hooks/use-verify-doctor.ts`

### L190–194 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!doctorProfile) return;
    setRegistrationCouncil(doctorProfile.registrationCouncil ?? "");
    setRegistrationStateCode(doctorProfile.registrationStateCode ?? "");
  }, [doctorProfile]
```

### L224–248 — **KEEP (persistence)** — deps `[] (mount-only)`

```ts
() => {
    if (authLoading) return;
    if (!user) {
      setIsRedirecting(true);
      persistReturnPathBeforeLogin();
      routerReplace("/login");
      return;
    }
    if (!isDoctor) {
      setIsRedirecting(true);
      routerReplace("/today");
      return;
    }
    if (canAutoRedirect) {
      setIsRedirecting(true);
      routerReplace("/today");
    }
  }, [
    authLoading,
    user,
    isDoctor,
    canAutoRedirect,
    routerReplace,
    setIsRedirecting,
  ]
```


## `features/setup/pages/choose-path.tsx`

### L38–57 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setRedirectMessage("Redirecting to login…");
      persistReturnPathBeforeLogin();
      navigate("/login", { replace: true });
      return;
    }
    if (user?.clinicId || user?.onboardingStep === "COMPLETED") {
      setRedirectMessage(
        "Account already linked. Redirecting to your workspace…",
      );
      navigate("/today", { replace: true });
      return;
    }
    if (user?.onboardingStep === "CREATING_CLINIC") {
      setRedirectMessage("Taking you back to onboarding…");
      navigate("/onboarding", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]
```


## `features/setup/pages/onboarding-page.tsx`

### L14–40 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setRedirectMessage("Redirecting to login…");
      navigate("/login?next=/onboarding", { replace: true });
      return;
    }
    if (user?.clinicId || user?.onboardingStep === "COMPLETED") {
      setRedirectMessage(
        "Registration successful. Taking you to your workspace…",
      );
      navigate("/today", { replace: true });
      return;
    }
    if (user?.onboardingStep === "JOINING_CLINIC") {
      setRedirectMessage("Taking you to your join request status…");
      navigate("/join-request-status", { replace: true });
      return;
    }
    if (
      user?.onboardingStep === "CHOOSE_PATH" ||
      user?.onboardingStep === "NOT_STARTED"
    ) {
      setRedirectMessage("Taking you to facility setup choices…");
      navigate("/choose-path", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]
```


## `features/subscription/components/modals/payment-success-modal.tsx`

### L30–62 — **KEEP (interval with cleanup)** — deps `[] (mount-only)`

```ts
() => {
    if (open) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: NodeJS.Timeout = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) return clearInterval(interval);

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          zIndex: 9999,
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          zIndex: 9999,
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [open]
```


## `features/subscription/hooks/use-auto-resolve-subscription-payment.ts`

### L66–89 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (
      attemptedRef.current ||
      isLoading ||
      isBillingHistoryLoading ||
      !shouldAutoResolve
    ) {
      return;
    }

    attemptedRef.current = true;
    void resolvePayment();

    const params = new URLSearchParams(searchParams.toString());
    params.delete("resolvePayment");
    navigate(`/settings?${params.toString()}`, { replace: true });
  }, [
    isLoading,
    isBillingHistoryLoading,
    resolvePayment,
    navigate,
    searchParams,
    shouldAutoResolve,
  ]
```


## `features/upload-signature/components/use-signature-pad.ts`

### L41–46 — **KEEP (observer lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [resizeCanvas]
```


## `features/upload-signature/components/use-signature-upload.ts`

### L71–82 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!onboardingId || !sessionId || !uploadSecret?.trim()) {
      setError("This signature link is incomplete. Please open the full link again.");
      return;
    }
    const data = statusQuery.data;
    if (!data) return;
    if (getCompletedSignatureState(data)) {
      setAlreadyUploaded(true);
      setUploadComplete(true);
    }
  }, [onboardingId, sessionId, uploadSecret, statusQuery.data]
```


## `features/upload-signature/components/use-upload-signature-token.ts`

### L32–54 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    const checkToken = async () => {
      try {
        const validation = await validateToken(token);
        setTokenValid(true);
        setDoctorName(validation.doctor?.name ?? "");
      } catch (err) {
        setError(
          getUserFacingErrorMessage(err, {
            fallback: "This upload link is no longer available",
            context: "verification",
          }),
        );
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    if (token) {
      void checkToken();
    }
  }, [token]
```


## `features/verify-email/components/VerifyEmailPageContent.tsx`

### L29–104 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (!token) {
      setState("missing");
      return;
    }

    let cancelled = false;
    const apiUrl = getAppApiUrl();
    const base = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;

    async function verifyEmail() {
      try {
        const res = await browserRequest(`${base}auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (cancelled) {
          return;
        }
        if (res.ok) {
          setState("success");
          navigate("/verify-email/verified", { replace: true });
          if (typeof window !== "undefined") {
            try {
              window.sessionStorage.removeItem(
                VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
              );
            } catch (storageError) {
              logger.error("Could not clear email verification session state", {
                storageError,
              });
            }
          }
          try {
            await refreshUser();
          } catch (refreshError) {
            logger.error("Could not refresh user after email verification", {
              refreshError,
   
  ... [truncated — see source for full body]
```


## `features/verify-email/components/VerifyEmailSentPageContent.tsx`

### L30–69 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (!user) {
      setRedirectMessage("Redirecting to login…");
      navigate("/login?next=/verify-email-sent", { replace: true });
      return;
    }

    if (user.emailVerified === true) {
      setRedirectMessage(null);
      return;
    }

    const storedStatus = window.sessionStorage.getItem(
      VERIFICATION_EMAIL_STATUS_STORAGE_KEY,
    );
    const storedResendAvailableAt = window.sessionStorage.getItem(
      VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY,
    );
    const resendAvailableAtValue = storedResendAvailableAt
      ? Number(storedResendAvailableAt)
      : null;

    if (
      typeof resendAvailableAtValue === "number" &&
      Number.isFinite(resendAvailableAtValue) &&
      resendAvailableAtValue > Date.now()
    ) {
      setResendAvailableAt(resendAvailableAtValue);
    } else {
      window.sessionStorage.removeItem(VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY);
      setResendAvailableAt(null);
    }

    if (storedStatus === "failed") {
      setDeliveryStatus("failed");
      return;
    }

    setDeliveryStatus("pending");
  }, [navigate, user]
```

### L71–95 — **KEEP (interval with cleanup)** — deps `[] (mount-only)`

```ts
() => {
    if (!resendAvailableAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const timeoutId = window.setTimeout(
      () => {
        setResendAvailableAt(null);
        window.sessionStorage.removeItem(
          VERIFICATION_EMAIL_COOLDOWN_STORAGE_KEY,
        );
        setNow(Date.now());
      },
      Math.max(resendAvailableAt - Date.now(), 0),
    );

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [resendAvailableAt]
```


## `hooks/use-add-dialog-url-sync.ts`

### L30–34 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (currentAction === "new") {
      setIsAddDialogOpen(true);
    }
  }, [currentAction]
```


## `hooks/use-phone-signature-polling.ts`

### L43–50 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []
```


## `hooks/use-phone-signature-qr-flow.ts`

### L100–104 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    if (autoStart && !session && !isUploaded) {
      void startSession();
    }
  }, [autoStart, isUploaded, session, startSession]
```

### L106–132 — **KEEP (polling)** — deps `[] (mount-only)`

```ts
() => {
    if (!autoStart || !session || isUploaded || isPolling) return;
    let cancelled = false;
    const resumePolling = async () => {
      try {
        const uploaded = await checkUploadOnce(session);
        if (!uploaded && !cancelled) {
          startPolling(session);
        }
      } catch {
        if (!cancelled) {
          startPolling(session);
        }
      }
    };
    void resumePolling();
    return () => {
      cancelled = true;
    };
  }, [
    autoStart,
    checkUploadOnce,
    isPolling,
    startPolling,
    isUploaded,
    session,
  ]
```

### L134–139 — **KEEP (polling)** — deps `[] (mount-only)`

```ts
() => {
    if (initialUploaded) {
      setIsUploaded(true);
      stopPolling();
    }
  }, [initialUploaded, stopPolling]
```

### L141–147 — **KEEP (persistence)** — deps `[] (mount-only)`

```ts
() => {
    if (!persistenceKey || session || isUploaded) return;
    const restoredSession = readPersistedSession(persistenceKey);
    if (restoredSession) {
      setSession(restoredSession);
    }
  }, [isUploaded, persistenceKey, session]
```

### L149–155 — **KEEP (persistence)** — deps `[] (mount-only)`

```ts
() => {
    if (isUploaded) {
      persistSession(persistenceKey, null);
      return;
    }
    persistSession(persistenceKey, session);
  }, [isUploaded, persistenceKey, session]
```

### L157–163 — **KEEP (polling)** — deps `[] (mount-only)`

```ts
() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]
```


## `hooks/use-session-recovery-redirect.ts`

### L18–44 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (!error || !isSessionRecoveryError(error)) {
      return;
    }

    let cancelled = false;
    setIsRecovering(true);

    void (async () => {
      const recovered = await recoverSessionOrRedirectLogin();
      if (cancelled) {
        return;
      }

      if (recovered) {
        await onRecovered?.();
      }

      if (!cancelled) {
        setIsRecovering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [error, onRecovered]
```


## `lib/access-control/use-effective-permissions.ts`

### L29–48 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => {
    if (cachedSnapshot !== undefined) {
      if (cachedSnapshot !== null) setSnapshot(cachedSnapshot);
      return;
    }
    let active = true;
    fetchEffectivePermissions()
      .then((value) => {
        cachedSnapshot = value;
        if (active) setSnapshot(value);
      })
      .catch(() => {
        // Offline / error fallback: keep the local matrix evaluation.
        cachedSnapshot = null;
        if (active) setSnapshot(null);
      });
    return () => {
      active = false;
    };
  }, []
```


## `lib/auth/use-auth-idle-logout.ts`

### L15–66 — **KEEP (listener lifecycle)** — deps `[] (mount-only)`

```ts
() => {
    if (!isAuthenticated) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    let deadlineMs = 0;

    const scheduleLogout = () => {
      if (!deadlineMs) return;
      if (timeoutId) clearTimeout(timeoutId);
      const remaining = deadlineMs - Date.now();
      const nextDelay = Math.min(Math.max(remaining, 0), MAX_TIMEOUT_MS);

      timeoutId = setTimeout(() => {
        const stillRemaining = deadlineMs - Date.now();
        if (stillRemaining > 0) {
          scheduleLogout();
          return;
        }
        const isPublicRoute =
          !!pathname &&
          typeof appSession.isPublicPath === "function" &&
          appSession.isPublicPath(pathname);
        void logout({ redirect: !isPublicRoute });
      }, nextDelay);
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      deadlineMs = Date.now() + IDLE_LOGOUT_MS;
      scheduleLogout();
    };

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId
  ... [truncated — see source for full body]
```


## `lib/auth/use-auth-provider-value.ts`

### L55–74 — **KEEP (interval with cleanup)** — deps `[] (mount-only)`

```ts
() => {
    if (!loginLockoutUntil) {
      return;
    }

    if (loginLockoutUntil <= Date.now()) {
      setLoginLockoutUntil(null);
      persistLoginLockoutUntil(null);
      return;
    }

    const interval = window.setInterval(() => {
      if (loginLockoutUntil <= Date.now()) {
        setLoginLockoutUntil(null);
        persistLoginLockoutUntil(null);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [loginLockoutUntil]
```


## `lib/auth/use-auth-session-bootstrap.ts`

### L90–202 — **KEEP (persistence)** — deps `[] (mount-only)`

```ts
() => {
    if (hasInitializedSessionRef.current) {
      return;
    }
    hasInitializedSessionRef.current = true;

    const e2eAccessToken = consumeE2EAccessToken();
    if (e2eAccessToken) {
      appSession.setToken(e2eAccessToken);
    }

    const persistedLockoutUntil = readLoginLockoutUntil();
    clearLegacyUserStorage();
    if (persistedLockoutUntil) {
      setLoginLockoutUntil(persistedLockoutUntil);
    }

    const applyValidatedUser = async (raw: unknown): Promise<boolean> => {
      const userData = parseValidatedUser(raw);
      if (!userData) return false;
      setUser(userData);
      setUserRole(userData.role);
      hasSetRoleRef.current = true;
      await refreshAccessTokenWithTimeout(refreshAccessToken);
      return true;
    };

    const validateSession = async (isColdStartRetry = false): Promise<void> => {
      const timeoutMs = isColdStartRetry
        ? VALIDATE_SESSION_TIMEOUT_MS
        : COLD_START_PROBE_TIMEOUT_MS;

      try {
        const applied = await applyValidatedUser(
          await makeTimeoutRace(validateAuth, timeoutMs),
        );
        if (applied) return;
        if (!isColdStartRetry && appSession.getToken()) {
          set
  ... [truncated — see source for full body]
```


## `lib/contexts/clinic-context.tsx`

### L110–112 — **KEEP (clinic refresh)** — deps `[] (mount-only)`

```ts
() => {
    void refreshClinic();
  }, [refreshClinic]
```


## `lib/socket/use-clinic-socket.ts`

### L18–27 — **KEEP (socket emit)** — deps `[] (mount-only)`

```ts
() => {
    if (!socket || !isConnected || !clinicId) return;

    socket.emit("subscribe:clinic", clinicId);
    socket.on("clinic:update", onUpdate);

    return () => {
      socket.off("clinic:update", onUpdate);
    };
  }, [socket, isConnected, clinicId, onUpdate]
```


## `lib/socket/use-socket-lifecycle.ts`

### L35–37 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    logoutRef.current = logout;
  }, [logout]
```

### L83–185 — **KEEP (debounced timer with cleanup)** — deps `[] (mount-only)`

```ts
() => {
    if (!enabled || !isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = resolveSocketUrl();
    let cancelled = false;

    void (async () => {
      const { io } = await import("socket.io-client");
      if (cancelled) return;

      const socketInstance = io(socketUrl, {
        auth: { token },
        autoConnect: false,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socketInstance;

      socketInstance.on("connect", () => {
        setIsConnected(true);
      });

      socketInstance.on("disconnect", (reason: string) => {
        setIsConnected(false);

        if (reason === "io server disconnect") {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (token && socketRef.current) {
              reconnectSocket(token);
            }
          }, 1000);
        }
      });

      socketInstance.o
  ... [truncated — see source for full body]
```


# `apps/internal/src`


## `components/layout/login-page.tsx`

### L26–30 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]
```


## `features/admins/pages/admins-page.tsx`

### L57 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchAdmins(); void fetchClinics(); }, []
```


## `features/analytics/pages/analytics-page.tsx`

### L100 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchData(); }, [fetchData]
```


## `features/audits/pages/audits-page.tsx`

### L24 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchLogs(); }, []
```


## `features/billing/pages/billing-page.tsx`

### L37 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchBilling(); }, []
```


## `features/broadcasts/pages/broadcasts-page.tsx`

### L35 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchJobs(); }, []
```


## `features/dashboard/pages/dashboard-page.tsx`

### L31 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchData(); }, []
```


## `features/doctors/pages/doctors-page.tsx`

### L36 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchDoctors(); }, []
```


## `features/enterprise-contracts/pages/enterprise-contracts-page.tsx`

### L24 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchContracts(); }, []
```


## `features/feedback/pages/feedback-page.tsx`

### L35 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void loadData(); }, []
```


## `features/logs/pages/logs-page.tsx`

### L46 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchLogs(); }, [params]
```


## `features/payment-processing/pages/payment-processing-page.tsx`

### L32 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchData(); }, []
```


## `features/performance/pages/performance-page.tsx`

### L38 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchMetrics(); }, []
```


## `features/pricing/pages/pricing-page.tsx`

### L43 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchData(); }, []
```


## `features/referrals/pages/referrals-page.tsx`

### L42 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchReferrals(); }, []
```


## `features/support/pages/support-page.tsx`

### L35 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchThreads(); }, []
```

### L37 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { if (selectedPhone) { void fetchMessages(selectedPhone); } }, [selectedPhone]
```

### L47 — **DERIVABLE (could be useMemo or inline)** — deps `[] (mount-only)`

```ts
() => { if (filteredThreads.length > 0 && !selectedPhone) { setSelectedPhone(filteredThreads[0]?.threadPhoneNumber ?? null); } }, [filteredThreads, selectedPhone]
```


## `features/system-monitoring/pages/system-monitoring-page.tsx`

### L73 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchData(); }, []
```

### L75–79 — **KEEP (interval with cleanup)** — deps `[] (mount-only)`

```ts
() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { void fetchData(); }, 30000);
    return () => { clearInterval(interval); };
  }, [autoRefresh]
```


## `features/users/pages/users-page.tsx`

### L56 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => { void fetchUsers(); }, []
```


## `lib/auth/auth.tsx`

### L102–105 — **KEEP (domain-specific)** — deps `[] (mount-only)`

```ts
() => {
    setAuthLogoutCallback((reason) => logout(reason));
    return () => setAuthLogoutCallback(null);
  }, [logout]
```


## `lib/auth/internal-protected-gate.tsx`

### L14–18 — **URL_SYNC** — deps `[] (mount-only)`

```ts
() => {
    if (!isLoading && (!isAuthenticated || !isInternal)) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isInternal, isLoading, navigate]
```


## `lib/auth/use-auth-session.ts`

### L61–119 — **KEEP (debounced timer with cleanup)** — deps `[] (mount-only)`

```ts
() => {
    const timer = setTimeout(async () => {
      markMounted();

      try {
        const storedUser = localStorage.getItem(INTERNAL_USER_KEY);
        const storedToken = internalSession.getToken();

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (isInternalRole(parsedUser.role)) {
            if (storedToken) {
              updateToken(storedToken);
              const isValid = await validateToken();
              if (isValid) {
                updateUser(parsedUser);
              } else {
                const refreshed = await internalSession.refreshAccessToken();
                const nextToken = internalSession.getToken();
                updateToken(nextToken);
                if (refreshed && nextToken && (await validateToken())) {
                  updateUser(parsedUser);
                } else {
                  clearAuthStorage();
                  resetAuth();
                }
              }
            } else {
              const refreshed = await internalSession.refreshAccessToken();
              const nextToken = internalSession.getToken();
              updateToken(nextToken);
              if (refreshed 
  ... [truncated — see source for full body]
```

---

## Tracker

- **Previous:** [`FRONTEND_USEEFFECT_INDEX_2026-08-11.md`](FRONTEND_USEEFFECT_INDEX_2026-08-11.md) (condensed)
- **Next:** [`2026-08-11-best-practices-and-zod.md`](2026-08-11-best-practices-and-zod.md) (backend) or [`PERFECT_APP_AUDIT_2026-08-11.md`](PERFECT_APP_AUDIT_2026-08-11.md) (full-app)
- **Related architecture:** [`../ui/UI_UX_STANDARD_2026.md`](../../ui/UI_UX_STANDARD_2026.md)
- **Related runbook:** (none)
- **Fixed in:** (not yet — comprehensive index)
- **Verified by:** (parent doc verification applies)
- **Open follow-ups:** See [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.3 (React-Hooks warnings).
