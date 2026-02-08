import { describe, expect, it } from "vitest";
import {
  calculateReorderQuantity,
  canFulfillOrder,
  isCriticalStock,
  isLowStock,
} from "./inventoryRules";

describe("Inventory Business Rules", () => {
  describe("isLowStock", () => {
    it("should return true if quantity <= minQuantity", () => {
      expect(isLowStock(10, 10)).toBe(true);
      expect(isLowStock(5, 10)).toBe(true);
    });

    it("should return false if quantity > minQuantity", () => {
      expect(isLowStock(11, 10)).toBe(false);
    });
  });

  describe("isCriticalStock", () => {
    it("should return true if quantity < 50% of minQuantity", () => {
      expect(isCriticalStock(4, 10)).toBe(true); // 4 < 5
    });

    it("should return false if quantity >= 50% of minQuantity", () => {
      expect(isCriticalStock(5, 10)).toBe(false); // 5 == 5
      expect(isCriticalStock(6, 10)).toBe(false);
    });
  });

  describe("calculateReorderQuantity", () => {
    it("should calculate reorder quantity to reach max", () => {
      expect(calculateReorderQuantity(10, 20, 100)).toBe(90);
    });

    it("should return 0 or negative if current >= max (sanity check)", () => {
      // Though logic is just max - current, good to verify
      expect(calculateReorderQuantity(110, 20, 100)).toBe(-10);
    });
  });

  describe("canFulfillOrder", () => {
    it("should return true if available >= requested", () => {
      expect(canFulfillOrder(10, 5)).toBe(true);
      expect(canFulfillOrder(10, 10)).toBe(true);
    });

    it("should return false if available < requested", () => {
      expect(canFulfillOrder(10, 11)).toBe(false);
    });
  });
});
