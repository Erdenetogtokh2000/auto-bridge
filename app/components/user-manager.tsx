"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pencil, Plus, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { defaultPermissionsForRole, permissionDefinitionsForRole, type UserPermission } from "@/lib/role-permissions";

export type ManagedUser = {
  id: string | null;
  email: string;
  fullName: string;
  phone: string | null;
  role: "CUSTOMER" | "DEALER" | "TRANSPORT" | "FINANCE" | "MANAGER" | "ADMIN";
  permissions: UserPermission[];
  permissionsCustomized: boolean;
  status: "ACTIVE" | "SUSPENDED";
  companyName: string | null;
  companyRegistrationNo: string | null;
  financingEligible: boolean;
  notes: string | null;
  orderCount: number;
  lastOrderAt: string | null;
};

const roleLabels: Record<ManagedUser["role"], string> = { CUSTOMER: "Харилцагч", DEALER: "Менежер", TRANSPORT: "Тээврийн ажилтан", FINANCE: "ББСБ", MANAGER: "Менежер", ADMIN: "Админ" };
const blank: ManagedUser = { id: null, email: "", fullName: "", phone: null, role: "CUSTOMER", permissions: defaultPermissionsForRole("CUSTOMER"), permissionsCustomized: false, status: "ACTIVE", companyName: null, companyRegistrationNo: null, financingEligible: false, notes: null, orderCount: 0, lastOrderAt: null };

export function UserManager({ users, currentEmail }: { users: ManagedUser[]; currentEmail: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ManagedUser>(blank);
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => users.filter(user => {
    const haystack = `${user.fullName} ${user.email} ${user.phone ?? ""} ${user.companyName ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (roleFilter === "ALL" || user.role === roleFilter);
  }), [users, query, roleFilter]);

  function createUser() { setEditing(false); setForm({ ...blank, permissions: [...defaultPermissionsForRole("CUSTOMER")] }); setOpen(true); }
  function editUser(user: ManagedUser) { setEditing(true); setForm({ ...user, permissions: [...user.permissions] }); setOpen(true); }
  function setField<K extends keyof ManagedUser>(key: K, value: ManagedUser[K]) { setForm(current => ({ ...current, [key]: value })); }
  function changeRole(role: ManagedUser["role"]) { setForm(current => ({ ...current, role, permissions: defaultPermissionsForRole(role), permissionsCustomized: false })); }
  function togglePermission(permission: UserPermission, checked: boolean) { setForm(current => ({ ...current, permissionsCustomized: true, permissions: checked ? [...new Set([...current.permissions, permission])] : current.permissions.filter(item => item !== permission) })); }
  function resetPermissions() { setForm(current => ({ ...current, permissions: defaultPermissionsForRole(current.role), permissionsCustomized: false })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(form.id ? `/api/admin/users/${encodeURIComponent(form.id)}` : "/api/admin/users", { method: form.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error();
      toast.success(form.id ? "Хэрэглэгчийн мэдээлэл, эрхийг шинэчиллээ." : "Шинэ хэрэглэгч нэмэгдлээ.");
      setOpen(false);
      router.refresh();
    } catch { toast.error("Хэрэглэгчийг хадгалахад алдаа гарлаа. И-мэйл болон эрхийн тохиргоог шалгана уу."); }
    finally { setBusy(false); }
  }

  return <>
    <section className="dashboard-panel user-directory-panel">
      <div className="user-directory-toolbar"><div><span>ХЭРЭГЛЭГЧИЙН ЛАВЛАХ</span><h2>Харилцагч, менежер болон ажилтнууд</h2></div><div className="user-directory-controls">
        <label><Search/><Input aria-label="Хэрэглэгч хайх" value={query} onChange={event => setQuery(event.target.value)} placeholder="Нэр, и-мэйл, утсаар хайх"/></label>
        <Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">Бүх эрх</SelectItem><SelectItem value="CUSTOMER">Харилцагч</SelectItem><SelectItem value="DEALER">Менежер</SelectItem><SelectItem value="FINANCE">ББСБ</SelectItem><SelectItem value="TRANSPORT">Тээврийн ажилтан</SelectItem><SelectItem value="ADMIN">Админ</SelectItem></SelectContent></Select>
        <Button onClick={createUser}><Plus/>Хэрэглэгч нэмэх</Button>
      </div></div>
      <div className="user-directory-table"><Table><TableHeader><TableRow><TableHead>ХЭРЭГЛЭГЧ</TableHead><TableHead>ЭРХ</TableHead><TableHead>БАЙГУУЛЛАГА</TableHead><TableHead>ЗАХИАЛГА</TableHead><TableHead>ТӨЛӨВ</TableHead><TableHead/></TableRow></TableHeader><TableBody>
        {filtered.map(user => <TableRow key={user.email}><TableCell><div className="user-identity"><i>{user.fullName.slice(0,1).toUpperCase()}</i><span><strong>{user.fullName}{user.email===currentEmail&&<em>ТА</em>}</strong><small>{user.email}{user.phone?` · ${user.phone}`:""}</small></span></div></TableCell><TableCell><span className={`user-role ${user.role.toLowerCase()}`}>{user.role==="ADMIN"||user.role==="MANAGER"?<ShieldCheck/>:user.role==="DEALER"||user.role==="FINANCE"?<Building2/>:<UserRoundCheck/>}{roleLabels[user.role]}</span>{user.role!=="ADMIN"&&<small className="user-permission-count">{user.permissions.length} үйлдэл · {user.permissionsCustomized?"Тусгай":"Үндсэн"}</small>}{user.financingEligible&&<small className="user-financing-badge">ББСБ гэрээтэй</small>}</TableCell><TableCell>{user.companyName?<span className="company-cell"><strong>{user.companyName}</strong><small>{user.companyRegistrationNo ?? "Бүртгэлийн дугааргүй"}</small></span>:<small className="muted-cell">—</small>}</TableCell><TableCell><span className="order-count-cell"><strong>{user.orderCount}</strong><small>{user.lastOrderAt?.slice(0,10) ?? "Захиалгагүй"}</small></span></TableCell><TableCell><span className={`user-status ${user.status.toLowerCase()}`}>{user.status==="ACTIVE"?"ИДЭВХТЭЙ":"ТҮДГЭЛЗСЭН"}</span></TableCell><TableCell><Button variant="ghost" size="sm" onClick={()=>editUser(user)}><Pencil/>Засах</Button></TableCell></TableRow>)}
        {!filtered.length&&<TableRow><TableCell colSpan={6}><div className="panel-empty">Хайлтад тохирох хэрэглэгч олдсонгүй.</div></TableCell></TableRow>}
      </TableBody></Table></div>
    </section>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="user-dialog"><DialogHeader><DialogTitle>{editing?"Хэрэглэгч ба эрх засах":"Шинэ хэрэглэгч нэмэх"}</DialogTitle><DialogDescription>Нэвтрэх и-мэйл, эрхийн төрөл болон ашиглах үйлдлүүдийг тохируулна.</DialogDescription></DialogHeader><form onSubmit={submit}>
      <div className="user-form-grid"><label><span>Овог нэр</span><Input required maxLength={160} value={form.fullName} onChange={event=>setField("fullName",event.target.value)} /></label><label><span>И-мэйл</span><Input type="email" required disabled={editing} value={form.email} onChange={event=>setField("email",event.target.value)} /></label><label><span>Утас</span><Input maxLength={50} value={form.phone??""} onChange={event=>setField("phone",event.target.value)} /></label><label><span>Эрхийн төрөл</span><Select disabled={form.email===currentEmail} value={form.role==="MANAGER"?"DEALER":form.role} onValueChange={value=>changeRole(value as ManagedUser["role"])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="CUSTOMER">Харилцагч</SelectItem><SelectItem value="DEALER">Менежер</SelectItem><SelectItem value="FINANCE">ББСБ</SelectItem><SelectItem value="TRANSPORT">Тээврийн ажилтан</SelectItem><SelectItem value="ADMIN">Админ</SelectItem></SelectContent></Select></label><label><span>Төлөв</span><Select disabled={form.email===currentEmail} value={form.status} onValueChange={value=>setField("status",value as ManagedUser["status"])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Идэвхтэй</SelectItem><SelectItem value="SUSPENDED">Түдгэлзүүлсэн</SelectItem></SelectContent></Select></label><label><span>Байгууллагын нэр</span><Input maxLength={180} value={form.companyName??""} onChange={event=>setField("companyName",event.target.value)} /></label><label><span>Регистр / Бүртгэлийн №</span><Input maxLength={80} value={form.companyRegistrationNo??""} onChange={event=>setField("companyRegistrationNo",event.target.value)} /></label><label className="user-financing-toggle"><input type="checkbox" checked={form.financingEligible} onChange={event=>setField("financingEligible",event.target.checked)} /><span><strong>ББСБ-ын гэрээтэй</strong><small>Харилцагч 70% болон гаалийн санхүүжилт хүсэх боломжтой</small></span></label><label className="wide"><span>Дотоод тэмдэглэл</span><textarea maxLength={1000} value={form.notes??""} onChange={event=>setField("notes",event.target.value)} /></label></div>
      {form.role!=="ADMIN"?<section className="manager-permission-panel"><div className="permission-panel-heading"><span><strong>{roleLabels[form.role]}ийн үйлдлийн эрх</strong><small>Сонгосон үйлдэл л нээгдэнэ. Өөрийн болон хуваарилсан өгөгдлийн хүрээ өөрчлөгдөхгүй.</small></span><Button type="button" variant="outline" size="sm" onClick={resetPermissions}>Үндсэн эрх сэргээх</Button></div><div className="manager-permission-grid">{permissionDefinitionsForRole(form.role).map(item=><label key={item.code}><Checkbox checked={form.permissions.includes(item.code)} onCheckedChange={checked=>togglePermission(item.code,checked===true)}/><span><strong>{item.title}</strong><small>{item.description}</small></span></label>)}</div></section>:<section className="manager-permission-panel admin-full-access"><ShieldCheck/><span><strong>Админ бүх эрхтэй</strong><small>Хэрэглэгч ба эрхийн удирдлага зэрэг системийн бүрэн эрхийг хязгаарлахгүй.</small></span></section>}
      <DialogFooter><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Болих</Button><Button type="submit" disabled={busy}>{busy?"Хадгалж байна...":"Хадгалах"}</Button></DialogFooter>
    </form></DialogContent></Dialog>
  </>;
}
