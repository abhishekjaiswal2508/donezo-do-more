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

    // Determine action type from user input
    const isQuery = /how many|what|show|tell|list|pending|upcoming|overdue|do i have/i.test(text);
    const isDelete = /delete|remove|cancel|clear/i.test(text);
    const isCreate = /create|add|make|schedule|set|new/i.test(text);
    
    // Handle delete actions
    if (isDelete) {
      const { data: reminders } = await supabase
        .from('reminders')
        .select('id, title, subject, deadline')
        .eq('created_by', user.id)
        .order('deadline', { ascending: true });

      const { data: exams } = await supabase
        .from('exams')
        .select('id, subject, exam_type, exam_date')
        .eq('created_by', user.id)
        .order('exam_date', { ascending: true });

      const prompt = `User wants to delete something: "${text}"

Available Reminders (Assignments/Homework/Tasks):
${reminders?.map((r, i) => `${i + 1}. ${r.title} (${r.subject}) - Due: ${new Date(r.deadline).toLocaleDateString()} [ID: ${r.id}]`).join('\n') || 'No reminders'}

Available Exams (Tests):
${exams?.map((e, i) => `${i + 1}. ${e.subject} ${e.exam_type} - Date: ${new Date(e.exam_date).toLocaleDateString()} [ID: ${e.id}]`).join('\n') || 'No exams'}

STRICT RULES:
- If user says "assignment", "homework", "task" → delete from reminders (item_type: "reminder")
- If user says "exam", "test", "quiz" → delete from exams (item_type: "exam")
- If user says "all maths assignments" → find ALL reminders with subject "Maths" or similar
- If user says "all maths exams" → find ALL exams with subject "Maths" or similar

Return JSON:
{
  "type": "delete",
  "item_type": "reminder" or "exam" (follow strict rules above),
  "item_ids": ["array of UUIDs to delete - can be multiple if user says 'all' or specifies multiple items"]
}

If you can't identify which item(s) to delete, return:
{ "type": "clarification", "message": "Ask user to be more specific about which item they want to delete" }`;

      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a helpful assistant. Parse user intent and return valid JSON only.' },
            ...(conversationHistory || []),
            { role: 'user', content: prompt }
          ],
        }),
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Failed to parse AI response');
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.type === 'clarification') {
        return new Response(
          JSON.stringify(parsed),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Perform the deletion
      if (parsed.type === 'delete') {
        const table = parsed.item_type === 'reminder' ? 'reminders' : 'exams';
        const itemIds = Array.isArray(parsed.item_ids) ? parsed.item_ids : [parsed.item_ids];
        
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .in('id', itemIds)
          .eq('created_by', user.id);

        if (deleteError) throw deleteError;

        const count = itemIds.length;
        const message = count === 1 
          ? `Successfully deleted the ${parsed.item_type}` 
          : `Successfully deleted ${count} ${parsed.item_type}${count > 1 ? 's' : ''}`;

        return new Response(
          JSON.stringify({ 
            type: 'delete_success', 
            item_type: parsed.item_type,
            count,
            message 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle query actions (check pending/upcoming items)
    if (isQuery) {
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
      
Upcoming Reminders/Assignments (${upcomingReminders.length}):
${upcomingReminders.map(r => `- ${r.title} (${r.subject || 'No subject'}) - Due: ${new Date(r.deadline).toLocaleDateString()}`).join('\n')}

Overdue Reminders/Assignments (${overdueReminders.length}):
${overdueReminders.map(r => `- ${r.title} (${r.subject || 'No subject'}) - Was due: ${new Date(r.deadline).toLocaleDateString()}`).join('\n')}

Upcoming Exams/Tests (${upcomingExams.length}):
${upcomingExams.map(e => `- ${e.subject} ${e.exam_type} - Date: ${new Date(e.exam_date).toLocaleDateString()}`).join('\n')}

Past Exams/Tests (${pastExams.length}):
${pastExams.map(e => `- ${e.subject} ${e.exam_type} - Was on: ${new Date(e.exam_date).toLocaleDateString()}`).join('\n')}

Provide a natural, helpful, conversational response like Google Assistant would. Be friendly and clear. Include specific details from the data above.`;

      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      const messages = [
        { role: 'system', content: 'You are a friendly and helpful AI assistant, similar to Google Assistant. Be conversational, natural, and proactive. Use casual language and provide clear, concise answers. When listing items, organize them nicely and highlight what\'s most important or urgent.' },
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
      { role: 'system', content: `You are a friendly voice assistant like Google Assistant. Parse commands naturally and respond with valid JSON only. Use conversation history to fill in missing details from previous exchanges.

CRITICAL DISTINCTION:
- ASSIGNMENT/HOMEWORK/TASK = Always type "reminder" (has deadline)
- EXAM/TEST/QUIZ/VIVA/MID-SEM/FINAL = Always type "exam" (has specific date + time)

NEVER confuse these two! If user says "assignment", it's ALWAYS a reminder. If they say "exam/test", it's ALWAYS an exam.` },
      ...(conversationHistory || []),
      { role: 'user', content: `Extract structured information from this voice command: "${text}"

STRICT RULES:
1. If the command contains words: "assignment", "homework", "task" → type MUST be "reminder"
2. If the command contains words: "exam", "test", "quiz", "viva", "mid-sem", "final" → type MUST be "exam"

EXAM vs REMINDER:
- EXAM: A test/quiz with specific date AND time (e.g., "Maths exam on Nov 26 at 2pm")
- REMINDER: An assignment/homework/task with a deadline (e.g., "Java assignment due Monday")

Return JSON with this structure:
{
  "type": "exam" OR "reminder" (follow strict rules above),
  "title": "extracted title (for reminders) or exam subject (for exams)",
  "subject": "extracted subject name",
  "date": "YYYY-MM-DD format (use current year 2025 if year not specified)",
  "time": "HH:MM format (REQUIRED for exams, optional for reminders)",
  "exam_type": "ONLY for exams - must be exactly one of: 'Internal Test', 'Viva', 'Mid-Sem', or 'Final'. Choose based on context. Default: 'Internal Test'",
  "description": "any additional details"
}

EXAMPLES:
- "Create Maths assignment on Monday" → type: "reminder", title: "Maths Assignment", subject: "Maths"
- "Schedule Java exam on Nov 26 at 2pm" → type: "exam", subject: "Java", exam_type: "Internal Test"
- "Add COA homework due next week" → type: "reminder", title: "COA Homework", subject: "COA"

If critical information is missing, return: { "type": "clarification", "message": "what specific information you need" }` }
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
