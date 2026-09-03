import { LockKeyhole } from "lucide-react";

export default function AccessDeniedPage() {
  return <main className="access-denied"><div><LockKeyhole/><span>ХАНДАЛТ ХЯЗГААРЛАГДСАН</span><h1>Энэ хэсэгт нэвтрэх эрхгүй</h1><p>Таны бүртгэлийн эрх энэ самбарт тохирохгүй байна. Нэгдсэн нэвтрэх хэсэг рүү буцахад систем таны зөв самбарыг нээнэ.</p><div className="access-denied-actions"><a href="/login">Нэгдсэн нэвтрэх хэсэг</a><a className="secondary" href="/logout">Өөр бүртгэлээр нэвтрэх</a></div></div></main>;
}
