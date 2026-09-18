"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CarFront, Download, ExternalLink, ImagePlus, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type ManagedVehicle = {
  id: string; stockNo: string; sourceMarket: "KOREA"|"USA"|"MONGOLIA";
  listingUrl: string|null; make: string; model: string; productionYear: number;
  mileageKm: number; vin: string|null; fuelType: string|null; trim: string|null; color: string|null;
  engineCapacityCc: number|null; priceAmount: number; priceCurrency: "KRW"|"USD"|"MNT";
  imageUrl: string|null; imageObjectKey: string|null; description: string|null;
  galleryImageUrls: string;
  isPublished: boolean; isFeatured: boolean; status: "AVAILABLE"|"RESERVED"|"SOLD"|"ARCHIVED";
};

const blank: ManagedVehicle = { id:"", stockNo:"", sourceMarket:"KOREA", listingUrl:null, make:"", model:"", productionYear:new Date().getFullYear(), mileageKm:0, vin:null, fuelType:null, trim:null, color:null, engineCapacityCc:null, priceAmount:0, priceCurrency:"KRW", imageUrl:null, imageObjectKey:null, galleryImageUrls:"[]", description:null, isPublished:false, isFeatured:false, status:"AVAILABLE" };
const marketLabels={KOREA:"Солонгос",USA:"Америк",MONGOLIA:"Монголд бэлэн"};
const statusLabels={AVAILABLE:"БЭЛЭН",RESERVED:"ЗАХИАЛГАТАЙ",SOLD:"ЗАРАГДСАН",ARCHIVED:"АРХИВ"};

export function VehicleManager({vehicles}:{vehicles:ManagedVehicle[]}){
  const router=useRouter(); const fileRef=useRef<HTMLInputElement>(null);
  const[query,setQuery]=useState(""); const[market,setMarket]=useState("ALL"); const[open,setOpen]=useState(false); const[editing,setEditing]=useState(false); const[form,setForm]=useState<ManagedVehicle>(blank); const[busy,setBusy]=useState(false); const[importUrl,setImportUrl]=useState(""); const[importBusy,setImportBusy]=useState(false);
  const filtered=useMemo(()=>vehicles.filter(vehicle=>`${vehicle.stockNo} ${vehicle.make} ${vehicle.model} ${vehicle.trim??""}`.toLowerCase().includes(query.toLowerCase())&&(market==="ALL"||vehicle.sourceMarket===market)),[vehicles,query,market]);
  function field<K extends keyof ManagedVehicle>(key:K,value:ManagedVehicle[K]){setForm(current=>({...current,[key]:value}));}
  function create(){setEditing(false);setForm({...blank,productionYear:new Date().getFullYear()});setImportUrl("");setOpen(true);}
  function edit(vehicle:ManagedVehicle){setEditing(true);setForm(vehicle);setOpen(true);}
  function imageSource(vehicle:ManagedVehicle){return vehicle.imageObjectKey?`/api/vehicle-images/${encodeURIComponent(vehicle.id)}`:vehicle.imageUrl;}
  function price(vehicle:ManagedVehicle){return `${new Intl.NumberFormat("mn-MN").format(vehicle.priceAmount)} ${vehicle.priceCurrency}`;}
  async function importFromUrl(){
    if(!importUrl.trim())return;
    setImportBusy(true);
    try{
      const response=await fetch("/api/admin/vehicles/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:importUrl.trim()})});
      const payload=await response.json().catch(()=>null) as {vehicle?:Partial<ManagedVehicle>&{imageUrls?:string[]};error?:string}|null;
      if(!response.ok||!payload?.vehicle)throw new Error(payload?.error??"IMPORT_FAILED");
      const vehicle=payload.vehicle;
      setForm(current=>({...current,
        stockNo:vehicle.stockNo??current.stockNo,sourceMarket:vehicle.sourceMarket??current.sourceMarket,listingUrl:vehicle.listingUrl??importUrl.trim(),
        make:vehicle.make??current.make,model:vehicle.model??current.model,trim:vehicle.trim??current.trim,productionYear:vehicle.productionYear??current.productionYear,
        mileageKm:vehicle.mileageKm??current.mileageKm,vin:vehicle.vin??current.vin,fuelType:vehicle.fuelType??current.fuelType,color:vehicle.color??current.color,
        engineCapacityCc:vehicle.engineCapacityCc??current.engineCapacityCc,priceAmount:vehicle.priceAmount??current.priceAmount,priceCurrency:vehicle.priceCurrency??current.priceCurrency,
        imageUrl:vehicle.imageUrl??vehicle.imageUrls?.[0]??current.imageUrl,galleryImageUrls:JSON.stringify(vehicle.imageUrls??[]),description:vehicle.description??current.description,
      }));
      toast.success(`${payload.vehicle.imageUrls?.length??(payload.vehicle.imageUrl?1:0)} зурагтай автомашины мэдээллийг татлаа. Хадгалахын өмнө шалгана уу.`);
    }catch(error){toast.error(error instanceof Error&&error.message&&error.message!=="IMPORT_FAILED"?error.message:"Энэ зараас мэдээлэл автоматаар татаж чадсангүй. Линкээ шалгах эсвэл мэдээллийг гараар оруулна уу.");}
    finally{setImportBusy(false);}
  }
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);try{const data=new FormData();Object.entries(form).forEach(([key,value])=>{if(key!=="id"&&key!=="imageObjectKey"&&value!==null)data.set(key,String(value));});const file=fileRef.current?.files?.[0];if(file)data.set("imageFile",file);const response=await fetch(editing?`/api/admin/vehicles/${encodeURIComponent(form.id)}`:"/api/admin/vehicles",{method:editing?"PATCH":"POST",body:data});if(!response.ok)throw new Error();toast.success(editing?"Автомашины мэдээллийг шинэчиллээ.":"Автомашин каталогт нэмэгдлээ.");setOpen(false);router.refresh();}catch{toast.error("Автомашиныг хадгалахад алдаа гарлаа. Stock ID болон талбаруудыг шалгана уу.");}finally{setBusy(false);}}
  async function archive(vehicle:ManagedVehicle){if(!window.confirm(`${vehicle.make} ${vehicle.model}-г каталогоос хасах уу?`))return;setBusy(true);try{const response=await fetch(`/api/admin/vehicles/${encodeURIComponent(vehicle.id)}`,{method:"DELETE"});if(!response.ok)throw new Error();toast.success("Автомашиныг каталогоос хаслаа.");router.refresh();}catch{toast.error("Автомашиныг хасахад алдаа гарлаа.");}finally{setBusy(false);}}
  return <>
    <section className="dashboard-panel vehicle-directory-panel"><div className="vehicle-directory-toolbar"><div><span>КАТАЛОГИЙН УДИРДЛАГА</span><h2>Автомашины нөөц ба нийтлэл</h2></div><div className="vehicle-directory-controls"><label><Search/><Input aria-label="Автомашин хайх" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Марк, загвар, Stock ID"/></label><Select value={market} onValueChange={setMarket}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">Бүх зах зээл</SelectItem><SelectItem value="KOREA">Солонгос</SelectItem><SelectItem value="USA">Америк</SelectItem><SelectItem value="MONGOLIA">Монголд бэлэн</SelectItem></SelectContent></Select><Button onClick={create}><Plus/>Машин нэмэх</Button></div></div>
    <div className="vehicle-directory-table"><Table><TableHeader><TableRow><TableHead>АВТОМАШИН</TableHead><TableHead>ЗАХ ЗЭЭЛ</TableHead><TableHead>ҮЗҮҮЛЭЛТ</TableHead><TableHead>ҮНЭ</TableHead><TableHead>ТӨЛӨВ</TableHead><TableHead>НИЙТЭЛСЭН</TableHead><TableHead/></TableRow></TableHeader><TableBody>{filtered.map(vehicle=><TableRow key={vehicle.id}><TableCell><div className="admin-vehicle-identity"><div>{imageSource(vehicle)?<img src={imageSource(vehicle)??""} alt=""/>:<CarFront/>}</div><span><strong>{vehicle.make} {vehicle.model}</strong><small>{vehicle.stockNo} · {vehicle.productionYear}{vehicle.vin&&` · VIN ${vehicle.vin}`}{vehicle.listingUrl&&<a href={vehicle.listingUrl} target="_blank" rel="noreferrer" aria-label="Эх зар"><ExternalLink/></a>}</small></span></div></TableCell><TableCell><span className={`vehicle-market ${vehicle.sourceMarket.toLowerCase()}`}>{marketLabels[vehicle.sourceMarket]}</span></TableCell><TableCell><span className="vehicle-spec-cell"><strong>{vehicle.mileageKm.toLocaleString("mn-MN")} км</strong><small>{vehicle.fuelType??"Түлшний төрөл оруулаагүй"}{vehicle.engineCapacityCc?` · ${vehicle.engineCapacityCc} cc`:""}</small></span></TableCell><TableCell><strong className="vehicle-price-cell">{price(vehicle)}</strong></TableCell><TableCell><span className={`catalog-status ${vehicle.status.toLowerCase()}`}>{statusLabels[vehicle.status]}</span></TableCell><TableCell><span className={`publish-state ${vehicle.isPublished?"live":"draft"}`}>{vehicle.isPublished?"НИЙТЭЛСЭН":"НООРОГ"}{vehicle.isFeatured&&<em>ОНЦЛОХ</em>}</span></TableCell><TableCell><div className="vehicle-row-actions"><Button variant="ghost" size="sm" onClick={()=>edit(vehicle)}><Pencil/>Засах</Button>{vehicle.status!=="ARCHIVED"&&<Button variant="ghost" size="sm" onClick={()=>archive(vehicle)} disabled={busy} aria-label="Каталогоос хасах"><Trash2/>Устгах</Button>}</div></TableCell></TableRow>)}{!filtered.length&&<TableRow><TableCell colSpan={7}><div className="panel-empty">Каталогт тохирох автомашин алга.</div></TableCell></TableRow>}</TableBody></Table></div></section>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="vehicle-dialog"><DialogHeader><DialogTitle>{editing?"Автомашины мэдээлэл засах":"Каталогт автомашин нэмэх"}</DialogTitle><DialogDescription>Зах зээл, үзүүлэлт, үнэ, зураг болон нийтлэх төлөвийг бүртгэнэ.</DialogDescription></DialogHeader><form onSubmit={submit}><div className="vehicle-form-grid">
      {!editing&&<div className="vehicle-link-import wide"><div><Download/><span><strong>Encar эсвэл Cars.com зарын холбоосоос татах</strong><small>Зарын холбоосыг оруулахад автомашины мэдээлэл болон зургууд автоматаар бөглөгдөнө.</small></span></div><div><Input type="url" value={importUrl} onChange={e=>setImportUrl(e.target.value)} placeholder="https://www.encar.com/... эсвэл https://www.cars.com/..."/><Button type="button" onClick={importFromUrl} disabled={importBusy||!importUrl.trim()}>{importBusy?<Loader2 className="spin"/>:<Download/>}{importBusy?"Татаж байна...":"Мэдээлэл татах"}</Button></div></div>}
      <label><span>Stock ID</span><Input required maxLength={80} value={form.stockNo} onChange={e=>field("stockNo",e.target.value)}/></label><label><span>Зах зээл</span><Select value={form.sourceMarket} onValueChange={v=>field("sourceMarket",v as ManagedVehicle["sourceMarket"])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="KOREA">Солонгос</SelectItem><SelectItem value="USA">Америк</SelectItem><SelectItem value="MONGOLIA">Монголд бэлэн</SelectItem></SelectContent></Select></label><label><span>Төлөв</span><Select value={form.status} onValueChange={v=>field("status",v as ManagedVehicle["status"])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="AVAILABLE">Бэлэн</SelectItem><SelectItem value="RESERVED">Захиалгатай</SelectItem><SelectItem value="SOLD">Зарагдсан</SelectItem><SelectItem value="ARCHIVED">Архив</SelectItem></SelectContent></Select></label>
      <label><span>Марк</span><Input required maxLength={100} value={form.make} onChange={e=>field("make",e.target.value)}/></label><label><span>Загвар</span><Input required maxLength={120} value={form.model} onChange={e=>field("model",e.target.value)}/></label><label><span>Комплектаци</span><Input maxLength={160} value={form.trim??""} onChange={e=>field("trim",e.target.value)}/></label>
      <label><span>Үйлдвэрлэсэн он</span><Input required type="number" min={1950} max={2100} value={form.productionYear} onChange={e=>field("productionYear",Number(e.target.value))}/></label><label><span>Гүйлт (км)</span><Input required type="number" min={0} value={form.mileageKm} onChange={e=>field("mileageKm",Number(e.target.value))}/></label><label><span>VIN / Явах эд ангийн №</span><Input maxLength={32} value={form.vin??""} onChange={e=>field("vin",e.target.value.toUpperCase())} placeholder="KMH..."/></label>
      <label><span>Хөдөлгүүр (cc)</span><Input type="number" min={0} value={form.engineCapacityCc??0} onChange={e=>field("engineCapacityCc",Number(e.target.value))}/></label>
      <label><span>Түлш</span><Input maxLength={80} value={form.fuelType??""} onChange={e=>field("fuelType",e.target.value)}/></label><label><span>Өнгө</span><Input maxLength={80} value={form.color??""} onChange={e=>field("color",e.target.value)}/></label><label><span>Үнэ</span><div className="vehicle-price-input"><Input required type="number" min={0} value={form.priceAmount} onChange={e=>field("priceAmount",Number(e.target.value))}/><Select value={form.priceCurrency} onValueChange={v=>field("priceCurrency",v as ManagedVehicle["priceCurrency"])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="KRW">KRW</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="MNT">MNT</SelectItem></SelectContent></Select></div></label>
      <label className="wide"><span>Эх зарын холбоос</span><Input type="url" value={form.listingUrl??""} onChange={e=>field("listingUrl",e.target.value)}/></label><label className="wide"><span>Зургийн холбоос</span><Input type="url" value={form.imageUrl??""} onChange={e=>field("imageUrl",e.target.value)} placeholder="https://..."/></label><label className="wide vehicle-image-file"><span><ImagePlus/> Зургийн файл</span><input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"/><small>JPG, PNG, WEBP · 5 MB хүртэл. Файл сонговол зургийн холбоосыг орлоно.</small></label><label className="wide"><span>Тайлбар</span><textarea maxLength={1200} value={form.description??""} onChange={e=>field("description",e.target.value)}/></label>
      <div className="vehicle-publish-options wide"><label><Switch checked={form.isPublished} onCheckedChange={v=>field("isPublished",v)}/><span><strong>Нийтийн каталогт нийтлэх</strong><small>Идэвхжүүлбэл хэрэглэгчид шууд харагдана.</small></span></label><label><Switch checked={form.isFeatured} onCheckedChange={v=>field("isFeatured",v)}/><span><strong>Нүүр хуудсанд онцлох</strong><small>Онцлох автомашины эхэнд гаргана.</small></span></label></div>
    </div><DialogFooter><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Болих</Button><Button type="submit" disabled={busy}>{busy?"Хадгалж байна...":"Хадгалах"}</Button></DialogFooter></form></DialogContent></Dialog>
  </>;
}
