"use client";

import { useState,type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BellRing, Send } from "lucide-react";
import { toast } from "sonner";

export function NotificationComposer({orderId,customerName}:{orderId:string;customerName:string}){const[title,setTitle]=useState("");const[message,setMessage]=useState("");const[busy,setBusy]=useState(false);async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);try{const response=await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/notifications`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title,message})});if(!response.ok)throw new Error();setTitle("");setMessage("");toast.success("Харилцагчид мэдэгдэл илгээлээ.");}catch{toast.error("Мэдэгдэл илгээхэд алдаа гарлаа.");}finally{setBusy(false);}}return <section className="dashboard-panel notification-composer" id="notifications"><div className="panel-heading"><div><span>ХАРИЛЦАГЧТАЙ ХАРИЛЦАХ</span><h2>{customerName}-д мэдэгдэл илгээх</h2></div><BellRing/></div><form onSubmit={submit}><label><span>Гарчиг</span><Input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={160} placeholder="Мэдэгдлийн гарчиг"/></label><label><span>Мэдээлэл</span><textarea value={message} onChange={e=>setMessage(e.target.value)} required maxLength={600} placeholder="Харилцагчид хүргэх мэдээлэл"/></label><Button type="submit" disabled={busy}><Send/>{busy?"Илгээж байна...":"Мэдэгдэл илгээх"}</Button></form></section>;}
