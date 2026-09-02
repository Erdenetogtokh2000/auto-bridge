"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Save, Ship, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { shipmentStatuses, shipmentStatusLabels } from "@/lib/shipment-status";

type Shipment = {
  id: string; containerNo: string | null; billOfLadingNo: string | null;
  originPort: string | null; destination: string; currentLocation: string | null;
  status: string; estimatedArrival: string | null; transportEmployeeEmail: string | null;
  updatedAt: string;
};

type TransportStaff = { email: string; fullName: string | null };

export function ShipmentManager({ orderId, shipment, transportStaff = [] }: { orderId: string; shipment: Shipment | null; transportStaff?: TransportStaff[] }) {
  const router = useRouter();
  const [originPort,setOriginPort]=useState(shipment?.originPort??"");
  const [destination,setDestination]=useState(shipment?.destination??"Улаанбаатар");
  const [currentLocation,setCurrentLocation]=useState(shipment?.currentLocation??"");
  const [containerNo,setContainerNo]=useState(shipment?.containerNo??"");
  const [billOfLadingNo,setBillOfLadingNo]=useState(shipment?.billOfLadingNo??"");
  const [estimatedArrival,setEstimatedArrival]=useState(shipment?.estimatedArrival??"");
  const [transportEmployeeEmail,setTransportEmployeeEmail]=useState(shipment?.transportEmployeeEmail??"");
  const [status,setStatus]=useState(shipment?.status??"PREPARING");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const staffOptions = shipment?.transportEmployeeEmail && !transportStaff.some(staff => staff.email.toLowerCase() === shipment.transportEmployeeEmail?.toLowerCase())
    ? [{ email: shipment.transportEmployeeEmail, fullName: "Одоогийн хуваарилалт" }, ...transportStaff]
    : transportStaff;

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setBusy(true);
    try{
      const response=await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/shipment`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({originPort,destination,currentLocation,containerNo,billOfLadingNo,estimatedArrival,transportEmployeeEmail,status,note})});
      if(!response.ok) throw new Error("Тээврийн мэдээлэл хадгалахад алдаа гарлаа.");
      setNote(""); toast.success(shipment?"Тээврийн мэдээлэл шинэчлэгдлээ.":"Тээврийн бүртгэл үүслээ."); router.refresh();
    }catch(error){toast.error(error instanceof Error?error.message:"Тээврийн мэдээлэл хадгалахад алдаа гарлаа.");}
    finally{setBusy(false);}
  }

  return <section className="admin-shipment-section" id="shipping">
    <div className="dashboard-section-heading shipment-section-title"><div><span>ТЭЭВРИЙН УДИРДЛАГА</span><h2>Маршрут ба хариуцсан ажилтан</h2></div>{shipment&&<span className="live-data-chip">{shipmentStatusLabels[shipment.status]??shipment.status}</span>}</div>
    <div className="admin-shipment-layout">
      <section className="dashboard-panel shipment-overview-panel">
        <div className="panel-heading"><div><span>ТЭЭВРИЙН ФАЙЛ</span><h2>{shipment?.id??"Шинэ тээвэр"}</h2></div><Ship/></div>
        <div className="shipment-route-summary"><div><MapPin/><span><small>Эхлэх цэг</small><strong>{originPort||"Оруулаагүй"}</strong></span></div><i>→</i><div><MapPin/><span><small>Одоогийн байршил</small><strong>{currentLocation||"Оруулаагүй"}</strong></span></div><i>→</i><div><MapPin/><span><small>Очих цэг</small><strong>{destination||"Улаанбаатар"}</strong></span></div></div>
        <div className="shipment-assignee"><UserRoundCheck/><span><small>Хариуцсан ажилтан</small><strong>{transportEmployeeEmail||"Хуваарилаагүй"}</strong></span></div>
      </section>
      <section className="dashboard-panel shipment-form-panel">
        <div className="panel-heading"><div><span>МЭДЭЭЛЭЛ</span><h2>{shipment?"Тээвэр засах":"Тээвэр үүсгэх"}</h2></div><Save/></div>
        <form className="shipment-form" onSubmit={submit}>
          <div className="shipment-form-grid"><label><span>Эхлэх боомт *</span><Input value={originPort} onChange={e=>setOriginPort(e.target.value)} required placeholder="Инчон боомт"/></label><label><span>Очих цэг *</span><Input value={destination} onChange={e=>setDestination(e.target.value)} required/></label><label><span>Одоогийн байршил *</span><Input value={currentLocation} onChange={e=>setCurrentLocation(e.target.value)} required placeholder="Инчон боомт"/></label><label><span>Ирэх төлөвлөсөн огноо</span><Input type="date" value={estimatedArrival} onChange={e=>setEstimatedArrival(e.target.value)}/></label><label><span>Контейнерийн №</span><Input value={containerNo} onChange={e=>setContainerNo(e.target.value)} placeholder="MSCU-8472910"/></label><label><span>B/L дугаар</span><Input value={billOfLadingNo} onChange={e=>setBillOfLadingNo(e.target.value)} placeholder="BL-INC-901284"/></label><label className="wide"><span>Хариуцсан тээврийн ажилтан *</span>{staffOptions.length ? <Select value={transportEmployeeEmail || "__none__"} onValueChange={value=>setTransportEmployeeEmail(value === "__none__" ? "" : value)}><SelectTrigger className="payment-select"><SelectValue placeholder="Ажилтан сонгох"/></SelectTrigger><SelectContent><SelectItem value="__none__">Ажилтан сонгоно уу</SelectItem>{staffOptions.map(staff=><SelectItem value={staff.email} key={staff.email}>{staff.fullName ? `${staff.fullName} · ${staff.email}` : staff.email}</SelectItem>)}</SelectContent></Select> : <><Input type="email" value={transportEmployeeEmail} onChange={e=>setTransportEmployeeEmail(e.target.value)} required placeholder="employee@company.com"/><small className="shipment-assignee-hint">Идэвхтэй тээврийн ажилтны профайл үүсгэсний дараа жагсаалтаар сонгоно.</small></>}</label><label><span>Тээврийн төлөв</span><Select value={status} onValueChange={setStatus}><SelectTrigger className="payment-select"><SelectValue/></SelectTrigger><SelectContent>{shipmentStatuses.map(value=><SelectItem value={value} key={value}>{shipmentStatusLabels[value]}</SelectItem>)}</SelectContent></Select></label><label className="wide"><span>Шинэчлэлийн тайлбар</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Харилцагчид харагдах явцын тайлбар" maxLength={500}/></label></div>
          <Button type="submit" disabled={busy}><Save/>{busy?"Хадгалж байна...":shipment?"Тээврийн мэдээлэл шинэчлэх":"Тээвэр үүсгэж, ажилтан хуваарилах"}</Button>
        </form>
      </section>
    </div>
  </section>;
}
