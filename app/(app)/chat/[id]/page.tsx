import { ChatContainer } from '@/components/chat/chat-container';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatContainer initialConversationId={id} />;
}
