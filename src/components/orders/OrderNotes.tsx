import { useState, useEffect } from 'react';
import { MessageSquare, Send, Pin, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface OrderNote {
  id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  content: string;
  is_pinned: boolean | null;
  created_at: string;
  updated_at: string;
}

interface OrderNotesProps {
  orderId: string;
}

export function OrderNotes({ orderId }: OrderNotesProps) {
  const { user, profile } = useAuth();
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotes();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`order-notes-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_notes',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          loadNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('order_notes')
        .select('*')
        .eq('order_id', orderId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !user) return;

    setSubmitting(true);
    try {
      const userName = profile?.full_name || profile?.email || user.email || 'Unbekannt';
      
      const { error } = await supabase.from('order_notes').insert({
        order_id: orderId,
        user_id: user.id,
        user_name: userName,
        content: newNote.trim(),
      });

      if (error) throw error;
      
      setNewNote('');
      toast.success('Notiz hinzugefügt');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Fehler beim Hinzufügen der Notiz');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePin = async (note: OrderNote) => {
    try {
      const { error } = await supabase
        .from('order_notes')
        .update({ is_pinned: !note.is_pinned })
        .eq('id', note.id);

      if (error) throw error;
      toast.success(note.is_pinned ? 'Notiz gelöst' : 'Notiz angepinnt');
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('order_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      toast.success('Notiz gelöscht');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-cyan-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="border-b border-border px-4 md:px-5 py-3 md:py-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent" />
          <h3 className="font-heading text-sm md:text-base font-semibold text-foreground">
            Team-Notizen ({notes.length})
          </h3>
        </div>
      </div>

      {/* Notes List */}
      <div className="max-h-[300px] overflow-y-auto">
        {notes.length === 0 ? (
          <div className="px-4 md:px-5 py-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Noch keine Notizen vorhanden
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`px-4 md:px-5 py-3 ${note.is_pinned ? 'bg-accent/5' : ''}`}
              >
                <div className="flex gap-3">
                  <Avatar className={`h-8 w-8 ${getAvatarColor(note.user_name)}`}>
                    <AvatarFallback className="text-xs text-white bg-transparent">
                      {getInitials(note.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground">
                        {note.user_name}
                      </span>
                      {note.is_pinned && (
                        <Pin className="h-3 w-3 text-accent fill-accent" />
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(note.created_at), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                      {note.content}
                    </p>
                    {user?.id === note.user_id && (
                      <div className="flex gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => togglePin(note)}
                        >
                          <Pin className={`h-3 w-3 mr-1 ${note.is_pinned ? 'fill-current' : ''}`} />
                          {note.is_pinned ? 'Lösen' : 'Anpinnen'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Löschen
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Note Form */}
      {user && (
        <form onSubmit={handleSubmit} className="border-t border-border p-4 md:p-5">
          <div className="flex gap-3">
            <Avatar className={`h-8 w-8 ${getAvatarColor(profile?.full_name || user.email || 'U')}`}>
              <AvatarFallback className="text-xs text-white bg-transparent">
                {getInitials(profile?.full_name || user.email || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Notiz hinzufügen..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit(e);
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  ⌘/Ctrl + Enter zum Senden
                </span>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!newNote.trim() || submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Senden
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
