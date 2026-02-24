import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Bot, User, Loader2, Sparkles } from '@/components/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChatbotStream, ChatMessage } from '@/hooks/useChatbotStream';
import { cn } from '@/lib/utils';

export const FulfillmentChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
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

  const quickQuestions = [
    { emoji: '🔍', text: t('chatbot.quickSearchOrder') },
    { emoji: '📦', text: t('chatbot.quickLowStock') },
    { emoji: '↩️', text: t('chatbot.quickOpenReturns') },
    { emoji: '📊', text: t('chatbot.quickKpis') },
    { emoji: '🚚', text: t('chatbot.quickRecentOrders') },
  ];

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-[hsl(var(--primary-button))] hover:bg-[hsl(var(--primary-button-hover))] text-primary-foreground",
          "transition-transform hover:scale-110"
        )}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-96 h-[500px] shadow-2xl border-2 flex flex-col">
          <CardHeader className="pb-3 bg-gradient-to-r from-primary to-accent rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-primary-foreground">
              <Sparkles className="h-5 w-5" />
              <div>
                <span>{t('chatbot.title')}</span>
                <span className="ml-2 text-xs font-normal opacity-80">{t('chatbot.smartSearch')}</span>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                      <p className="text-sm">
                        {t('chatbot.greeting')} 👋 {t('chatbot.intro')}
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• {t('chatbot.exampleOrder')}</li>
                        <li>• {t('chatbot.exampleCustomer')}</li>
                        <li>• {t('chatbot.exampleSku')}</li>
                        <li>• {t('chatbot.exampleStock')}</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground px-2">{t('chatbot.quickQuestions')}:</p>
                    {quickQuestions.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2 text-xs"
                        onClick={() => handleSendMessage(`${q.emoji} ${q.text}`)}
                        disabled={isLoading}
                      >
                        {q.emoji} {q.text}
                      </Button>
                    ))}
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
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chatbot.placeholder')}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
};
