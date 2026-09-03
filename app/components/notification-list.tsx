"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, CircleDollarSign, FileText, MessageSquareText, Ship } from "lucide-react";
import { toast } from "sonner";

type Notification={id:string;type:string;title:string;message:string;href:string|null;isRead:boolean;createdAt:string;};
const icons:Record<string,typeof Bell>={PAYMENT_RECEIVED:CircleDollarSign,PAYMENT_PENDING:CircleDollarSign,PAYMENT_RECEIPT_SUBMITTED:CircleDollarSign,PAYMENT_OVERDUE:CircleDollarSign,DOCUMENT_READY:FileText,DOCUMENT_REJECTED:FileText,DOCUMENT_SUBMITTED:FileText,SHIPMENT_ASSIGNED:Ship,SHIPMENT_UPDATED:Ship,ORDER_CONFIRMED:CheckCheck,ADMIN_MESSAGE:MessageSquareText,QUOTE_REQUEST:Bell,QUOTE_READY:CheckCheck,FINANCING_REQUEST:CircleDollarSign,FINANCING_APPROVED:CheckCheck,FINANCING_DECLINED:FileText};
type Filter="ALL"|"UNREAD"|"PAYMENTS"|"DOCUMENTS"|"TRANSPORT"|"ORDERS";
const filterTypes:Record<Exclude<Filter,"ALL"|"UNREAD">,string[]>={PAYMENTS:["PAYMENT_RECEIVED","PAYMENT_PENDING","PAYMENT_RECEIPT_SUBMITTED","PAYMENT_OVERDUE"],DOCUMENTS:["DOCUMENT_READY","DOCUMENT_REJECTED","DOCUMENT_SUBMITTED"],TRANSPORT:["SHIPMENT_ASSIGNED","SHIPMENT_UPDATED"],ORDERS:["ORDER_CONFIRMED","QUOTE_REQUEST","QUOTE_READY","ADMIN_MESSAGE","FINANCING_REQUEST","FINANCING_APPROVED","FINANCING_DECLINED"]};

export function NotificationList({notifications,scope}:{notifications:Notification[];scope:"CUSTOMER"|"ADMIN"|"FINANCE"|"TRANSPORT"}){
  const router=useRouter(); const [busy,setBusy]=useState(false); const [filter,setFilter]=useState<Filter>("ALL");
  async function markRead(id:string,href:string|null){setBusy(true);try{const response=await fetch(`/api/notifications/${encodeURIComponent(id)}`,{method:"PATCH"});if(!response.ok)throw new Error();router.refresh();if(href)window.location.href=href;}catch{toast.error("Мэдэгдэл шинэчлэхэд алдаа гарлаа.");}finally{setBusy(false);}}
  async function markAll(){setBusy(true);try{const response=await fetch("/api/notifications/read-all",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope})});if(!response.ok)throw new Error();toast.success("Бүх мэдэгдлийг уншсанаар тэмдэглэлээ.");router.refresh();}catch{toast.error("Мэдэгдэл шинэчлэхэд алдаа гарлаа.");}finally{setBusy(false);}}
  const unread=notifications.filter(item=>!item.isRead).length;
  const filtered=notifications.filter(item=>{if(filter==="ALL")return true;if(filter==="UNREAD")return !item.isRead;return filterTypes[filter].includes(item.type);});
  const filters:[Filter,string][]=[["ALL","Бүгд"],["UNREAD","Уншаагүй"],["PAYMENTS","Төлбөр"],["DOCUMENTS","Баримт"],["TRANSPORT","Тээвэр"],["ORDERS","Захиалга"]];
  return <section className="dashboard-panel notification-center-panel"><div className="dashboard-section-heading"><div><span>МЭДЭГДЛИЙН ТӨВ</span><h2>{unread} уншаагүй мэдэгдэл</h2></div>{unread>0&&<Button variant="outline" size="sm" disabled={busy} onClick={markAll}><CheckCheck/>Бүгдийг уншсан болгох</Button>}</div><div className="notification-filters">{filters.map(([value,label])=><Button key={value} size="sm" variant={filter===value?"default":"outline"} onClick={()=>setFilter(value)}>{label}{value==="UNREAD"&&unread>0?` (${unread})`:value!=="ALL"&&value!=="UNREAD"?` (${notifications.filter(item=>filterTypes[value].includes(item.type)).length})`:""}</Button>)}</div>{filtered.length?<div className="notification-list">{filtered.map(item=>{const Icon=icons[item.type]??Bell;return <article key={item.id} className={item.isRead?"read":"unread"}><i><Icon/></i><span><strong>{item.title}</strong><p>{item.message}</p><small>{item.createdAt.slice(0,16).replace("T"," ")}</small></span>{!item.isRead&&<em>ШИНЭ</em>}<Button variant="ghost" size="sm" disabled={busy} onClick={()=>markRead(item.id,item.href)}>{item.href?"Нээх":"Уншсан"}</Button></article>;})}</div>:<div className="panel-empty"><span>Энэ ангилалд мэдэгдэл алга.</span></div>}</section>;
}
