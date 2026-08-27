import { useCallback, useEffect, useState } from "react";
import type { RouteState } from "../types/pilot";

function getRouteFromLocation(): RouteState {
  if (typeof window === "undefined") return "landing";
  const hash = window.location.hash.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  if (hash === "#pilot" || path === "/pilot") {
    return "pilot";
  }
  if (hash === "#controls" || path === "/controls") {
    return "controls";
  }
  if (hash === "#create" || path === "/create") {
    return "create";
  }
  if (hash === "#holder" || path === "/holder") {
    return "holder";
  }
  return "landing";
}

export function useRoute(): {
  route: RouteState;
  navigate: (newRoute: RouteState) => void;
} {
  const [route, setRoute] = useState<RouteState>(getRouteFromLocation);

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(getRouteFromLocation());
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const navigate = useCallback((newRoute: RouteState) => {
    setRoute(newRoute);
    if (typeof window !== "undefined") {
      const targetHash =
        newRoute === "pilot"
          ? "#pilot"
          : newRoute === "controls"
            ? "#controls"
            : newRoute === "create"
              ? "#create"
              : newRoute === "holder"
                ? "#holder"
                : "#landing";
      if (window.location.hash !== targetHash) {
        window.history.pushState({}, "", targetHash);
      }

      const appRoot = document.getElementById("root");
      if (typeof appRoot?.scrollIntoView === "function") {
        appRoot.scrollIntoView({ block: "start" });
      }
    }
  }, []);

  return { route, navigate };
}
