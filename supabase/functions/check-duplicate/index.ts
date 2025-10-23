import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, item } = await req.json();
    console.log('Checking duplicate for:', type, item);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    let existingItems: any[] = [];

    if (type === 'exam') {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .gte('exam_date', new Date().toISOString());
      
      if (error) throw error;
      existingItems = data || [];
    } else if (type === 'reminder') {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .gte('deadline', new Date().toISOString());
      
      if (error) throw error;
      existingItems = data || [];
    }

    if (existingItems.length === 0) {
      return new Response(
        JSON.stringify({ isDuplicate: false, message: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to check for semantic similarity
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const prompt = type === 'exam' 
      ? `You are a duplicate detection system for exam schedules. 
      
New exam to check:
Subject: ${item.subject}
Date: ${item.exam_date}
Type: ${item.exam_type}
Description: ${item.description || 'None'}

Existing exams:
${existingItems.map((e, i) => `${i + 1}. Subject: ${e.subject}, Date: ${e.exam_date}, Type: ${e.exam_type}, Description: ${e.description || 'None'}`).join('\n')}

Analyze if the new exam is a duplicate or very similar to any existing exam. Consider:
- Same subject and exam type
- Similar dates (within 1-2 days)
- Similar descriptions

Respond with ONLY "DUPLICATE" if it's clearly a duplicate, or "UNIQUE" if it's different. If duplicate, add a brief reason after a pipe character like: DUPLICATE|Same Math exam on the same date`
      : `You are a duplicate detection system for assignment reminders.

New reminder to check:
Title: ${item.title}
Subject: ${item.subject}
Deadline: ${item.deadline}
Description: ${item.description || 'None'}

Existing reminders:
${existingItems.map((r, i) => `${i + 1}. Title: ${r.title}, Subject: ${r.subject}, Deadline: ${r.deadline}, Description: ${r.description || 'None'}`).join('\n')}

Analyze if the new reminder is a duplicate or very similar to any existing reminder. Consider:
- Same or very similar title
- Same subject
- Similar deadlines (within 1-2 days)
- Similar descriptions

Respond with ONLY "DUPLICATE" if it's clearly a duplicate, or "UNIQUE" if it's different. If duplicate, add a brief reason after a pipe character like: DUPLICATE|Same assignment already exists`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a precise duplicate detection system. Respond concisely.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI service payment required.');
      }
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const result = aiData.choices?.[0]?.message?.content?.trim() || 'UNIQUE';
    
    console.log('AI duplicate check result:', result);

    const [status, reason] = result.split('|');
    const isDuplicate = status.toUpperCase().includes('DUPLICATE');

    return new Response(
      JSON.stringify({
        isDuplicate,
        message: isDuplicate 
          ? reason || `This ${type} appears to be already registered`
          : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-duplicate function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});