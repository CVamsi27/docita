import { describe, expect, it, vi, beforeEach } from "vitest";
import { getHospitalBeds } from "@/features/referrals/api/referrals.api";
import {
  BED_STATUS_TONE,
  HOSPITAL_BED_STATUS_KEYS,
} from "@/features/referrals/pages/referrals-page";
import { apiFetch } from "@/lib/api/api-client";
import enMessages from "@/messages/en/Referrals.json";
import hiMessages from "@/messages/hi/Referrals.json";
import { BedStatusEnum } from "@workspace/types";

vi.mock("@/lib/api/api-client", () => ({ apiFetch: vi.fn() }));

const en = enMessages.hospitalBeds;
const hi = hiMessages.hospitalBeds;
const mockApiFetch = vi.mocked(apiFetch);

describe("getHospitalBeds", () => {
  beforeEach(() => mockApiFetch.mockReset());

  it("reads the real beds endpoint, not a non-existent /hospital/beds", async () => {
    mockApiFetch.mockResolvedValue([]);
    await getHospitalBeds();
    expect(mockApiFetch).toHaveBeenCalledWith("/ipd/wards");
  });

  it("flattens wards -> rooms -> beds into one row per bed", async () => {
    mockApiFetch.mockResolvedValue([
      {
        name: "ICU",
        rooms: [
          {
            roomNumber: "101",
            beds: [
              { id: "b1", bedNumber: "1A", status: "OCCUPIED" },
              { id: "b2", bedNumber: "1B", status: "AVAILABLE" },
            ],
          },
          { roomNumber: "102", beds: [] },
        ],
      },
      {
        name: "General",
        rooms: [
          {
            roomNumber: "201",
            beds: [{ id: "b3", bedNumber: "2A", status: "CLEANING" }],
          },
        ],
      },
    ]);

    const beds = await getHospitalBeds();

    expect(beds).toEqual([
      { id: "b1", ward: "ICU", roomNumber: "101", bedNumber: "1A", status: "OCCUPIED" },
      { id: "b2", ward: "ICU", roomNumber: "101", bedNumber: "1B", status: "AVAILABLE" },
      { id: "b3", ward: "General", roomNumber: "201", bedNumber: "2A", status: "CLEANING" },
    ]);
  });

  it("skips wards and rooms that contain no beds", async () => {
    mockApiFetch.mockResolvedValue([
      { name: "Empty", rooms: [] },
      { name: "Also empty", rooms: [{ roomNumber: "1", beds: [] }] },
    ]);
    await expect(getHospitalBeds()).resolves.toEqual([]);
  });
});

describe("hospital bed status presentation", () => {
  it("covers every canonical BedStatusEnum member with a tone", () => {
    for (const status of BedStatusEnum.options) {
      expect(BED_STATUS_TONE[status]).toBeTruthy();
    }
    expect(Object.keys(BED_STATUS_TONE).sort()).toEqual(
      [...BedStatusEnum.options].sort(),
    );
  });

  it("gives available and occupied distinct tones", () => {
    expect(BED_STATUS_TONE.AVAILABLE).not.toBe(BED_STATUS_TONE.OCCUPIED);
  });

  it("names a label for every status in both locales", () => {
    for (const key of HOSPITAL_BED_STATUS_KEYS) {
      expect(en.status[key]).toBeTruthy();
      expect(hi.status[key]).toBeTruthy();
    }
  });

  it("keys the status labels off the canonical enum", () => {
    // Guards against the grid showing a raw "OCCUPIED" token: the label set and
    // the enum must stay the same size, with no unreachable branches.
    expect([...HOSPITAL_BED_STATUS_KEYS].sort()).toEqual(
      [...BedStatusEnum.options].sort(),
    );
  });

  it("uses human copy, not the raw wire token, in both locales", () => {
    for (const status of BedStatusEnum.options) {
      expect(en.status[status]).not.toBe(status);
      expect(hi.status[status]).not.toBe(status);
    }
  });
});