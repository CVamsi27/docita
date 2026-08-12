import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLabTestsOrders } from "./use-lab-tests-orders";
import type { LabTestOrder } from "@workspace/types";

const mockMutate = vi.hoisted(() => vi.fn());
const mockVerifyPayment = vi.hoisted(() => ({
  mutate: mockMutate,
  isPending: false,
}));

vi.mock("@workspace/data-access", () => ({
  useVerifyLabOrderPayment: () => mockVerifyPayment,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

function makeOrder(
  id: string,
  overrides: Partial<LabTestOrder> = {},
): LabTestOrder {
  return {
    id,
    clinicId: "c1",
    patientId: `p-${id}`,
    labTestId: `lt-${id}`,
    status: "ORDERED",
    orderedBy: "doc1",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
    patient: { id: `p-${id}`, firstName: "John", lastName: "Doe" },
    labTest: {
      id: `lt-${id}`,
      name: "Test",
      category: "General",
      clinicId: "c1",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  } as LabTestOrder;
}

describe("useLabTestsOrders", () => {
  it("handleSort toggles null -> asc -> desc -> null on same key", () => {
    const { result } = renderHook(() => useLabTestsOrders([]));

    act(() => {
      result.current.handleSort("patient");
    });
    expect(result.current.sortConfig).toEqual({
      key: "patient",
      direction: "asc",
    });

    act(() => {
      result.current.handleSort("patient");
    });
    expect(result.current.sortConfig).toEqual({
      key: "patient",
      direction: "desc",
    });

    act(() => {
      result.current.handleSort("patient");
    });
    expect(result.current.sortConfig).toBeNull();
  });

  it("handleSort starts asc when switching to a new key", () => {
    const { result } = renderHook(() => useLabTestsOrders([]));

    act(() => {
      result.current.handleSort("patient");
    });
    act(() => {
      result.current.handleSort("patient");
    });
    expect(result.current.sortConfig).toEqual({
      key: "patient",
      direction: "desc",
    });

    act(() => {
      result.current.handleSort("status");
    });
    expect(result.current.sortConfig).toEqual({
      key: "status",
      direction: "asc",
    });
  });

  describe("sortedTests", () => {
    const alice = makeOrder("1", {
      patient: {
        id: "p1",
        firstName: "Alice",
        lastName: "A",
      },
      labTest: {
        id: "lt1",
        name: "CBC",
        category: "Hematology",
        clinicId: "c1",
        active: true,
        createdAt: "",
        updatedAt: "",
      },
      createdAt: "2026-01-20T10:00:00Z",
      status: "PENDING",
    });
    const bob = makeOrder("2", {
      patient: {
        id: "p2",
        firstName: "Bob",
        lastName: "B",
      },
      labTest: {
        id: "lt2",
        name: "X-ray",
        category: "Radiology",
        clinicId: "c1",
        active: true,
        createdAt: "",
        updatedAt: "",
      },
      createdAt: "2026-01-10T10:00:00Z",
      status: "COMPLETED",
    });

    it("sorts by patient name ascending", () => {
      const { result } = renderHook(() => useLabTestsOrders([bob, alice]));
      act(() => {
        result.current.handleSort("patient");
      });
      expect(result.current.sortedTests[0]?.id).toBe("1");
      expect(result.current.sortedTests[1]?.id).toBe("2");
    });

    it("sorts by patient name descending", () => {
      const { result } = renderHook(() => useLabTestsOrders([alice, bob]));
      act(() => {
        result.current.handleSort("patient");
      });
      act(() => {
        result.current.handleSort("patient");
      });
      expect(result.current.sortedTests[0]?.id).toBe("2");
      expect(result.current.sortedTests[1]?.id).toBe("1");
    });

    it("sorts by testName ascending", () => {
      const { result } = renderHook(() =>
        useLabTestsOrders([alice, bob]),
      );
      act(() => {
        result.current.handleSort("testName");
      });
      expect(result.current.sortedTests[0]?.labTest?.name).toBe("CBC");
      expect(result.current.sortedTests[1]?.labTest?.name).toBe("X-ray");
    });

    it("sorts by testName descending", () => {
      const { result } = renderHook(() =>
        useLabTestsOrders([bob, alice]),
      );
      act(() => {
        result.current.handleSort("testName");
      });
      act(() => {
        result.current.handleSort("testName");
      });
      expect(result.current.sortedTests[0]?.labTest?.name).toBe("X-ray");
      expect(result.current.sortedTests[1]?.labTest?.name).toBe("CBC");
    });

    it("sorts by orderDate ascending", () => {
      const { result } = renderHook(() =>
        useLabTestsOrders([alice, bob]),
      );
      act(() => {
        result.current.handleSort("orderDate");
      });
      expect(result.current.sortedTests[0]?.id).toBe("2");
      expect(result.current.sortedTests[1]?.id).toBe("1");
    });

    it("sorts by orderDate descending", () => {
      const { result } = renderHook(() =>
        useLabTestsOrders([bob, alice]),
      );
      act(() => {
        result.current.handleSort("orderDate");
      });
      act(() => {
        result.current.handleSort("orderDate");
      });
      expect(result.current.sortedTests[0]?.id).toBe("1");
      expect(result.current.sortedTests[1]?.id).toBe("2");
    });

    it("sorts by status ascending", () => {
      const { result } = renderHook(() =>
        useLabTestsOrders([alice, bob]),
      );
      act(() => {
        result.current.handleSort("status");
      });
      expect(result.current.sortedTests[0]?.status).toBe("COMPLETED");
      expect(result.current.sortedTests[1]?.status).toBe("PENDING");
    });

    it("sorts by status descending", () => {
      const { result } = renderHook(() =>
        useLabTestsOrders([bob, alice]),
      );
      act(() => {
        result.current.handleSort("status");
      });
      act(() => {
        result.current.handleSort("status");
      });
      expect(result.current.sortedTests[0]?.status).toBe("PENDING");
      expect(result.current.sortedTests[1]?.status).toBe("COMPLETED");
    });

    it("returns original order when sortConfig is null", () => {
      const { result } = renderHook(() =>
        useLabTestsOrders([bob, alice]),
      );
      expect(result.current.sortedTests).toEqual([bob, alice]);
    });
  });

  describe("handleVerify", () => {
    it("calls mutation with order id and CASH payment method", () => {
      const { result } = renderHook(() => useLabTestsOrders([]));
      const order = makeOrder("1");

      act(() => {
        result.current.handleVerify(order);
      });

      expect(mockMutate).toHaveBeenCalledWith(
        { id: "1", paymentMethod: "CASH" },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });

  it("returns isVerifying from the mutation", () => {
    const { result } = renderHook(() => useLabTestsOrders([]));
    expect(result.current.isVerifying).toBe(false);
  });
});
