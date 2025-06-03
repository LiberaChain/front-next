"use client";

import AuthenticatedContentWrapper from "@components/AuthenticatedContentWrapper";
import ObjectGenerator from "./_components/ObjectGenerator";
import ObjectsList from "./_components/ObjectsList";
import ObjectsExplanation from "./_components/ObjectsExplanation";
import ObjectInteraction from "@components/ObjectInteraction";
import { useState } from "react";

// export const metadata = {
//   title: "Objects",
// };

export default function ObjectsPage() {
  const [selectedObjectId, setSelectedObjectId] = useState(null);

  const handleObjectSelect = (objectId) => {
    setSelectedObjectId(objectId);
  };

  return (
    <AuthenticatedContentWrapper title="Objects">
      <ObjectsExplanation />
      <ObjectGenerator />
      {selectedObjectId && (
        <ObjectInteraction objectId={selectedObjectId} />
      )}
      <ObjectsList onObjectSelect={handleObjectSelect} />
    </AuthenticatedContentWrapper>
  );
}
