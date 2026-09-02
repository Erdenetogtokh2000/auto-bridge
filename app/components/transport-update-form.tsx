"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { shipmentStatuses, shipmentStatusLabels } from "@/lib/shipment-status";

type Shipment={id:string;status:string;currentLocation:string|null;estimatedArrival:string|null;containerNo:string|null;billOfLadingNo:string|null};

export function TransportUpdateForm({shipment}:{shipment:Shipment}){
  const router=useRouter();
  const [status,setStatus]=useState(shipment.status);
  const [currentLocation,setCurrentLocation]=useState(shipment.currentLocation??"");
  const [estimatedArrival,setEstimatedArrival]=useState(shipment.estimatedArrival??"");
  const [containerNo,setContainerNo]=useState(shipment.containerNo??"");
  const [billOfLadingNo,setBillOfLadingNo]=useState(shipment.billOfLadingNo??"");
  const [note,setNote]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);try{const response=await fetch(`/api/transport/shipments/${encodeURIComponent(shipment.id)}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status,currentLocation,estimatedArrival,containerNo,billOfLadingNo,note})});if(!response.ok)throw new Error("Тээврийн явц шинэчлэхэд алдаа гарлаа.");setNote("");toast.success("Тээврийн явц шинэчлэгдлээ.");router.refresh();}catch(error){toast.error(error instanceof Error?error.message:"Тээврийн явц шинэчлэхэд алдаа гарлаа.");}finally{setBusy(false);}}
  return <form className="transport-update-form" onSubmit={submit} id="updates"><label><span>Шинэ төлөв</span><Select value={status} onValueChange={setStatus}><SelectTrigger className="payment-select"><SelectValue/></SelectTrigger><SelectContent>{shipmentStatuses.map(value=><SelectItem value={value} key={value}>{shipmentStatusLabels[value]}</SelectItem>)}</SelectContent></Select></label><label><span>Одоогийн байршил *</span><div className="location-input"><MapPin/><Input value={currentLocation} onChange={e=>setCurrentLocation(e.target.value)} required/></div></label><div><label><span>Контейнерийн №</span><Input value={containerNo} onChange={e=>setContainerNo(e.target.value)}/></label><label><span>B/L дугаар</span><Input value={billOfLadingNo} onChange={e=>setBillOfLadingNo(e.target.value)}/></label><label><span>Тооцоолсон ирэх огноо</span><Input type="date" value={estimatedArrival} onChange={e=>setEstimatedArrival(e.target.value)}/></label></div><label><span>Явцын тайлбар *</span><textarea value={note} onChange={e=>setNote(e.target.value)} required maxLength={500} placeholder="Жишээ: Контейнер Тяньжин боомтоос төмөр замд ачигдлаа."/></label><Button type="submit" disabled={busy}><Save/>{busy?"Шинэчилж байна...":"Явц шинэчлэх"}</Button></form>;
}
