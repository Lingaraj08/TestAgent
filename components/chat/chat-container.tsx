'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessages, type DisplayMessage } from './chat-messages';
import { ChatComposer, type WorkspaceMode } from './chat-composer';
import { ApprovalDialog } from './approval-dialog';
import type { OperationalEvent } from '@/agents/types';
import type { ToolArtifact } from '@/types/tools';

interface ChatContainerProps {
  initialConversationId?: string | null;
}

export function ChatContainer({ initialConversationId = null }: ChatContainerProps) {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Model & Mode selection state
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('agent');
  const [selectedMode, setSelectedMode] = useState<'auto' | 'manual'>('auto');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [activeModelName, setActiveModelName] = useState<string | undefined>(undefined);

  // Operational events & artifacts for the active run
  const [activeEvents, setActiveEvents] = useState<OperationalEvent[]>([]);
  const [activeArtifacts, setActiveArtifacts] = useState<ToolArtifact[]>([]);

  // Confirmation modal state
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversation details and messages if conversationId exists
  useEffect(() => {
    if (conversationId) {
      fetch(`/api/conversations/${conversationId}/messages`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load messages');
          return res.json();
        })
        .then((data) => {
          setMessages(
            (data.messages || []).map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              created_at: m.created_at,
            }))
          );
        })
        .catch((e) => console.error(e));

      fetch(`/api/conversations/${conversationId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.conversation) {
            setSelectedMode(data.conversation.is_auto_model ? 'auto' : 'manual');
            setSelectedModelId(data.conversation.model_id || null);
          }
        })
        .catch((e) => console.error(e));
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  const handleModelSelect = (mode: 'auto' | 'manual', modelId: string | null) => {
    setSelectedMode(mode);
    setSelectedModelId(modelId);
  };

  const handleSendMessage = async (
    content: string,
    attachments: any[] = [],
    mode: WorkspaceMode = workspaceMode
  ) => {
    setError(null);
    setActiveEvents([]);
    setActiveArtifacts([]);

    let fullContent = content;
    if (attachments.length > 0) {
      const fileNames = attachments.map((a) => a.filename).join(', ');
      fullContent = `${content ? content + '\n\n' : ''}[Attached files: ${fileNames}]`;
    }

    const newUserMsg: DisplayMessage = {
      role: 'user',
      content: fullContent,
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Check if user is in Chat mode (direct LLM streaming) or Agent / Search / Deep Research mode (supervisor tool engine)
    if (mode === 'chat') {
      // 1. Direct LLM chat streaming
      const assistantMsgPlaceholder: DisplayMessage = {
        role: 'assistant',
        content: '',
        isStreaming: true,
      };
      setMessages([...updatedMessages, assistantMsgPlaceholder]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            modelSelection: {
              mode: selectedMode,
              modelId: selectedMode === 'manual' ? selectedModelId : undefined,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error: ${response.status}`);
        }

        const returnedConvId = response.headers.get('x-conversation-id');
        const isNew = response.headers.get('x-is-new-conversation') === 'true';
        const returnedModelName = response.headers.get('x-selected-model-name');

        if (returnedModelName) setActiveModelName(returnedModelName);

        if (returnedConvId && returnedConvId !== conversationId) {
          setConversationId(returnedConvId);
          window.dispatchEvent(new Event('refresh-conversations'));
          if (isNew) {
            window.history.replaceState(null, '', `/chat/${returnedConvId}`);
          }
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response stream unavailable');

        const decoder = new TextDecoder();
        let accumulatedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const parsed = JSON.parse(line.slice(2));
                accumulatedText += parsed;
              } catch {
                accumulatedText += line.slice(2);
              }
            } else if (line.trim().length > 0 && !line.startsWith('d:') && !line.startsWith('e:')) {
              accumulatedText += line;
            }
          }

          setMessages((prev) => {
            const newArr = [...prev];
            const lastIdx = newArr.length - 1;
            if (lastIdx >= 0 && newArr[lastIdx].role === 'assistant') {
              newArr[lastIdx] = {
                ...newArr[lastIdx],
                content: accumulatedText,
                isStreaming: true,
              };
            }
            return newArr;
          });
        }

        setMessages((prev) => {
          const newArr = [...prev];
          const lastIdx = newArr.length - 1;
          if (lastIdx >= 0 && newArr[lastIdx].role === 'assistant') {
            newArr[lastIdx] = {
              ...newArr[lastIdx],
              content: accumulatedText,
              isStreaming: false,
            };
          }
          return newArr;
        });

        window.dispatchEvent(new Event('refresh-conversations'));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to send message');
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && !last.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    } else {
      // 2. Supervisor Tool Agent Mode (SSE Stream)
      const assistantMsgPlaceholder: DisplayMessage = {
        role: 'assistant',
        content: '',
        isStreaming: true,
      };
      setMessages([...updatedMessages, assistantMsgPlaceholder]);

      try {
        const response = await fetch('/api/agent/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: fullContent,
            conversationId,
            attachments,
            mode,
            modelId: selectedMode === 'manual' ? selectedModelId : undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Agent error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No SSE stream returned');

        const decoder = new TextDecoder();
        let buffer = '';
        let finalAnswerReceived = '';
        const collectedArtifacts: ToolArtifact[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            const jsonStr = trimmed.slice(6);
            try {
              const data = JSON.parse(jsonStr);

              if (data.type === 'init' && data.conversationId) {
                if (data.conversationId !== conversationId) {
                  setConversationId(data.conversationId);
                  window.dispatchEvent(new Event('refresh-conversations'));
                  window.history.replaceState(null, '', `/chat/${data.conversationId}`);
                }
              } else if (data.type === 'operational_event') {
                setActiveEvents((prev) => [...prev, data.event]);
                if (data.event.type === 'waiting_approval' && data.event.data?.approvalId) {
                  const approval = data.event.data;
                  setApprovalModal({
                    isOpen: true,
                    title: approval.action === 'form_fill' ? 'Prepare application fields' : 'Approval required',
                    description: `The agent wants to ${approval.action === 'form_fill' ? 'prepare fields for' : 'perform an external action on'} ${approval.target}. No final submission will occur without a separate confirmation.`,
                    onConfirm: async () => { await fetch(`/api/approvals/${approval.approvalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'approved' }) }); setApprovalModal((current) => ({ ...current, isOpen: false })); },
                    onCancel: async () => { await fetch(`/api/approvals/${approval.approvalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'denied' }) }); setApprovalModal((current) => ({ ...current, isOpen: false })); },
                  });
                }
              } else if (data.type === 'artifact') {
                collectedArtifacts.push(data.artifact);
                setActiveArtifacts((prev) => [...prev, data.artifact]);
              } else if (data.type === 'final_answer') {
                finalAnswerReceived = data.answer;
                setMessages((prev) => {
                  const newArr = [...prev];
                  const lastIdx = newArr.length - 1;
                  if (lastIdx >= 0 && newArr[lastIdx].role === 'assistant') {
                    newArr[lastIdx] = {
                      ...newArr[lastIdx],
                      content: finalAnswerReceived,
                      artifacts: collectedArtifacts,
                      isStreaming: false,
                    };
                  }
                  return newArr;
                });
              } else if (data.type === 'error') {
                setError(data.message);
              }
            } catch {
              // Ignore non-json data
            }
          }
        }

        // Finalize
        setMessages((prev) => {
          const newArr = [...prev];
          const lastIdx = newArr.length - 1;
          if (lastIdx >= 0 && newArr[lastIdx].role === 'assistant') {
            newArr[lastIdx] = {
              ...newArr[lastIdx],
              content: finalAnswerReceived || 'Task completed.',
              artifacts: collectedArtifacts,
              isStreaming: false,
            };
          }
          return newArr;
        });

        window.dispatchEvent(new Event('refresh-conversations'));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Agent execution failed:', err);
          setError(err.message || 'Agent error');
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && !last.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#090d16]">
      <ChatMessages
        messages={messages}
        isStreaming={isStreaming}
        error={error}
        activeEvents={activeEvents}
        activeArtifacts={activeArtifacts}
        onQuickPrompt={(prompt) => handleSendMessage(prompt, [], workspaceMode)}
      />

      <ChatComposer
        onSendMessage={handleSendMessage}
        onStop={handleStop}
        isStreaming={isStreaming}
        selectedMode={selectedMode}
        selectedModelId={selectedModelId}
        onModelSelect={handleModelSelect}
        activeModelName={activeModelName}
        conversationId={conversationId}
        mode={workspaceMode}
        onModeChange={setWorkspaceMode}
      />

      <ApprovalDialog
        isOpen={approvalModal.isOpen}
        actionTitle={approvalModal.title}
        description={approvalModal.description}
        onConfirm={approvalModal.onConfirm}
        onCancel={approvalModal.onCancel}
      />
    </div>
  );
}
