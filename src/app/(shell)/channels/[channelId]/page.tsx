import { ChannelChatPage } from "@/components/channels/channel-chat-page";

type ChannelRouteProps = {
  params: Promise<{ channelId: string }>;
};

export default async function ChannelRoute({ params }: ChannelRouteProps) {
  const { channelId } = await params;
  return <ChannelChatPage channelId={channelId} />;
}
