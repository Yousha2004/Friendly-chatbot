"use client";
import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function AutoLogout() {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 1 Ghanta = 60 minutes * 60 seconds * 1000 ms = 3600000 milliseconds
      timeoutId = setTimeout(() => {
        // 1 ghante tak koi activity na hone par automatically logout karega
        signOut({ callbackUrl: "/" }); 
      }, 3600000); 
    };

    // Jab bhi user screen par kuch karega, timer wapas 0 se start hoga
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    // Pehli baar component load hone par timer start karo
    resetTimer();

    // Cleanup: Jab component unmount ho toh listeners hata do
    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, []);

  return null; // Yeh screen par kuch render nahi karega, bas background mein chalega
}