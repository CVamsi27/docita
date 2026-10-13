import {
  Calendar,
  CircleDot,
  FlaskConical,
  Inbox,
  MessageCircle,
  Package,
  Pill,
  Receipt,
  Stethoscope,
  Users,
} from "lucide-react";
import { Card } from "@workspace/ui/components/indicators/card";

/** Static Today illustration; sample data never comes from a patient API. */
export function PracticePreview() {
  return (
    <Card
      className="product"
      role="img"
      aria-label="Illustrative Today workspace using sample data"
    >
      <aside className="sidebar">
        <div className="side-brand">docita</div>
        <div className="micro">TRACK</div>
        <div className="side-item active">
          <CircleDot aria-hidden="true" strokeWidth={1.5} />
          Today
        </div>
        <div className="side-item">
          <Stethoscope aria-hidden="true" strokeWidth={1.5} />
          Consultation
        </div>
        <div className="side-item">
          <Calendar aria-hidden="true" strokeWidth={1.5} />
          Appointments
        </div>
        <div className="side-item">
          <Users aria-hidden="true" strokeWidth={1.5} />
          Patients
        </div>
        <div className="side-item">
          <Receipt aria-hidden="true" strokeWidth={1.5} />
          Invoices
        </div>
        <div className="side-item">
          <Pill aria-hidden="true" strokeWidth={1.5} />
          Prescriptions
        </div>
        <div className="side-item">
          <FlaskConical aria-hidden="true" strokeWidth={1.5} />
          Lab tests
        </div>
        <div className="micro">SERVICES</div>
        <div className="side-item">
          <MessageCircle aria-hidden="true" strokeWidth={1.5} />
          WhatsApp
        </div>
        <div className="side-item">
          <Inbox aria-hidden="true" strokeWidth={1.5} />
          Inbox
        </div>
        <div className="side-item">
          <Package aria-hidden="true" strokeWidth={1.5} />
          Inventory
        </div>
      </aside>
      <div className="product-main">
        <div className="product-top">
          <span>Today</span>
          <span>Demo workspace</span>
        </div>
        <h2 className="product-heading">Today</h2>
        <p className="product-meta">10 appointments today · 2 waiting</p>
        <div className="notice">
          <span>3 reports pending coding</span>
          <span>Review →</span>
        </div>
        <div className="live-grid">
          <Card className="queue-card">
            <p className="queue-label">NOW SERVING</p>
            <div className="queue-number">05</div>
            <p className="queue-name">Amit Patel</p>
            <div className="queue-meta">
              <span>Waiting · 2</span>
              <span>Avg wait · 30 m</span>
            </div>
            <div className="queue-meta">
              <span>Active · 1</span>
              <span>Done · 4</span>
            </div>
            <div className="queue-progress">
              <span></span>
            </div>
            <div className="queue-footer">View full queue</div>
          </Card>
          <Card className="clinical-card">
            <div>
              <h4>Current patient</h4>
              <p>In consultation</p>
            </div>
            <div className="patient-row">
              <span className="avatar">AP</span>
              <div>
                <strong>Amit Patel</strong>
                <p>Consultation · 10:30 AM</p>
              </div>
            </div>
            <span className="demo-action">In progress</span>
          </Card>
        </div>
        <Card className="followups">
          <h4>Follow-ups due today</h4>
          <p>Callbacks and planned reviews for today</p>
          <div className="followup-row">
            <span>Priya Nair</span>
            <span>Pending</span>
          </div>
        </Card>
      </div>
    </Card>
  );
}
