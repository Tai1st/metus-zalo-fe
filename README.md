# Metus Zalo

Công cụ web quản lý **đa tài khoản Zalo** và **nhắn tin hàng loạt** theo phong cách
"Auto Zalo", xây trên **Next.js 16 (App Router, TS, Tailwind v4)** + **[zca-js](https://github.com/RFS-ADRENO/zca-js)**.
Tham khảo kiến trúc từ dự án `deplao-builder` (ConnectionManager, lưu tài khoản có
mã hoá cookie, login QR theo `tempId`).

> ⚠️ `zca-js` là thư viện không chính thức — đăng nhập tài khoản Zalo cá nhân qua
> mã QR (như Zalo Web). Dùng nội bộ, tự chịu rủi ro chính sách Zalo.

## Tính năng

| Trang | Mô tả |
| --- | --- |
| Tổng quan | Thống kê tài khoản, yêu cầu đang chạy, số tin đã gửi |
| Quản lý proxy | CRUD proxy (HTTP/SOCKS5) — *gắn vào tài khoản: bổ sung sau* |
| Tài khoản Zalo | Bảng đa tài khoản, thêm bằng mã QR, xoá; hiện trạng thái kết nối |
| Chat | Gửi tin thủ công + xem tin đến real-time (chọn tài khoản) |
| Nhắn tin → Theo số điện thoại / bạn bè / thành viên nhóm khác | Trình tạo **yêu cầu** gửi hàng loạt |
| Danh sách yêu cầu | Chạy / dừng / xoá chiến dịch, xem tiến độ |
| Chi tiết yêu cầu | Cấu hình + nhật ký gửi từng mục tiêu |
| Nhóm | Danh sách nhóm của tài khoản |

### Cấu hình một "yêu cầu" nhắn tin

- Đổi tài khoản sau N lần lỗi liên tiếp
- Tạm dừng ngẫu nhiên `từ … đến …` giây giữa các lần gửi
- Nghỉ sau mỗi N lần gửi thành công
- Giới hạn số lượng / giờ hoặc / ngày
- Tự động kết bạn nếu chưa là bạn (phone / group_member)
- Tự chèn emoji ngẫu nhiên
- Nội dung tin nhắn
- Chọn nhiều tài khoản gửi (xoay vòng) + danh sách mục tiêu (số ĐT / ID / link nhóm)

## Chạy dev

```bash
npm install
npm run dev            # http://localhost:3000
```

Mở **Tài khoản Zalo → + Thêm tài khoản → quét QR bằng app Zalo**.

## Kiến trúc

```
src/server/
  db/index.ts               SQLite (better-sqlite3): accounts, proxies, campaigns, campaign_logs
  security/crypto.ts         AES-256-GCM cho cookie (khoá: env METUS_ZALO_SECRET hoặc data/.secret-key)
  zalo/
    connection-manager.ts    Map<zaloId, API> + dedup pending + ring buffer tin đến, mỗi account 1 listener
    accounts.ts              CRUD tài khoản + getApiFor(zaloId) + restoreAll()
    login-controller.ts      Phiên QR theo tempId (starting → qr_ready → scanned → connected)
    campaigns.ts             CRUD chiến dịch + log
    campaign-runner.ts       Vòng lặp gửi in-process: resolve mục tiêu, xoay tài khoản, nghỉ, giới hạn
    http.ts                  helper ok/fail + withAccount(req, handler) đọc ?account=<zaloId>
src/app/api/zalo/*           Route handlers (Node runtime)
src/app/*                    Dashboard (client components)
```

Dữ liệu nằm trong `data/` (đã gitignore): `metus-zalo.db`, `.secret-key`.

## Bảo mật

`data/` chứa cookie đăng nhập (đã mã hoá) và khoá — **không commit, không chia sẻ**.
Đặt `METUS_ZALO_SECRET` trong môi trường production để khoá không nằm cạnh DB.
