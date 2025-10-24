import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, action, conversationHistory } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Processing voice command:', text, 'Action:', action);

    // Handle query actions (check pending/upcoming items)
    if (action === 'query') {
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .order('deadline', { ascending: true });

      const { data: exams } = await supabase
        .from('exams')
        .select('*')
        .order('exam_date', { ascending: true });

      const upcomingReminders = reminders?.filter(r => new Date(r.deadline) >= new Date()) || [];
      const overdueReminders = reminders?.filter(r => new Date(r.deadline) < new Date()) || [];
      const upcomingExams = exams?.filter(e => new Date(e.exam_date) >= new Date()) || [];
      const pastExams = exams?.filter(e => new Date(e.exam_date) < new Date()) || [];

      const prompt = `Based on this user query: "${text}"
      
Upcoming Reminders (${upcomingReminders.length}):
${upcomingReminders.map(r => `- ${r.title} (${r.subject || 'No subject'}) - Due: ${new Date(r.deadline).toLocaleDateString()}`).join('\n')}

Overdue Reminders (${overdueReminders.length}):
${overdueReminders.map(r => `- ${r.title} (${r.subject || 'No subject'}) - Was due: ${new Date(r.deadline).toLocaleDateString()}`).join('\n')}

Upcoming Exams (${upcomingExams.length}):
${upcomingExams.map(e => `- ${e.subject} ${e.exam_type} - Date: ${new Date(e.exam_date).toLocaleDateString()}`).join('\n')}

Past Exams (${pastExams.length}):
${pastExams.map(e => `- ${e.subject} ${e.exam_type} - Was on: ${new Date(e.exam_date).toLocaleDateString()}`).join('\n')}

Provide a natural, helpful response. Include specific details from the data above. Be conversational and friendly.`;

      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      const messages = [
        { role: 'system', content: 'You are a helpful study assistant. Provide brief, natural, and friendly responses. When listing items, be clear and specific.' },
        ...(conversationHistory || []),
        { role: 'user', content: prompt }
      ];

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages,
        }),
      });

      const aiData = await aiResponse.json();
      const response = aiData.choices[0].message.content;

      return new Response(
        JSON.stringify({ type: 'response', message: response }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle create actions (exam or reminder)
    const messages = [
      { role: 'system', content: 'You are a voice command parser. Always respond with valid JSON only. Use the conversation history to fill in missing details if the user is providing additional information.' },
      ...(conversationHistory || []),
      { role: 'user', content: `Extract structured information from this voice command: "${text}"

Determine if this is:
1. An EXAM: Has specific exam date/time, subject, and is about a test/quiz/exam
2. A REMINDER: Has a deadline, subject, and is about an assignment/homework/task

Return JSON with this structure:
{
  "type": "exam" or "reminder",
  "title": "extracted title",
  "subject": "extracted subject name",
  "date": "YYYY-MM-DD format (use current year 2025 if year not specified)",
  "time": "HH:MM format (for exams only)",
  "exam_type": "ONLY for exams - must be exactly one of: 'Internal Test', 'Viva', 'Mid-Sem', or 'Final'. Choose the most appropriate based on context. If unclear, use 'Internal Test'",
  "description": "any additional details"
}

CRITICAL: For exams, exam_type MUST be exactly one of these four values: 'Internal Test', 'Viva', 'Mid-Sem', 'Final'

If critical information is missing and you cannot infer it from conversation history, return: { "type": "clarification", "message": "what specific information you need" }` }
    ];

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI processing failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Parsed command:', parsed);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in voice-assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
