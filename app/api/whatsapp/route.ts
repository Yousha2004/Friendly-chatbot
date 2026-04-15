export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

async function createGoogleCalendarEvent(accessToken: string, eventDetails: any) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventDetails)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }
  return response.json();
}

export async function POST(request: Request) {
  try {
    const data = await request.text();
    const params = new URLSearchParams(data);
    const incomingMessage = params.get("Body"); 
    const senderNumber = params.get("From");

    if (!incomingMessage || !senderNumber) {
      return new NextResponse("No message found", { status: 400 });
    }

    const pureWhatsAppNumber = senderNumber.replace("whatsapp:", "").trim();
    console.log(`Message from ${pureWhatsAppNumber}: ${incomingMessage}`);

    // 🔥 1. THE FIX: Agar email nahi hai toh database ko ek dummy email de do
    const user = await prisma.user.upsert({
      where: { whatsappNum: pureWhatsAppNumber },
      update: {},
      create: { 
        whatsappNum: pureWhatsAppNumber,
        email: `${pureWhatsAppNumber}@whatsapp.bot` // Dummy email database ki requirement puri karne ke liye
      },
    });

    // 2. User ke aakhri 10 messages DB se nikalna
    const previousMessages = await prisma.message.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10, 
    });

    const formattedHistory = previousMessages.reverse().map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    const today = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const systemPrompt = `You are Zainabiya ChatBot, a helpful assistant. 
    Today's date and time is: ${today}.
    
    You MUST ALWAYS respond STRICTLY in JSON format. Do not include any text outside the JSON block.
    
    RULES:
    1. If the user is just chatting normally, use chat context and reply with this JSON structure:
       {"intent": "chat", "reply": "Your friendly reply based on previous chat history."}
       
    2. If the user asks to schedule a meeting, event, or reminder, extract the details and reply with this JSON structure:
       {"intent": "schedule_event", "title": "Event Title", "date": "YYYY-MM-DD", "time": "HH:MM:SS"}
       (Use 24-hour format for time. If time is not mentioned, assume 09:00:00).`;

    // 3. AI ko History + Naya Message bhejna
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedHistory, 
        { role: "user", content: incomingMessage }, 
      ],
    });

    const aiContent = completion.choices[0].message.content;
    
    let parsedData;
    try {
      parsedData = JSON.parse(aiContent || "{}");
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      parsedData = { intent: "chat", reply: "Maaf karna, main aapki baat theek se samajh nahi paya." };
    }

    let finalWhatsAppMessage = "";

    // Event Scheduling Logic
    if (parsedData.intent === "schedule_event") {
      if (!user.accessToken) {
        finalWhatsAppMessage = `⚠️ Maaf kijiye, aapne Google account link nahi kiya hai. Kripya website par login karein.`;
      } else {
        try {
          const startDateTime = new Date(`${parsedData.date}T${parsedData.time}+05:30`);
          const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); 

          const eventDetails = {
            summary: parsedData.title,
            start: { dateTime: startDateTime.toISOString(), timeZone: "Asia/Kolkata" },
            end: { dateTime: endDateTime.toISOString(), timeZone: "Asia/Kolkata" },
          };

          await createGoogleCalendarEvent(user.accessToken, eventDetails);
          finalWhatsAppMessage = `✅ Done! Aapka event *"${parsedData.title}"* save ho gaya hai.\n📅 Date: ${parsedData.date}\n⏰ Time: ${parsedData.time}`;
          console.log("Event successfully added to Google Calendar!");

        } catch (calendarError: any) {
          console.error("Calendar API Error:", calendarError.message || calendarError);
          finalWhatsAppMessage = `❌ Sorry, Google Calendar mein event save karne mein dikkat aayi. Kripya dobara login karein.`;
        }
      }
    } else {
      finalWhatsAppMessage = parsedData.reply;
    }

    // 4. Chat history ko Database mein save karna
    await prisma.message.createMany({
      data: [
        { userId: user.id, role: "user", content: incomingMessage },
        { userId: user.id, role: "assistant", content: finalWhatsAppMessage }
      ]
    });

    const twimlResponse = `
      <Response>
        <Message>${finalWhatsAppMessage}</Message>
      </Response>
    `;

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("Server Error:", error);
    return new NextResponse(
      "<Response><Message>Sorry, server me kuch technical issue hai.</Message></Response>",
      { status: 500, headers: { "Content-Type": "text/xml" } }
    );
  }
}