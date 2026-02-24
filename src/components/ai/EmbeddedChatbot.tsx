import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2, Sparkles, RotateCcw } from '@/components/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChatbotStream, ChatMessage } from '@/hooks/useChatbotStream';
import { cn } from '@/lib/utils';

export const EmbeddedChatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { streamChat, isLoading } = useChatbotStream();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (userMessage: string) => {
    setInput('');
    await streamChat(userMessage, messages, setMessages);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSendMessage(input.trim());
  };

  const clearChat = () => {
    setMessages([]);
  };

  const quickQuestions = [
    { emoji: '📊', textKey: 'chatbot.quickExecutiveReport', category: 'report' },
    { emoji: '📈', textKey: 'chatbot.quickAnalyzeTrends', category: 'forecast' },
    { emoji: '⚠️', textKey: 'chatbot.quickUrgentReorder', category: 'analysis' },
    { emoji: '↩️', textKey: 'chatbot.quickReturnAnalysis', category: 'analysis' },
    { emoji: '🎯', textKey: 'chatbot.quickSlaPerformance', category: 'analysis' },
    { emoji: '💡', textKey: 'chatbot.quickOptimization', category: 'recommendation' },
  ];

  return (
    <div className="flex flex-col h-[600px] bg-card rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{t('chatbot.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('chatbot.smartSearch')}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {t('chatbot.restart')}
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-6">
            {/* Welcome message */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-4 max-w-[85%]">
                <p className="text-sm font-medium mb-2">
                  {t('chatbot.greeting')} 👋
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('chatbot.intro')}
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <strong>{t('chatbot.createReports')}</strong> - {t('chatbot.createReportsDesc')}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <strong>{t('chatbot.calculateForecasts')}</strong> - {t('chatbot.calculateForecastsDesc')}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <strong>{t('chatbot.conductAnalyses')}</strong> - {t('chatbot.conductAnalysesDesc')}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    <strong>{t('chatbot.giveRecommendations')}</strong> - {t('chatbot.giveRecommendationsDesc')}
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  {t('chatbot.askAnything')}
                </p>
              </div>
            </div>
            
            {/* Quick questions */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground px-1">
                {t('chatbot.frequentQuestions')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="justify-start text-left h-auto py-2.5 px-3 text-xs hover:bg-primary/5 hover:border-primary/30"
                    onClick={() => handleSendMessage(t(q.textKey))}
                    disabled={isLoading}
                  >
                    <span className="mr-2">{q.emoji}</span>
                    <span className="truncate">{t(q.textKey)}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3",
                  msg.role === 'user' && "flex-row-reverse"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                  msg.role === 'user' ? "bg-primary" : "bg-primary/10"
                )}>
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className={cn(
                  "rounded-lg p-3 max-w-[80%]",
                  msg.role === 'user' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                )}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content || '...'}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">{t('chatbot.thinking')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chatbot.inputPlaceholder')}
            disabled={isLoading}
            className="flex-1 bg-background"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};
