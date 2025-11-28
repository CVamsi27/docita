import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useRepeatPrescription() {
  const router = useRouter();

  const repeatPrescription = (appointmentId: string, patientId: string) => {
    // Store the appointment ID to copy from in session storage
    sessionStorage.setItem("repeat_prescription_from", appointmentId);

    // Navigate to create new appointment for this patient
    router.push(
      `/appointments?patientId=${patientId}&action=new&repeatPrescription=true`,
    );

    toast.info("Create a new appointment to repeat this prescription");
  };

  const getRepeatPrescriptionData = () => {
    const appointmentId = sessionStorage.getItem("repeat_prescription_from");
    if (appointmentId) {
      sessionStorage.removeItem("repeat_prescription_from");
      return appointmentId;
    }
    return null;
  };

  return {
    repeatPrescription,
    getRepeatPrescriptionData,
  };
}
