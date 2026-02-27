import { useEffect, useState } from "react";
import FreezerApp from "@/components/FreezerApp";
import PriceHunterApp from "@/components/PriceHunterApp";

export type AppView = "freezer" | "price-hunter";

function getInitialView(): AppView {
  if (typeof window === "undefined") return "freezer";
  const hash = window.location.hash?.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  if (hash === "#price-hunter" || params.get("view") === "price-hunter") {
    return "price-hunter";
  }
  return "freezer";
}

export default function AppShell() {
  const [view, setView] = useState<AppView>(getInitialView);

  useEffect(() => {
    const target = view === "price-hunter" ? "/#price-hunter" : "/";
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (current !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [view]);

  const onSwitchToPriceHunter = () => setView("price-hunter");
  const onSwitchToFreezer = () => setView("freezer");

  if (view === "price-hunter") {
    return <PriceHunterApp onSwitchToFreezer={onSwitchToFreezer} />;
  }

  return <FreezerApp onSwitchToPriceHunter={onSwitchToPriceHunter} />;
}
