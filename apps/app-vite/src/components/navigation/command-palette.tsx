import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CommandPaletteShell } from "@workspace/ui/components/overlay/command-palette-shell";
import {
  CalendarClock,
  ClipboardList,
  CreditCard,
  PlusCircle,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import type { CommandPaletteAction } from "@workspace/ui/components/overlay/command-palette-shell";

const NAV_GROUP = "Navigation";
const QUICK_GROUP = "Quick Actions";

const QUICK_ACTIONS: CommandPaletteAction[] = [
  {
    id: "nav-today",
    label: "Today's schedule",
    group: NAV_GROUP,
    icon: <CalendarClock className="size-4" />,
    keywords: ["today", "agenda", "day", "schedule"],
    onRun: () => {},
  },
  {
    id: "nav-patients",
    label: "Patients",
    group: NAV_GROUP,
    icon: <Users className="size-4" />,
    keywords: ["patients", "list", "search"],
    onRun: () => {},
  },
  {
    id: "nav-plan-billing",
    label: "Plan & Billing",
    group: NAV_GROUP,
    icon: <CreditCard className="size-4" />,
    keywords: ["plan", "billing", "subscription", "upgrade", "settings"],
    onRun: () => {},
  },
  {
    id: "quick-new-patient",
    label: "New patient",
    group: QUICK_GROUP,
    icon: <PlusCircle className="size-4" />,
    keywords: ["create", "add", "register"],
    onRun: () => {},
  },
  {
    id: "quick-start-consultation",
    label: "Start consultation",
    group: QUICK_GROUP,
    icon: <Stethoscope className="size-4" />,
    keywords: ["queue", "next patient"],
    onRun: () => {},
  },
  {
    id: "quick-coding-queue",
    label: "Coding queue",
    group: QUICK_GROUP,
    icon: <ClipboardList className="size-4" />,
    keywords: ["medical coding", "claims", "pending"],
    onRun: () => {},
  },
];

const AI_ACTION: CommandPaletteAction = {
  id: "ai-ask",
  label: "Ask AI",
  group: "AI",
  icon: <Sparkles className="size-4" />,
  keywords: ["assistant", "chat", "prompt"],
  onRun: () => {},
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("docita:open-command-palette", handler);
    return () => window.removeEventListener("docita:open-command-palette", handler);
  }, []);

  const actions = QUICK_ACTIONS.map((a) => ({
    ...a,
    onRun: () => {
      setOpen(false);
      if (a.id.startsWith("nav-today")) navigate("/today");
      else if (a.id.startsWith("nav-patients")) navigate("/patients");
      else if (a.id === "nav-plan-billing") navigate("/settings?tab=subscription");
      else if (a.id === "quick-new-patient") navigate("/patients?action=new");
      else if (a.id === "quick-start-consultation") navigate("/consultation");
      else if (a.id === "quick-coding-queue") navigate("/coding-queue");
    },
  }));

  return (
    <CommandPaletteShell
      open={open}
      onOpenChange={setOpen}
      actions={[...actions, AI_ACTION]}
      placeholder="Search or type a command..."
      groupOrder={[NAV_GROUP, "AI", QUICK_GROUP]}
    />
  );
}
