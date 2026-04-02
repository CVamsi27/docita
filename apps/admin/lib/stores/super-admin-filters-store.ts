import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SuperAdminFiltersState {
  selectedClinic: string;
  userSearch: string;
  doctorSearch: string;
  adminSearch: string;
  setSelectedClinic: (value: string) => void;
  setUserSearch: (value: string) => void;
  setDoctorSearch: (value: string) => void;
  setAdminSearch: (value: string) => void;
  resetFilters: () => void;
}

const STORAGE_KEY = "docita-admin-shared-filters";

export const useSuperAdminFiltersStore = create<SuperAdminFiltersState>()(
  persist(
    (set) => ({
      selectedClinic: "all",
      userSearch: "",
      doctorSearch: "",
      adminSearch: "",
      setSelectedClinic: (value) => set({ selectedClinic: value }),
      setUserSearch: (value) => set({ userSearch: value }),
      setDoctorSearch: (value) => set({ doctorSearch: value }),
      setAdminSearch: (value) => set({ adminSearch: value }),
      resetFilters: () =>
        set({
          selectedClinic: "all",
          userSearch: "",
          doctorSearch: "",
          adminSearch: "",
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        selectedClinic: state.selectedClinic,
        userSearch: state.userSearch,
        doctorSearch: state.doctorSearch,
        adminSearch: state.adminSearch,
      }),
    },
  ),
);

