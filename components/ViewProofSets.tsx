// components/ManageProofSets.tsx
"use client";

import { useAccount } from "wagmi";
import { useProofsets } from "@/hooks/useProofsets";

export function ViewProofSets() {
  const { isConnected } = useAccount();

  const { data, isLoading: isProofsetsLoading } = useProofsets();

  if (!isConnected) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border rounded-lg">
      {isProofsetsLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="p-2">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-medium">Proof Sets</h4>
          </div>
          {data && data.proofsets && data.proofsets.length > 0 ? (
            data.proofsets.map((proofset) => (
              <div key={proofset.railId} className="overflow-auto">
                <pre className="text-sm">
                  {JSON.stringify(
                    {
                      ...proofset,
                      details:
                        data?.proofsetDetails?.find(
                          (p: any) => p.id === proofset.pdpVerifierProofSetId
                        ) ?? {},
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            ))
          ) : (
            <p>No proof sets found</p>
          )}
        </div>
      )}
    </div>
  );
}
