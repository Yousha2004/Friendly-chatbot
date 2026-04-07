"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { MessageCircle, CalendarCheck, LogOut, Phone } from "lucide-react";
import AutoLogout from "./components/AutoLogout";

export default function Home() {
  const { data: session } = useSession();
  const [waNumber, setWaNumber] = useState("");

  const handleOpenWhatsApp = () => {
    if (!waNumber) {
      alert("Please enter your WhatsApp number first!");
      return;
    }
    const cleanNumber = waNumber.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${cleanNumber}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sky-200 p-6 text-black">
      
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md flex flex-col items-center text-center">
        
        <div className="bg-blue-600 p-4 rounded-full shadow-md mb-6">
          <CalendarCheck className="w-10 h-10 text-white" />
        </div>

        {!session ? (
          <>
            {/* THIS IS WHERE THE NAME CHANGED */}
            <h1 className="text-3xl font-extrabold mb-2 text-gray-800">
              Raza ChatBot
            </h1>
            <p className="text-gray-600 mb-8 text-sm">
              Connect your WhatsApp to schedule calendar events easily.
            </p>

            <button
              onClick={() => signIn("google")}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition duration-200 shadow-sm"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center w-full">
            <h1 className="text-2xl font-bold mb-1 text-gray-800">
              Welcome back, {session.user?.name?.split(" ")[0]}!
            </h1>
            <p className="text-sm text-gray-500 mb-6">{session.user?.email}</p>

            <div className="mb-6 w-full text-left">
              <label className="block text-gray-800 text-sm font-semibold mb-2">
                Enter your WhatsApp Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  placeholder="e.g. +1 234 567 8900"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
                />
              </div>
            </div>

            <button 
              onClick={() => {
                // Yahan tumhara save number wala logic agar koi hai toh wo rehne dena
                window.open("https://wa.me/14155238886", "_blank"); 
              }}
              className="w-full bg-[#1dbf53] hover:bg-[#1aa648] text-white font-semibold py-3 px-4 rounded-full transition-all duration-300 flex justify-center items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              Open Chatbot in WhatsApp
            </button>

            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 font-semibold py-3 px-4 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}