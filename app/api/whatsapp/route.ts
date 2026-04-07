import { NextResponse } from "next/server";
import OpenAI from "openai";
import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";

// Prisma aur OpenAI initialize kar rahe hain
const prisma = new PrismaClient();
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(request: Request) {
  try {
    const data = await request.text();
    const params = new URLSearchParams(data);
    const incomingMessage = params.get("Body"); 
    const senderNumber = params.get("From"); // Example: "whatsapp:+919876543210"

    if (!incomingMessage || !senderNumber) {
      return new NextResponse("No message found", { status: 400 });
    }

    // Twilio ke number se "whatsapp:" prefix hatana taaki database number se match ho sake
    const pureWhatsAppNumber = senderNumber.replace("whatsapp:", "").trim();
    console.log(`Message from ${pureWhatsAppNumber}: ${incomingMessage}`);

    // Aaj ki Date aur Time nikalna (Indian Standard Time me)
    const today = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Smart System Prompt
    const systemPrompt = `You are Zainabiya ChatBot, a helpful assistant. 
    Today's date and time is: ${today}.
    
    You MUST ALWAYS respond STRICTLY in JSON format. Do not include any text outside the JSON block.
    
    RULES:
    1. If the user is just chatting normally (greetings, questions, etc.), reply with this JSON structure:
       {"intent": "chat", "reply": "Your friendly and concise reply here in the user's language."}
       
    2. If the user asks to schedule a meeting, event, or reminder, extract the details and reply with this JSON structure:
       {"intent": "schedule_event", "title": "Event Title", "date": "YYYY-MM-DD", "time": "HH:MM:SS"}
       (Use 24-hour format for time. If time is not mentioned, assume 09:00:00).`;

    // Groq API Call
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
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

    // 🔥 MAIN MAGIC: Calendar Event Logic 🔥
    if (parsedData.intent === "schedule_event") {
      console.log("Event detected. Fetching user from Database...", pureWhatsAppNumber);
      
      // 1. Database se User aur uske Google Tokens nikalna
      const user = await prisma.user.findUnique({
        where: { whatsappNum: pureWhatsAppNumber },
      });

      if (!user || !user.accessToken) {
        // Agar user ne WhatsApp number link nahi kiya hai ya login nahi kiya hai
        finalWhatsAppMessage = `⚠️ Maaf kijiye, aapka number (${pureWhatsAppNumber}) system se linked nahi hai. Kripya pehle website par Google se login karein aur apna WhatsApp number link karein.`;
      } else {
        try {
          // 2. Google OAuth2 Client setup karna
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );

          // User ke saved tokens set karna
          oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken,
          });

          const calendar = google.calendar({ version: "v3", auth: oauth2Client });

          // 3. Event ke liye Start aur End time banana (IST me adjust kiya hai)
          // Format: "YYYY-MM-DDTHH:MM:SS+05:30"
          const startDateTime = new Date(`${parsedData.date}T${parsedData.time}+05:30`);
          
          // By default meeting ko 1 ghante ki maan lete hain
          const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); 

          // 4. Google Calendar API ko request bhejna
          await calendar.events.insert({
            calendarId: "primary", // User ka default calendar
            requestBody: {
              summary: parsedData.title,
              start: {
                dateTime: startDateTime.toISOString(),
                timeZone: "Asia/Kolkata",
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: "Asia/Kolkata",
              },
            },
          });

          finalWhatsAppMessage = `✅ Done! Aapka event *"${parsedData.title}"* save ho gaya hai.\n📅 Date: ${parsedData.date}\n⏰ Time: ${parsedData.time}`;
          console.log("Event successfully added to Google Calendar!");

        } catch (calendarError) {
          console.error("Calendar API Error:", calendarError);
          finalWhatsAppMessage = `❌ Sorry, Google Calendar mein event save karne mein koi dikkat aayi.`;
        }
      }
    } else {
      // Normal chat reply
      finalWhatsAppMessage = parsedData.reply;
    }

    // Twilio ko TwiML response bhejna
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