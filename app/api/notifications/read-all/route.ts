import { and, eq } from "drizzle-orm";
import { getNotificationsManager as getAdminUser, getCustomerUser, getFinanceUser, getTransportUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";

export async function POST(request:Request){
  const body=await request.json().catch(()=>null) as {scope?:unknown}|null;
  const scope=String(body?.scope??""); const db=getDb(); const now=new Date().toISOString();
  if(scope==="ADMIN"){
    if(!await getAdminUser())return Response.json({error:"unauthorized"},{status:401});
    await db.update(notifications).set({isRead:true,readAt:now}).where(and(eq(notifications.recipientType,"ADMIN"),eq(notifications.isRead,false)));
  }else if(scope==="FINANCE"){
    if(!await getFinanceUser("FINANCE_NOTIFICATIONS_VIEW"))return Response.json({error:"unauthorized"},{status:401});
    await db.update(notifications).set({isRead:true,readAt:now}).where(and(eq(notifications.recipientType,"FINANCE"),eq(notifications.isRead,false)));
  }else if(scope==="TRANSPORT"){
    const transport=await getTransportUser("TRANSPORT_NOTIFICATIONS_VIEW"); if(!transport)return Response.json({error:"unauthorized"},{status:401});
    await db.update(notifications).set({isRead:true,readAt:now}).where(and(eq(notifications.recipientType,"TRANSPORT"),eq(notifications.recipientEmail,transport.email.toLowerCase()),eq(notifications.isRead,false)));
  }else{
    const user=await getCustomerUser("CUSTOMER_NOTIFICATIONS_VIEW"); if(!user)return Response.json({error:"unauthorized"},{status:401});
    await db.update(notifications).set({isRead:true,readAt:now}).where(and(eq(notifications.recipientType,"CUSTOMER"),eq(notifications.recipientEmail,user.email.toLowerCase()),eq(notifications.isRead,false)));
  }
  return Response.json({updated:true});
}
