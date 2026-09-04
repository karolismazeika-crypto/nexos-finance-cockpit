import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const geistSans=Geist({variable:"--font-geist-sans",subsets:["latin"]});
const geistMono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"]});
export const metadata:Metadata={title:"nexos.ai Finance Cockpit | Karolis Mazeika",description:"An executive FP&A cockpit demonstrating SaaS finance decision architecture.",metadataBase:new URL("https://nexos-finance-cockpit-karolis.netlify.app"),openGraph:{title:"nexos.ai Finance Cockpit",description:"Illustrative overview by Karolis Mazeika, Finance Director",images:["/og.png"]},twitter:{card:"summary_large_image",title:"nexos.ai Finance Cockpit",description:"Illustrative overview by Karolis Mazeika, Finance Director",images:["/og.png"]}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>}
