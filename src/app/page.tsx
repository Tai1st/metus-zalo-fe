import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { PricingTabs } from "@/components/PricingTabs";
import { getCatalog } from "@/server/catalog";
import { LeadModal } from "@/components/LeadModal";
import { BrandMark } from "@/components/BrandMark";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700", "800"] });

const APP_HREF = "/accounts";
// TODO: điền thông tin liên hệ thật của Metus Zalo
const CONTACT = { hotline: "0987533112", email: "", website: "" };
const ZALO_HREF = "https://zalo.me/0987533112";


const STEPS = [
  { n: "01", t: "Nhập link nhóm hoặc chọn nick", d: "Dán link mời nhóm Zalo bất kỳ, hoặc chọn nhóm mà tài khoản Zalo của bạn đã tham gia.", c: "from-[#3b82f6] to-[#1d4ed8]" },
  { n: "02", t: "Metus Zalo quét toàn bộ thành viên", d: "Hệ thống tự động phân tích và phát hiện các thành viên đang ẩn danh mà Zalo thông thường không hiển thị.", c: "from-[#fbbf24] to-[#f59e0b]" },
  { n: "03", t: "Hiển thị danh sách đầy đủ", d: "Toàn bộ thành viên — ẩn hay không ẩn — được liệt kê rõ ràng tên cùng vai trò và thông tin nhóm.", c: "from-[#a855f7] to-[#7c3aed]" },
  { n: "04", t: "Khai thác ngay dữ liệu vừa quét", d: "Hiện danh sách thành viên để kết bạn trong phần mềm, tự động sử dụng hàng chục nick Zalo gửi kết bạn, gửi tin nhắn kèm video - hình ảnh cho các nick cá nhân, mời tham gia nhóm.", c: "from-[#22c55e] to-[#059669]" },
];

const ACTIVITY = [
  ["NT", "Nguyễn Thắng", "đã được kết bạn", "vừa xong", "#60a5fa"],
  ["ML", "Mai Linh", "nhận tin nhắn tự động", "2s trước", "#a78bfa"],
  ["PH", "Phạm Hùng", "được mời vào nhóm", "5s trước", "#fbbf24"],
  ["TT", "Trần Thảo", "đã được kết bạn", "8s trước", "#60a5fa"],
] as const;

const PAINS = [
  { t: "Quản lý quá nhiều nick Zalo thủ công", d: "Zalo chỉ cho đăng nhập trên 1 thiết bị — bạn không thể đăng nhập hàng chục, hàng trăm nick trên cùng một trình duyệt. Đăng nhập đi đăng nhập lại, dễ lẫn, dễ logout, mất hàng giờ mỗi ngày.", big: true },
  { t: "Nhắn tin khách hàng mất thời gian", d: "Soạn từng tin một, copy paste, gửi tay — không thể scale khi data khách hàng tăng lên." },
  { t: "Không chăm sóc lại khách cũ", d: "Khách hàng cũ bị bỏ quên, không có lịch follow-up, dẫn đến mất doanh thu lặp lại." },
  { t: "Không kiểm soát được nhân viên", d: "Mỗi nhân viên dùng một Zalo riêng, chủ doanh nghiệp không biết chất lượng sale tư vấn ra sao — hội thoại thất thoát, khách mất không biết lý do." },
  { t: "Không có hệ thống automation", d: "Mọi thao tác đều phụ thuộc con người, không có workflow tự động — tăng chi phí, giảm hiệu quả." },
  { t: "Đối thủ có nhóm Zalo nghìn người, bạn thì không", d: "Đối thủ đã xây cộng đồng khách hàng trong nhóm Zalo hàng nghìn thành viên để bán hàng và chăm sóc. Bạn chưa có nhóm nào để khai thác — đang để tuột mất cơ hội kinh doanh mỗi ngày." },
];

const FEATURES: [string, string, string][] = [
  ["Quét thành viên ẩn trong nhóm Zalo", "Nhập link nhóm hoặc chọn nhóm nick đã tham gia — Metus Zalo quét và hiển thị toàn bộ thành viên đang ẩn mà Zalo thông thường không cho thấy. Dữ liệu xuất ra ngay lập tức.", "from-[#4f46e5] to-[#2563eb]"],
  ["Quản lý nhiều tài khoản Zalo", "Đăng nhập & vận hành đồng thời hàng chục nick Zalo trên cùng một trình duyệt, không lo logout chéo.", "from-[#3b82f6] to-[#1d4ed8]"],
  ["Chat trực tiếp với khách", "Trả lời tin nhắn khách hàng ngay trong phần mềm — không cần mở Zalo Web, không bỏ lỡ inbox.", "from-[#0ea5e9] to-[#2563eb]"],
  ["Gắn nhãn & phân loại khách", "Đánh tag khách theo nguồn, hành vi, sản phẩm — lọc và chăm sóc đúng đối tượng trong vài giây.", "from-[#6366f1] to-[#4338ca]"],
  ["Lên lịch chăm sóc khách", "Đặt lịch tự động nhắn lại khách cũ, gửi tin chúc mừng, follow-up đơn hàng — không bỏ sót khách nào.", "from-[#fbbf24] to-[#f59e0b]"],
  ["Gửi tin nhắn theo tệp SĐT", "Upload danh sách số điện thoại và bắn tin nhắn hàng loạt với nội dung cá nhân hóa theo từng khách.", "from-[#0ea5e9] to-[#2563eb]"],
  ["Gửi tin nhắn cho bạn bè Zalo", "Soạn 1 lần — gửi đến toàn bộ danh bạ Zalo của bạn với tốc độ và độ an toàn được tối ưu.", "from-[#4f46e5] to-[#2563eb]"],
  ["Gửi tin cho thành viên nhóm", "Quét và gửi tin nhắn riêng tới từng thành viên của bất kỳ nhóm Zalo nào bạn đang tham gia.", "from-[#818cf8] to-[#6366f1]"],
  ["Tự động kết bạn theo SĐT", "Kết bạn hàng loạt theo file số điện thoại với lời chào tự nhiên, mô phỏng hành vi người thật.", "from-[#10b981] to-[#059669]"],
  ["Tự động kết bạn thành viên nhóm", "Quét toàn bộ thành viên nhóm Zalo và gửi lời mời kết bạn theo lịch trình thông minh.", "from-[#a855f7] to-[#6366f1]"],
  ["Tự động tham gia nhóm", "Vào hàng loạt nhóm Zalo theo link mời, phân bổ đều giữa các tài khoản để tránh giới hạn.", "from-[#f97316] to-[#dc2626]"],
  ["Tự động nhắn tin trong nhóm", "Đăng bài, gửi nội dung quảng bá vào nhóm theo lịch — phù hợp marketing & sale đa kênh.", "from-[#a78bfa] to-[#7c3aed]"],
  ["Tự động mời vào nhóm", "Mời bạn bè, khách hàng tiềm năng vào nhóm Zalo theo tệp dữ liệu một cách an toàn.", "from-[#fb923c] to-[#ea580c]"],
  ["Backup bạn bè & dữ liệu", "Sao lưu danh bạ, hội thoại, tag khách hàng ra file — phục hồi nhanh khi đổi máy hoặc gặp sự cố.", "from-[#3b5bdb] to-[#1e3a8a]"],
  ["Điều khiển trình duyệt Zalo", "Mở Zalo Web trực tiếp trong phần mềm, thao tác như đang dùng tay — kết hợp giữa thủ công & automation.", "from-[#14b8a6] to-[#2563eb]"],
  ["Thu hồi lời mời & xóa bạn bè", "Tự động thu hồi hàng loạt lời mời kết bạn chưa được chấp nhận, hoặc xóa bạn bè theo tệp — dọn dẹp danh bạ nhanh chóng, giữ tài khoản gọn và an toàn.", "from-[#f43f5e] to-[#e11d48]"],
];

const FAQ: [string, string][] = [
  ["Metus Zalo dùng để làm gì?", "Metus Zalo là phần mềm quản lý & tự động hóa Zalo toàn diện — giúp bạn vận hành nhiều tài khoản, gửi tin nhắn hàng loạt, kết bạn tự động, chăm sóc khách hàng theo lịch và xây dựng hệ thống bán hàng qua Zalo một cách chuyên nghiệp."],
  ["Tôi không rành công nghệ thì dùng được không?", "Được. Giao diện tiếng Việt, thao tác theo từng bước rõ ràng, bạn chỉ cần thêm tài khoản, chọn tệp khách hàng và tạo chiến dịch."],
  ["Có hỗ trợ cài đặt không?", "Có. Đội ngũ hỗ trợ hướng dẫn cài đặt và sử dụng ban đầu."],
  ["Một license dùng được trên nhiều máy không?", "Mỗi gói quy định số tài khoản sử dụng. Vui lòng xem chi tiết ở phần Bảng giá hoặc liên hệ tư vấn."],
  ["Có hỗ trợ doanh nghiệp & đội ngũ lớn không?", "Có. Gói Business có tài khoản tổng quản lý, tạo thêm tài khoản nhân sự, phân quyền và quản lý tập trung."],
  ["Phần mềm có an toàn cho tài khoản Zalo không?", "Mỗi tài khoản có thể gắn proxy riêng và các thao tác được giãn cách để mô phỏng hành vi người dùng thật."],
];

const NAV = [["Tính năng", "#features"], ["Bảng giá", "#pricing"], ["FAQ", "#faq"]];

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const I = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  check: "m5 12.5 4.5 4.5L19 7.5",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4m-3.5-6.5-3 3m-3 3-3 3m9 0-3-3m-3-3-3-3",
  shield: "M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z",
  users: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m7 9v-1a4 4 0 0 0-3-3.9M15 4.2a3.5 3.5 0 0 1 0 6.6",
  bolt: "M13 3 5 14h6l-1 7 8-11h-6z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 10v1m6-1v1M9 15c1 1 5 1 6 0",
  search: "m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14",
  download: "M12 4v11m-4-4 4 4 4-4M5 20h14",
  chat: "M4 5h16v11H9l-5 4z",
  send: "m21 3-9 18-2-8-8-2z",
  phone: "M6 3h3l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2",
};

function Btn({ href, children, v = "primary", className = "" }: { href: string; children: ReactNode; v?: "primary" | "white" | "yellow" | "glass"; className?: string }) {
  const s = {
    primary: "bg-[#2563eb] text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,.7)] hover:bg-[#1d4ed8]",
    white: "bg-white text-[#0f172a] border border-[#e6ebf5] shadow-sm hover:bg-[#f8faff]",
    yellow: "bg-[#fbbf24] text-[#3b2a00] hover:bg-[#f59e0b]",
    glass: "bg-white/10 text-white border border-white/25 hover:bg-white/15",
  }[v];
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition ${s} ${className}`}>
      {children}
    </Link>
  );
}

function Pill({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider ${dark ? "border-white/20 bg-white/5 text-sky-200" : "border-[#dbe5fb] bg-white/80 text-[#2563eb]"}`}>
      {children}
    </span>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />;
}

function Title({ pill, title, desc, dark }: { pill: string; title: ReactNode; desc?: string; dark?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Pill dark={dark}><Dot />{pill}</Pill>
      <h2 className={`mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl ${dark ? "text-white" : "text-[#0b1220]"}`}>{title}</h2>
      {desc && <p className={`mx-auto mt-5 max-w-xl text-base leading-relaxed ${dark ? "text-white/70" : "text-[#5b6577]"}`}>{desc}</p>}
    </div>
  );
}

function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={36} className="ring-2 ring-white/70" />
      <span className="leading-tight">
        <span className={`block text-[15px] font-extrabold ${light ? "text-white" : "text-[#0b1220]"}`}>Metus Zalo</span>
        <span className={`block text-[9px] font-semibold uppercase tracking-[.2em] ${light ? "text-white/60" : "text-[#5b6577]"}`}>Automation Suite</span>
      </span>
    </span>
  );
}

export default async function Landing() {
  const catalog = await getCatalog();
  return (
    <div className={`${jakarta.className} overflow-x-clip bg-[#f3f6fd] text-[#0b1220]`}>
      <LeadModal />
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 pt-3">
        <header className="mx-auto flex h-16 max-w-300 items-center justify-between rounded-2xl border border-white bg-white px-5 shadow-lg shadow-blue-900/10">
          <a href="#top"><Logo /></a>
          <nav className="hidden flex-1 items-center justify-center gap-8 text-sm font-medium text-[#1f2a44] md:flex">
            {NAV.map(([l, h]) => <a key={h} href={h}>{l}</a>)}
          </nav>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hidden text-sm font-medium text-[#1f2a44] sm:block">Đăng nhập</Link>
            <Btn href={"#trial"} className="px-5 py-2.5">Dùng thử ngay <Icon d={I.arrow} size={14} /></Btn>
          </div>
        </header>
      </div>

      {/* Hero */}
      <section id="top" className="relative">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ backgroundImage: "linear-gradient(#dfe6f5 1px,transparent 1px),linear-gradient(90deg,#dfe6f5 1px,transparent 1px)", backgroundSize: "64px 64px", maskImage: "linear-gradient(#000,transparent 90%)" }}
        />
        <div className="pointer-events-none absolute -left-32 top-24 h-96 w-96 rounded-full bg-[#93c5fd]/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-16 h-96 w-96 rounded-full bg-[#fde68a]/60 blur-3xl" />
        <div className="relative mx-auto grid max-w-300 items-center gap-10 px-4 pb-28 pt-16 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="flex flex-col items-start gap-2.5">
              <Pill><Icon d={I.spark} size={13} />Phần mềm quản lý & tự động hóa Zalo #1 Việt Nam</Pill>
              <a href="#features" className="inline-flex items-center gap-2 rounded-full bg-[#dbe5fb] px-3.5 py-1.5 text-xs font-bold text-[#1d4ed8]">
                <Icon d={I.scan} size={13} /> Mới · Quét thành viên ẩn nhóm Zalo <Icon d={I.arrow} size={12} />
              </a>
            </div>
            <h1 className="mt-6 text-[56px] font-extrabold leading-[1.02] tracking-tight sm:text-[64px]">
              <span className="bg-linear-to-r from-[#2563eb] to-[#c08a3a] bg-clip-text text-transparent">Metus Zalo</span>
              <br />
              Giải pháp quản lý
              <br />
              & tự động hóa
              <br />
              <span className="bg-linear-to-r from-[#2563eb] to-[#c08a3a] bg-clip-text text-transparent">Zalo</span> toàn diện
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-[#5b6577]">
              Nền tảng tập trung toàn bộ hội thoại, tự động hóa chăm sóc và phát triển cộng đồng khách hàng Zalo — trên một dashboard duy nhất.
            </p>
            <ul className="mt-6 space-y-3 text-sm font-medium text-[#1f2a44]">
              {["Quản lý nhiều tài khoản Zalo từ 1 nơi", "Gửi tin hàng loạt, tự động kết bạn & mời nhóm", "Quét & tiếp cận 10.000+ thành viên ẩn mỗi ngày"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-[#2563eb]"><Icon d={I.check} size={16} /><span className="text-[#1f2a44]">{t}</span></li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Btn href={"#trial"}>Dùng thử ngay <Icon d={I.arrow} size={15} /></Btn>
              <Btn href="#pricing" v="white">▷ Xem bảng giá</Btn>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#5b6577]">
              <span className="flex items-center gap-2 text-[#2563eb]"><Icon d={I.shield} size={17} /><span className="text-[#5b6577]">An toàn cho tài khoản Zalo</span></span>
              <span className="flex items-center gap-2 text-[#2563eb]"><Icon d={I.scan} size={17} /><span className="text-[#5b6577]">Quét thành viên ẩn nhóm</span></span>
              <span className="flex items-center gap-2 text-[#2563eb]"><Icon d={I.users} size={17} /><span className="text-[#5b6577]">10.000+ người dùng tin tưởng</span></span>
            </div>
          </div>

          <div className="rounded-[28px] border border-white bg-white/60 p-2.5 shadow-[0_30px_80px_-20px_rgba(37,99,235,.35)] backdrop-blur">
            <Image src="/hero-features.png" alt="Nhiều tài khoản Zalo, hội thoại tập trung, gửi tin hàng loạt, quét thành viên ẩn, tự động kết bạn, mời vào nhóm" width={1536} height={1024} priority className="h-auto w-full rounded-3xl" />
          </div>
        </div>
      </section>

      {/* Scan (dark) */}
      <section className="relative overflow-hidden bg-linear-to-b from-[#1e3a9f] via-[#0f1e5a] to-[#0a1030] py-20 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(#5b7bd8 1px,transparent 1px),linear-gradient(90deg,#5b7bd8 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="relative mx-auto max-w-300 px-4">
          <Title dark pill="Tính năng độc quyền" title={<>Quét thành viên <span className="bg-linear-to-r from-[#8ab4ff] to-[#e0b060] bg-clip-text text-transparent">ẩn danh</span> trong bất kỳ nhóm Zalo nào</>}
            desc="Chỉ cần nhập link nhóm hoặc chọn nick Zalo đã tham gia — Metus Zalo tự động phát hiện và liệt kê toàn bộ thành viên đang ẩn mà Zalo thông thường không hiển thị." />
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[[I.bolt, "Quét siêu nhanh"], [I.shield, "Không ảnh hưởng tài khoản"], [I.users, "Áp dụng cho mọi nhóm Zalo"]].map(([ic, t]) => (
              <span key={t} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold"><Icon d={ic} size={14} />{t}</span>
            ))}
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-[#0d1a4d]/70 p-7">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-200">Các bước thực hiện</span>
                <span className="rounded-full bg-[#2b4bb8]/60 px-3 py-1 text-[11px] font-bold text-sky-200">4 bước đơn giản</span>
              </div>
              <div className="mt-6 space-y-6">
                {STEPS.map((s, i) => (
                  <div key={s.n} className="relative flex gap-4">
                    {i < STEPS.length - 1 && <span className="absolute left-6 top-14 h-[calc(100%-2rem)] w-px bg-white/10" />}
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-linear-to-br ${s.c}`}>
                      <Icon d={[I.link, I.scan, I.search, I.download][i]} size={20} />
                    </span>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#5b9dff]">Bước {s.n}</div>
                      <div className="mt-0.5 text-lg font-bold">{s.t}</div>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/60">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0d1a4d]/70 p-7">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-200">Kết quả mỗi ngày</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Live</span>
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-linear-to-br from-[#0f5f52] to-[#0d3f4a] p-6 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">Thành viên Zalo tiếp cận được</div>
                <div className="mt-2 text-6xl font-extrabold">10.000<span className="text-emerald-300">+</span></div>
                <div className="text-sm text-white/70">người / ngày</div>
                <div className="mt-4 h-1.5 rounded-full bg-white/15"><div className="h-full w-[82%] rounded-full bg-emerald-400" /></div>
                <div className="mt-1.5 flex justify-between text-[10px] text-white/60"><span>0</span><span className="font-semibold">82% mục tiêu hôm nay</span><span>12K</span></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[["10K+", "Kết bạn", "text-sky-300", "bg-[#3b82f6]"], ["8.5K+", "Nhắn tin", "text-violet-300", "bg-[#8b5cf6]"], ["3.2K+", "Mời nhóm", "text-amber-300", "bg-[#f59e0b]"]].map(([v, l, c, bg]) => (
                  <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                    <span className={`mx-auto grid h-9 w-9 place-items-center rounded-lg ${bg}`}><Icon d={I.users} size={16} /></span>
                    <div className={`mt-2 text-lg font-extrabold ${c}`}>{v}</div>
                    <div className="text-[11px] text-white/60">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">Hoạt động gần đây</div>
                <div className="mt-3 space-y-2.5">
                  {ACTIVITY.map(([ab, n, a, t, dc]) => (
                    <div key={n} className="flex items-center gap-3 text-xs">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[10px] font-bold">{ab}</span>
                      <span className="flex-1"><b>{n}</b> <span className="text-white/60">{a}</span></span>
                      <span className="flex items-center gap-1.5 text-[10px] text-white/50"><span className="h-1.5 w-1.5 rounded-full" style={{ background: dc }} />{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-sky-400/30 bg-sky-400/5 px-4 py-3 text-xs">
                <span className="text-white/70">↗ Hiệu suất so với làm thủ công</span>
                <span className="font-extrabold text-emerald-300">x50 nhanh hơn</span>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
            <Btn href={"#trial"}>Đăng ký dùng thử tính năng này <Icon d={I.arrow} size={15} /></Btn>
            <a href="#features" className="text-sm font-semibold text-white/70">Xem tất cả 16 tính năng →</a>
          </div>
        </div>
      </section>

      {/* Pains */}
      <section className="relative py-24">
        <div className="mx-auto max-w-300 px-4">
          <Title pill="Vấn đề thường gặp" title="Bạn đang đau đầu vì những điều này?" desc="Hầu hết doanh nghiệp và shop online đang lãng phí thời gian, nhân lực và doanh thu vì cùng những vấn đề cơ bản khi vận hành Zalo." />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {PAINS.map((p, i) => {
              const Ic = [I.chat, I.bolt, I.users, I.shield, I.link, I.users][i];
              return p.big ? (
                <div key={p.t} className="rounded-3xl bg-linear-to-br from-[#2563eb] to-[#1d3fae] p-7 text-white shadow-xl shadow-blue-600/20 md:col-span-2">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/20"><Icon d={"M12 3 3 8l9 5 9-5zM3 13l9 5 9-5"} size={20} /></span>
                  <h3 className="mt-14 text-lg font-bold">{p.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">{p.d}</p>
                </div>
              ) : (
                <div key={p.t} className="rounded-3xl border border-[#e8eefb] bg-white p-7 shadow-sm">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#eef4ff] text-[#2563eb]"><Icon d={Ic} size={20} /></span>
                  <h3 className="mt-14 text-lg font-bold">{p.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#667085]">{p.d}</p>
                </div>
              );
            })}
            <div className="rounded-3xl border border-amber-200/70 bg-linear-to-br from-[#fff8e1] to-white p-7 shadow-sm md:col-span-2">
              <div className="text-[11px] font-bold uppercase tracking-wider">Giải pháp</div>
              <h3 className="mt-3 text-3xl font-extrabold">Metus Zalo giải quyết tất cả <span className="bg-linear-to-r from-[#2563eb] to-[#c08a3a] bg-clip-text text-transparent">trong một dashboard</span></h3>
              <p className="mt-3 text-sm text-[#5b6577]">Quản lý hàng trăm nick Zalo cùng lúc, xây dựng & khai thác nhóm khách hàng, tự động hóa chăm sóc và bán hàng — không cần đăng nhập thủ công, không lo mất dữ liệu.</p>
              <a href="#features" className="mt-5 inline-block text-sm font-bold text-[#2563eb]">Khám phá giải pháp →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative bg-linear-to-b from-[#f3f6fd] via-[#dbe6fb] to-[#e5e9f2] py-24">
        <div className="mx-auto max-w-300 px-4">
          <Title pill="Giải pháp Metus Zalo" title="16 tính năng mạnh mẽ trong một nền tảng duy nhất" desc="Mỗi tính năng được thiết kế để giải quyết một bài toán cụ thể của doanh nghiệp Việt — tất cả tích hợp mượt mà trong cùng một trải nghiệm." />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(([t, d, g], i) => (
              <div key={t} className="rounded-3xl border border-white bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <span className={`grid h-12 w-12 place-items-center rounded-xl bg-linear-to-br text-white ${g}`}>
                  <Icon d={[I.scan, I.users, I.chat, "M20 12 12 20 4 12V4h8z", "M4 6h16v14H4zM8 3v4m8-4v4M4 11h16", I.send, I.chat, I.users, "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-8 9c0-4 4-6 8-6s8 2 8 6", I.scan, "M6 3h12v18H6zM10 8h4", I.chat, I.phone, "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3m0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6", "M3 5h13v9H3zM8 19h3", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-8 9c0-4 4-6 8-6s8 2 8 6M17 8h5"][i]} size={22} />
                </span>
                <h3 className="mt-6 text-[15px] font-bold leading-snug">{t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#667085]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative bg-linear-to-b from-[#e5e9f2] via-[#dbe6fb] to-[#e4e8f1] py-24">
        <div className="mx-auto max-w-300 px-4">
          <Title pill="Bảng giá Metus Zalo" title="Đầu tư một lần — bứt phá dài hạn" desc="Lựa chọn gói phù hợp với nhu cầu cá nhân hoặc doanh nghiệp. Tất cả tính năng, không phụ thu, không phát sinh ẩn." />
          <PricingTabs plans={catalog.plans} addons={catalog.addons} />
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="relative overflow-hidden py-24"
      >
        <div className="relative mx-auto grid max-w-300 gap-10 px-4 lg:grid-cols-[.9fr_1.3fr]">
          <div>
            <Pill><Dot />Câu hỏi thường gặp</Pill>
            <h2 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-[#0b1220]">Mọi điều bạn cần biết về Metus Zalo</h2>
            <p className="mt-5 text-base leading-relaxed text-[#5b6577]">Không tìm thấy câu trả lời? Đội ngũ tư vấn của chúng tôi luôn sẵn sàng hỗ trợ 24/7.</p>
            <div className="mt-7 space-y-3">
              <Link href={ZALO_HREF} target="_blank" className="flex items-center gap-4 rounded-2xl bg-linear-to-r from-[#2563eb] to-[#1d3fae] p-4 text-white">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/20"><Icon d={I.chat} size={18} /></span>
                <span className="flex-1"><b className="block text-sm">Liên hệ tư vấn</b><span className="text-xs text-white/80">{CONTACT.hotline ? `Hotline ${CONTACT.hotline} — ` : ""}luôn sẵn sàng</span></span>
                <Icon d={I.arrow} size={16} />
              </Link>
              <div className="flex items-center gap-4 rounded-2xl bg-white p-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef4ff] text-[#2563eb]"><Icon d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18" size={18} /></span>
                <span><b className="block text-sm">Xem tài liệu</b><span className="text-xs text-[#667085]">Hướng dẫn sử dụng đầy đủ</span></span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0} className="group rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-[#eef1f8] open:border open:border-[#b9cdfb] open:bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold">
                  {q}
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eef4ff] text-lg text-[#2563eb] group-open:bg-[#2563eb] group-open:text-white"><span className="group-open:hidden">+</span><span className="hidden group-open:inline">×</span></span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-[#667085]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-24">
        <div className="relative mx-auto max-w-300 overflow-hidden rounded-[40px] bg-linear-to-br from-[#3568e0] via-[#2450c0] to-[#1d2f78] p-10 text-white shadow-2xl shadow-blue-800/30 md:p-14">
          <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">✦ Bắt đầu miễn phí trong hôm nay</span>
              <h2 className="mt-6 text-5xl font-extrabold leading-[1.1] tracking-tight">Tăng hiệu quả bán hàng với <span className="text-amber-400">Metus Zalo</span> ngay hôm nay</h2>
              <p className="mt-5 max-w-xl text-white/80">Tự động hóa từ A-Z, quản lý tập trung, bảo mật tài khoản. Doanh nghiệp bứt phá doanh số cùng Metus Zalo.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Btn href={ZALO_HREF} v="yellow"><Icon d={I.phone} size={16} />Liên hệ tư vấn</Btn>
                <Btn href={"#trial"} v="glass">Dùng thử ngay <Icon d={I.arrow} size={15} /></Btn>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-xs text-white/80">
                <span>◇ An toàn cho tài khoản Zalo</span><span>◇ Hỗ trợ 24/7</span><span>◇ Dùng thử trong 7 ngày</span>
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-400 text-[#3b2a00]"><Icon d={I.phone} size={24} /></span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Hotline tư vấn</div>
                  <div className="text-2xl font-extrabold">{CONTACT.hotline || "Đang cập nhật"}</div>
                </div>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {["Tư vấn miễn phí 1–1", "Demo trực tiếp tính năng", "Onboarding cho doanh nghiệp"].map((t) => (
                  <li key={t} className="flex items-center gap-3"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/30 text-emerald-200"><Icon d={I.check} size={11} /></span>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Link href={ZALO_HREF} target="_blank" aria-label="Chat Zalo" className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#2563eb] text-xl font-extrabold text-white shadow-xl shadow-blue-600/40">Z</Link>

      {/* Footer */}
      <footer className="bg-[#0b1220] pb-8 pt-16 text-white">
        <div className="mx-auto grid max-w-300 gap-10 px-4 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">Phần mềm quản lý & tự động hóa Zalo toàn diện cho cá nhân và doanh nghiệp. Tăng hiệu quả bán hàng, tối ưu chi phí, bứt phá tăng trưởng.</p>
            <div className="mt-6 space-y-3 text-sm">
              {[[CONTACT.website, "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.500-3.5 9c-2.500-2.500-3.500-5.500-3.500-9s1-6.500 3.500-9", ""], [CONTACT.hotline, I.phone, "Hotline: "], [CONTACT.email, "M3 6h18v12H3zM3 7l9 6 9-6", ""]].map(([v, ic, pre]) =>
                v ? (
                  <div key={v} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5"><Icon d={ic} size={15} /></span>{pre}{v}</div>
                ) : null
              )}
            </div>
          </div>
          {[
            ["Sản phẩm", [["Tính năng", "#features"], ["Bảng giá", "#pricing"], ["FAQ", "#faq"]]],
            ["Công ty", [["Về Metus Zalo", "#top"], ["Tin tức", "#top"], ["Tài liệu", "#top"], ["Liên hệ", "#faq"]]],
            ["Pháp lý", [["Chính sách bảo mật", "#top"], ["Điều khoản dịch vụ", "#top"]]],
          ].map(([h, links]) => (
            <div key={h as string}>
              <div className="text-xs font-bold uppercase tracking-wider text-white/60">{h as string}</div>
              <ul className="mt-5 space-y-3.5 text-sm">
                {(links as string[][]).map(([l, href]) => <li key={l}><a href={href} className="hover:text-sky-300">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-14 flex max-w-300 items-center justify-between border-t border-white/10 px-4 pt-6 text-xs text-white/50">
          <span>© {new Date().getFullYear()} Metus Zalo. All rights reserved. Made with care in Vietnam.</span>
          <a href="#top" className="rounded-full border border-white/15 px-4 py-2 text-white/80">Lên đầu trang ↑</a>
        </div>
      </footer>
    </div>
  );
}
