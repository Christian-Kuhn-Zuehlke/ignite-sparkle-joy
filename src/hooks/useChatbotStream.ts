import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fulfillment-ai`;

interface UseChatbotStreamOptions {
  onError?: (error: string) => void;
}

export function useChatbotStream(options: UseChatbotStreamOptions = {}) {
  const { profile, activeCompanyId } = useAuth();
  const { language, t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const streamChat = useCallback(async (
    userMessage: string,
    currentMessages: ChatMessage[],
    onMessagesUpdate: (messages: ChatMessage[]) => void
  ) => {
    const newMessages: ChatMessage[] = [...currentMessages, { role: 'user', content: userMessage }];
    onMessagesUpdate(newMessages);
    setIsLoading(true);

    try {
      // Determine companyId - prefer profile.company_id, fallback to activeCompanyId
      const companyId = profile?.company_id || (activeCompanyId === 'ALL' ? undefined : activeCompanyId);

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          companyId,
          language,
        }),
      });

      if (!resp.ok) {
        let errorMessage = t('chatbot.errorRequest');
        try {
          const error = await resp.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${resp.status}: ${resp.statusText}`;
        }
        throw new Error(errorMessage);
      }

      if (!resp.body) throw new Error(t('chatbot.noResponse'));

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      // Add empty assistant message
      onMessagesUpdate([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              onMessagesUpdate([
                ...newMessages,
                { role: 'assistant', content: assistantContent }
              ]);
            }
          } catch {
            // Incomplete JSON, put back
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : t('chatbot.unknownError');
      onMessagesUpdate([
        ...newMessages,
        { role: 'assistant', content: `${t('common.error')}: ${errorMessage}` }
      ]);
      options.onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [profile, activeCompanyId, language, t, options]);

  return { streamChat, isLoading };
}
