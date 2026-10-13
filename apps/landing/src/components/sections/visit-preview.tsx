import { CalendarCheck, Pill, Send } from "lucide-react";
import { Card } from "@workspace/ui/components/indicators/card";

/** Illustrative visit sequence using synthetic patient names and invoice amounts. */
export function VisitPreview({
  stage,
}: {
  stage: "check-in" | "consult" | "close";
}) {
  if (stage === "check-in")
    return (
      <Card
        className="mini-screen"
        role="img"
        aria-label="Illustrative queue with sample patients"
      >
        <h4>Today</h4>
        <p>10 appointments today · 2 waiting</p>
        <div className="mini-tabs">
          <span>Queue</span>
          <span>Appointments</span>
        </div>
        <div className="mini-row">
          <span className="avatar">AP</span>
          <div>
            <strong>Amit Patel</strong>
            <small>Consultation · 10:30 AM</small>
          </div>
          <span className="status">In room</span>
        </div>
        <div className="mini-row">
          <span className="avatar">PN</span>
          <div>
            <strong>Priya Nair</strong>
            <small>Follow-up · 10:45 AM</small>
          </div>
          <span className="status">Waiting</span>
        </div>
        <div className="mini-row">
          <span className="avatar">RI</span>
          <div>
            <strong>R. Iyer</strong>
            <small>Consultation · 11:00 AM</small>
          </div>
          <span className="status">Waiting</span>
        </div>
        <div className="mini-row">
          <span className="avatar">KP</span>
          <div>
            <strong>K. Patel</strong>
            <small>Walk-in</small>
          </div>
          <span className="status">Waiting</span>
        </div>
      </Card>
    );
  if (stage === "consult")
    return (
      <Card
        className="mini-screen"
        role="img"
        aria-label="Illustrative consultation with sample data"
      >
        <div className="visit-person">
          <span className="avatar">AP</span>
          <strong>Amit Patel</strong>
          <span className="small">41 yrs · Male</span>
        </div>
        <div className="mini-tabs">
          <span>Consultation</span>
          <span>History</span>
          <span>Prescriptions</span>
        </div>
        <div className="field-label">Consultation notes</div>
        <Card className="notes">
          <strong>Follow-up consultation</strong>
          <br />
          Reviewed previous visit.
          <br />
          Record findings and next steps here.
        </Card>
        <div className="field-label">Prescription</div>
        <div className="rx-row">
          <Pill aria-hidden="true" strokeWidth={1.5} />
          <div>
            Prescription draft
            <small>Review medication and dose details</small>
          </div>
        </div>
        <div className="rx-row">
          <CalendarCheck aria-hidden="true" strokeWidth={1.5} />
          <div>
            Next review<small>Plan a follow-up with the patient</small>
          </div>
        </div>
      </Card>
    );
  return (
    <Card
      className="mini-screen"
      role="img"
      aria-label="Illustrative invoice with sample amounts"
    >
      <h4>Visit invoice</h4>
      <p>Amit Patel · Demo visit</p>
      <div className="mini-tabs">
        <span>Invoice</span>
        <span>Prescription</span>
        <span>Follow-up</span>
      </div>
      <div className="bill-row">
        <span>Consultation fee</span>
        <span>₹600</span>
      </div>
      <div className="bill-row">
        <span>Lab tests</span>
        <span>₹1,200</span>
      </div>
      <div className="bill-row bill-total">
        <span>Total</span>
        <span>₹1,800</span>
      </div>
      <Card className="bill-ready">
        Invoice generated
        <small>Visit documents ready to share.</small>
      </Card>
      <div className="share">
        <Send aria-hidden="true" strokeWidth={1.5} />
        Patient consent required
      </div>
    </Card>
  );
}
