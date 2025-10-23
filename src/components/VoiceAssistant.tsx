import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const VoiceAssistant = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: 'Listening...', description: 'Speak your command' });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({ 
        title: 'Microphone Error', 
        description: 'Please allow microphone access',
        variant: 'destructive' 
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert audio to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Step 1: Transcribe audio
      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke(
        'voice-to-text',
        { body: { audio: base64Audio } }
      );

      if (transcriptError) throw transcriptError;
      const transcribedText = transcriptData.text;
      console.log('Transcribed:', transcribedText);

      toast({ title: 'I heard:', description: transcribedText });

      // Detect if it's a query or create command
      const isQuery = /how many|what|show|tell|list|pending|upcoming/i.test(transcribedText);

      // Step 2: Process with AI
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        'voice-assistant',
        { body: { text: transcribedText, action: isQuery ? 'query' : 'create' } }
      );

      if (aiError) throw aiError;

      // Handle query response
      if (aiData.type === 'response') {
        toast({ 
          title: 'Assistant', 
          description: aiData.message,
          duration: 6000 
        });
        return;
      }

      // Handle clarification needed
      if (aiData.type === 'clarification') {
        toast({ 
          title: 'Need more info', 
          description: aiData.message,
          variant: 'destructive' 
        });
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

        const { error: examError } = await supabase
          .from('exams')
          .insert({
            subject: aiData.subject,
            exam_date: aiData.date,
            exam_type: aiData.title || 'Exam',
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
          toast({ 
            title: 'Reminder created!', 
            description: `${aiData.subject} due ${aiData.date}` 
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
