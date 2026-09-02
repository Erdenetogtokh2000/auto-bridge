import { eq } from "drizzle-orm";
import { getOrdersManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications, orders } from "@/db/schema";
import { notificationValues } from "@/lib/notifications";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const admin=await getAdminUser(); if(!admin)return Response.json({error:"unauthorized"},{status:401});
  const {id:orderId}=await params; const db=getDb();
  const [order]=await db.select().from(orders).where(eq(orders.id,orderId)).limit(1);
  if(!order)return Response.json({error:"order not found"},{status:404});
  const body=await request.json().catch(()=>null) as {title?:unknown;message?:unknown}|null;
  const title=String(body?.title??"").trim().slice(0,160); const message=String(body?.message??"").trim().slice(0,600);
  if(!title||!message)return Response.json({error:"required fields missing"},{status:400});
  const value=notificationValues({recipientType:"CUSTOMER",recipientEmail:order.customerEmail,orderId,type:"ADMIN_MESSAGE",title,message,href:`/portal/vehicles/${encodeURIComponent(order.orderNo??order.id)}`,actorEmail:admin.email});
  await db.insert(notifications).values(value);
  return Response.json({notification:value},{status:201});
}
