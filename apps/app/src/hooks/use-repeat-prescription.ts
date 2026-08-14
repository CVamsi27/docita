import { useNavigate } from "react-router";
import { toast } from "sonner";

export function useRepeatPrescription() {
  const navigate = useNavigate();

  const repeatPrescription = (appointmentId: string, patientId: string) => {
    sessionStorage.setItem("repeat_prescription_from", appointmentId);

    navigate(
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
