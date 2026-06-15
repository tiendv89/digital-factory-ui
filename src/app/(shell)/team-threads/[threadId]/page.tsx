import { WorkspaceThreadChatPage } from "@/components/team-threads/workspace-thread-chat-page";

type ThreadRouteProps = {
  params: Promise<{ threadId: string }>;
};

export default async function WorkspaceThreadRoute({ params }: ThreadRouteProps) {
  const { threadId } = await params;
  return <WorkspaceThreadChatPage threadId={threadId} />;
}
