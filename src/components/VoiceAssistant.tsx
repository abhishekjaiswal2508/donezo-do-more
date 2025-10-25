import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

// Declare Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceAssistant = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Recognized:', transcript);
        setIsRecording(false);
        await processCommand(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast({
          title: 'Recognition Error',
          description: 'Failed to recognize speech. Please try again.',
          variant: 'destructive'
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Not Supported',
        description: 'Speech recognition is not supported in your browser',
        variant: 'destructive'
      });
      return;
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);
      toast({ title: 'Listening...', description: 'Speak your command' });
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast({
        title: 'Recognition Error',
        description: 'Failed to start speech recognition',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const processCommand = async (transcribedText: string) => {
    setIsProcessing(true);
    
    try {
      toast({ title: 'I heard:', description: transcribedText });

      // Add user message to conversation history
      const updatedHistory = [...conversationHistory, { role: 'user', content: transcribedText }];

      // Detect if it's a query, delete, or create command
      const isQuery = /how many|what|show|tell|list|pending|upcoming|overdue/i.test(transcribedText);
      const isDelete = /delete|remove|cancel|clear/i.test(transcribedText);

      // Process with AI using Gemini
      const action = isQuery ? 'query' : isDelete ? 'delete' : 'create';
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        'voice-assistant',
        { body: { text: transcribedText, action, conversationHistory: updatedHistory } }
      );

      if (aiError) throw aiError;

      // Handle query response
      if (aiData.type === 'response') {
        const assistantMessage = { role: 'assistant', content: aiData.message };
        setConversationHistory([...updatedHistory, assistantMessage]);
        
        toast({ 
          title: 'Assistant', 
          description: aiData.message,
          duration: 8000 
        });
        return;
      }

      // Handle clarification needed
      if (aiData.type === 'clarification') {
        const assistantMessage = { role: 'assistant', content: aiData.message };
        setConversationHistory([...updatedHistory, assistantMessage]);
        
        toast({ 
          title: 'Need more info', 
          description: aiData.message,
          duration: 6000
        });
        return;
      }

      // Handle delete success
      if (aiData.type === 'delete_success') {
        const successMessage = aiData.message;
        setConversationHistory([...updatedHistory, { role: 'assistant', content: successMessage }]);
        
        toast({ 
          title: 'Deleted!', 
          description: successMessage 
        });
        
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
        queryClient.invalidateQueries({ queryKey: ['exams'] });
        return;
      }

      // Step 3: Create exam or reminder
      if (aiData.type === 'exam') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('auth_user_id', user.id)
          .single();

        // Ensure exam_type is one of the valid values
        const validExamTypes = ['Internal Test', 'Viva', 'Mid-Sem', 'Final'];
        const examType = validExamTypes.includes(aiData.exam_type) 
          ? aiData.exam_type 
          : 'Internal Test'; // Default fallback

        const { error: examError } = await supabase
          .from('exams')
          .insert({
            subject: aiData.subject,
            exam_date: aiData.date,
            exam_type: examType,
            description: aiData.description || '',
            created_by: user.id,
            uploader_name: userData?.username || 'Unknown'
          });

        if (examError) {
          if (examError.message.includes('duplicate') || examError.message.includes('already')) {
            toast({ 
              title: 'Already exists', 
              description: 'This exam is already scheduled',
              variant: 'destructive' 
            });
          } else {
            throw examError;
          }
        } else {
          const successMessage = `Exam created: ${aiData.subject} on ${aiData.date}`;
          setConversationHistory([...updatedHistory, { role: 'assistant', content: successMessage }]);
          toast({ 
            title: 'Exam created!', 
            description: `${aiData.subject} on ${aiData.date}` 
          });
          queryClient.invalidateQueries({ queryKey: ['exams'] });
        }
      } else if (aiData.type === 'reminder') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error: reminderError } = await supabase
          .from('reminders')
          .insert({
            title: aiData.title,
            subject: aiData.subject,
            deadline: aiData.date,
            description: aiData.description || '',
            created_by: user.id
          });

        if (reminderError) {
          if (reminderError.message.includes('duplicate') || reminderError.message.includes('already')) {
            toast({ 
              title: 'Already exists', 
              description: 'This reminder is already created',
              variant: 'destructive' 
            });
          } else {
            throw reminderError;
          }
        } else {
          const successMessage = `Reminder created: ${aiData.title} due ${aiData.date}`;
          setConversationHistory([...updatedHistory, { role: 'assistant', content: successMessage }]);
          toast({ 
            title: 'Reminder created!', 
            description: `${aiData.title} due ${aiData.date}` 
          });
          queryClient.invalidateQueries({ queryKey: ['reminders'] });
        }
      }

    } catch (error) {
      console.error('Processing error:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to process voice command',
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        size="lg"
        className="h-16 w-16 rounded-full shadow-lg"
        variant={isRecording ? 'destructive' : 'default'}
      >
        {isProcessing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
};
