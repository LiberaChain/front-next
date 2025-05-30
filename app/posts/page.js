import CreatePost from "./_components/CreatePost";
import PostsFeed from "./_components/PostsFeed";
import AuthenticatedContentWrapper from "@components/AuthenticatedContentWrapper";

export const metadata = {
  title: "Posts",
};

export default function PostsPage() {
  return (
    <AuthenticatedContentWrapper title="Posts">
      <CreatePost />
      <PostsFeed />
    </AuthenticatedContentWrapper>
  );
}
