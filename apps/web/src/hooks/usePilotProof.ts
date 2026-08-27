import { useCallback, useEffect, useState } from "react";
import { deploymentManifest } from "../config/hsk";
import type { PilotProofData } from "../types/pilot";
import { fetchPilotProof } from "../wallet/proof";

export function usePilotProof(manifest: typeof deploymentManifest): {
  proofData: PilotProofData;
  retry: () => void;
} {
  const [proofData, setProofData] = useState<PilotProofData>(() =>
    manifest.status === "deployed"
      ? { status: "loading" }
      : { status: "undeployed" },
  );
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    if (manifest.status !== "deployed") return;
    setProofData({ status: "loading" });
    setAttempt((value) => value + 1);
  }, [manifest.status]);

  useEffect(() => {
    let active = true;
    if (manifest.status !== "deployed") {
      return () => {
        active = false;
      };
    }

    fetchPilotProof({ manifest })
      .then((result) => {
        if (active) setProofData(result);
      })
      .catch(() => {
        if (active) {
          setProofData({
            status: "error",
            errorMessage:
              "The checked HSK contracts could not be reconciled at one safe block. Retry or inspect the configured addresses on Blockscout.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [attempt, manifest]);

  return { proofData, retry };
}
