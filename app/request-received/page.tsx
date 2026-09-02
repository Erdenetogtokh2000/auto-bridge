import { ArrowLeft, CheckCircle2, Clock3, Link2 } from "lucide-react";

export default async function RequestReceived({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <main className="success-page">
      <section className="success-card">
        <div className="success-icon"><CheckCircle2 size={38} /></div>
        <p className="section-kicker">ХҮСЭЛТ АМЖИЛТТАЙ</p>
        <h1>Үнийн саналын хүсэлтийг хүлээн авлаа</h1>
        <p>Манай ажилтан автомашины мэдээлэл, худалдан авалт, тээвэр болон гаалийн урьдчилсан тооцоог шалгана.</p>
        <div className="success-reference"><Link2 size={17} /><span>Хүсэлтийн дугаар</span><strong>{ref ?? "Шинэ хүсэлт"}</strong></div>
        <div className="success-note"><Clock3 size={17} /><span>Хариу бэлтгэгдмэгц таны хувийн кабинетад мэдэгдэл гарна.</span></div>
        <a className="primary-button" href="/"><ArrowLeft size={16} /> Нүүр хуудас руу буцах</a>
      </section>
    </main>
  );
}
