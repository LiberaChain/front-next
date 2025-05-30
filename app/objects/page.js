import AuthenticatedContentWrapper from "@components/AuthenticatedContentWrapper";
import ObjectGenerator from "./_components/ObjectGenerator";
import ObjectsList from "./_components/ObjectsList";
import ObjectsExplanation from "./_components/ObjectsExplanation";

export const metadata = {
  title: "Objects",
};

export default function ObjectsPage() {
  return (
    <AuthenticatedContentWrapper title="Objects">
      <ObjectsExplanation />
      <ObjectGenerator />
      <ObjectsList />
    </AuthenticatedContentWrapper>
  );
}
