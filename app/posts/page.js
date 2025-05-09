import CreatePost from "./_components/CreatePost";
import Posts from "./_components/Posts";
import AuthenticatedContentWrapper from "../_components/AuthenticatedContentWrapper";

export const metadata = {
  title: "Posts",
};

export default function PostsPage() {
  return (
    <AuthenticatedContentWrapper title="Posts">
      {/* Left Column - New Post Form */}
      <CreatePost />

      {/* Right Column - Posts Feed */}
      <Posts />
    </AuthenticatedContentWrapper>
  );
}
