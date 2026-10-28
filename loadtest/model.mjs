/** Explicit workload assumptions, not customer records or a capacity result. */
function buildModel() {
  const inputs = {
    clinics: 25,
    completedVisitsPerClinicDay: 40,
    operatingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    visitsPerDistinctClinicPatient: 1.3,
    prescriptionsPerVisit: 0.8,
    invoicesPerVisit: 1,
    appointmentLinkedRequestsPerVisit: 20,
    staffAccountsPerClinic: 8,
    busyWindowShare: 0.3,
    busyWindowMinutes: 30,
    artificialHeadroomMultiplier: 10,
  };
  const visits =
    inputs.clinics *
    inputs.completedVisitsPerClinicDay *
    inputs.operatingDaysPerMonth;
  return {
    status: "hypothetical-workload-not-operating-records",
    inputs,
    monthly: {
      completedAppointments: visits,
      prescriptionRecords: visits * inputs.prescriptionsPerVisit,
      invoices: visits * inputs.invoicesPerVisit,
      distinctClinicPatients: visits / inputs.visitsPerDistinctClinicPatient,
      appointmentLinkedApiRequests:
        visits * inputs.appointmentLinkedRequestsPerVisit,
    },
    staffAccounts: inputs.clinics * inputs.staffAccountsPerClinic,
    boundaries: [
      "Clinic-patients are distinct clinic/patient pairs, not global people or new registrations.",
      "Prescription records, generated PDFs, invoice creation and captured payments are separate outcomes.",
      "Staff accounts do not establish simultaneous users; modeled requests exclude unrelated traffic.",
      "This read-only runner does not replay all modeled clinical writes or prove business correctness.",
    ],
  };
}

function bounded(value, minimum, maximum, label, integer = false) {
  if (
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(`Invalid ${label}; use the documented finite limits.`);
  }
  return value;
}

export function buildPlan(options = {}) {
  const selected = options.phase ?? "all";
  if (!["all", "ordinary", "busy", "headroom"].includes(selected))
    throw new Error("Unknown workload phase.");
  const durationSeconds = bounded(
    options.durationSeconds ?? 180,
    0.05,
    900,
    "phase duration",
  );
  const maxInFlight = bounded(
    options.maxInFlight ?? 8,
    1,
    64,
    "in-flight limit",
    true,
  );
  const timeoutMs = bounded(
    options.timeoutMs ?? 5_000,
    5,
    30_000,
    "request timeout",
    true,
  );
  const drainTimeoutMs = bounded(
    options.drainTimeoutMs ?? timeoutMs + 100,
    1,
    60_000,
    "drain timeout",
    true,
  );
  const maxLagMs = bounded(
    options.maxLagMs ?? 250,
    0,
    10_000,
    "arrival lag",
    true,
  );
  const maxRequests = bounded(
    options.maxRequests ?? 20_000,
    1,
    20_000,
    "request budget",
    true,
  );
  const maxResponseBytes = bounded(
    options.maxResponseBytes ?? 1_048_576,
    1,
    4_194_304,
    "response byte limit",
    true,
  );
  const temperature = options.temperature ?? "unknown";
  if (!["warm", "cold", "unknown"].includes(temperature))
    throw new Error("Unknown target temperature.");
  const referenceDate =
    options.referenceDate ?? new Date().toISOString().slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate) ||
    new Date(`${referenceDate}T00:00:00Z`).toISOString().slice(0, 10) !==
      referenceDate
  ) {
    throw new Error("Reference date must be a valid YYYY-MM-DD date.");
  }
  const model = buildModel();
  const dailyRequests =
    model.monthly.appointmentLinkedApiRequests /
    model.inputs.operatingDaysPerMonth;
  const ordinary = dailyRequests / (model.inputs.workingHoursPerDay * 3_600);
  const busy =
    (dailyRequests * model.inputs.busyWindowShare) /
    (model.inputs.busyWindowMinutes * 60);
  const rates = {
    ordinary,
    busy,
    headroom: busy * model.inputs.artificialHeadroomMultiplier,
  };
  const phases = Object.entries(rates)
    .filter(([name]) => selected === "all" || selected === name)
    .map(([name, requestsPerSecond]) => ({
      name,
      requestsPerSecond,
      durationMs: durationSeconds * 1_000,
      plannedRequests: Math.floor(durationSeconds * requestsPerSecond),
      artificial: name === "headroom",
    }));
  const totalPlannedRequests = phases.reduce(
    (sum, phase) => sum + phase.plannedRequests,
    0,
  );
  if (!totalPlannedRequests || totalPlannedRequests > maxRequests) {
    throw new Error(
      "Plan is empty or exceeds the request budget; change the declared phase duration or budget.",
    );
  }
  const routes = [
    { id: "patient-list", path: "/api/v1/patients?page=1&limit=20" },
    {
      id: "appointment-list",
      path: `/api/v1/appointments?date=${referenceDate}&limit=20&page=1`,
    },
    { id: "prescription-list", path: "/api/v1/prescriptions?page=1&limit=20" },
    { id: "invoice-list", path: "/api/v1/invoices?page=1&limit=20" },
  ].map((route) => ({ ...route, method: "GET", expectedStatus: 200 }));
  return {
    version: 1,
    model,
    phases,
    routes,
    referenceDate,
    temperature,
    totalPlannedRequests,
    limits: {
      maxInFlight,
      timeoutMs,
      drainTimeoutMs,
      maxLagMs,
      maxRequests,
      maxResponseBytes,
    },
  };
}

/** Arrival times are independent of response speed; no catch-up burst is queued. */
export function buildArrivalSchedule(phase, routes) {
  return Array.from({ length: phase.plannedRequests }, (_, index) => ({
    sequence: index,
    tenantAlias: `clinic-${String((index % 25) + 1).padStart(2, "0")}`,
    routeId: routes[((index % 25) + Math.floor(index / 25)) % routes.length].id,
    plannedOffsetMs:
      Math.round(((index * 1_000) / phase.requestsPerSecond) * 1_000) / 1_000,
  }));
}
