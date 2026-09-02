import { eq } from "drizzle-orm";
import { getExposManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { expos } from "@/db/schema";
import { getExpoBucket } from "@/lib/expo-catalog";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;const[expo]=await getDb().select({imageObjectKey:expos.imageObjectKey,isPublished:expos.isPublished}).from(expos).where(eq(expos.id,id)).limit(1);if(!expo?.imageObjectKey)return Response.json({error:"image not found"},{status:404});if(!expo.isPublished&&!await getAdminUser())return Response.json({error:"image not found"},{status:404});const object=await getExpoBucket().get(expo.imageObjectKey);if(!object)return Response.json({error:"image not found"},{status:404});return new Response(object.body,{headers:{"content-type":object.httpMetadata?.contentType??"image/jpeg","cache-control":expo.isPublished?"public, max-age=86400":"private, no-store","x-content-type-options":"nosniff"}});}
