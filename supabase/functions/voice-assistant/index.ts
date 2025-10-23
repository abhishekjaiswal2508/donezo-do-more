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
    const { text, action } = await req.json();
    
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
        .gte('deadline', new Date().toISOString())
        .order('deadline', { ascending: true });

      const { data: exams } = await supabase
        .from('exams')
        .select('*')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });

      const prompt = `Based on this user query: "${text}"
      
Here are the upcoming reminders: ${JSON.stringify(reminders || [])}
Here are the upcoming exams: ${JSON.stringify(exams || [])}

Provide a natural, conversational response about their pending assignments and upcoming exams.`;

      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a helpful assistant. Provide brief, natural responses.' },
            { role: 'user', content: prompt }
          ],
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
    const prompt = `Extract structured information from this voice command: "${text}"

Determine if this is:
1. An EXAM: Has specific exam date/time, subject, and is about a test/quiz/exam
2. A REMINDER: Has a deadline, subject, and is about an assignment/homework/task

Return JSON with this structure:
{
  "type": "exam" or "reminder",
  "title": "extracted title",
  "subject": "extracted subject name",
  "date": "YYYY-MM-DD format",
  "time": "HH:MM format (for exams only)",
  "description": "any additional details"
}

If information is missing or unclear, return: { "type": "clarification", "message": "what you need to clarify" }`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a voice command parser. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
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
