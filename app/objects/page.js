"use client";

import AuthenticatedContentWrapper from "@components/AuthenticatedContentWrapper";
import ObjectGenerator from "./_components/ObjectGenerator";
import ObjectsList from "./_components/ObjectsList";
import ObjectsExplanation from "./_components/ObjectsExplanation";
import ObjectInteraction from "@components/ObjectInteraction";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CollectedObjectsList from "./_components/CollectedObjectsList";

// export const metadata = {
//   title: "Objects",
// };
export default function ObjectsPage() {
    const [selectedObjectId, setSelectedObjectId] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const searchParams = useSearchParams();
    const redeemCode = searchParams.get('redeem');
    const key = searchParams.get('key');

    // Set selected object from redeem parameter on initial load
    useEffect(() => {
        if (redeemCode && redeemCode.length > 0 && key && key.length > 0) {
            console.log("Redeem code with key found in URL:", redeemCode, key);
        }
    }, [redeemCode, key]);

    const handleObjectSelect = (objectId) => {
        setSelectedObjectId(objectId);
    };

    const handleRefresh = async () => {
        setSelectedObjectId(null);
        setRefreshTrigger((prev) => prev + 1);
    }

    return (
        <AuthenticatedContentWrapper title="Objects">
            <ObjectsExplanation />
            <ObjectGenerator refreshObjectsList={handleRefresh} />
            {selectedObjectId && (
                <ObjectInteraction objectId={selectedObjectId} />
            )}
            <ObjectsList onObjectSelect={handleObjectSelect} refreshTrigger={refreshTrigger} />
            <CollectedObjectsList />
        </AuthenticatedContentWrapper>
    );
}
