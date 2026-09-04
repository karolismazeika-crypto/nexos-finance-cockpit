import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const geistSans=Geist({variable:"--font-geist-sans",subsets:["latin"]});
const geistMono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"]});
export const metadata:Metadata={title:"Finance Cockpit | Executive FP&A Prototype",description:"A fictional executive FP&A cockpit demonstrating SaaS finance decision architecture.",metadataBase:new URL("https://nexos-finance-cockpit.coral-crumb-9622.chatgpt.site"),openGraph:{title:"Finance Cockpit",description:"From assumptions to executive action",images:["/og.png"]},twitter:{card:"summary_large_image",title:"Finance Cockpit",description:"From assumptions to executive action",images:["/og.png"]}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>}
