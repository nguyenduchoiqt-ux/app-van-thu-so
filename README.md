# 🏛️ APP VĂN THƯ SỐ 4.0 (Phiên bản v4.9)

**Trợ lý soạn thảo, rà soát thể thức văn bản hành chính – Đảng (chuẩn Nghị định 30/2020/NĐ-CP & Hướng dẫn 05-HD/VPTW), xử lý văn bản đến bằng AI và thiết kế Infographic truyền thông 4 tầng.**

🌐 **Trải nghiệm trực tuyến ngay:** [https://appvanthusoqt.netlify.app](https://appvanthusoqt.netlify.app)

---

## 🚀 Tự tạo bản Web App riêng cho cơ quan, đơn vị của bạn (1 chạm)

Bấm vào nút bên dưới để nhân bản toàn bộ mã nguồn và tự động triển khai một trang Web App **Văn Thư Số 4.0** độc lập cho cơ quan, đơn vị hoặc cá nhân bạn (miễn phí 100%, không cần biết lập trình):

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/nguyenduchoiqt-ux/app-van-thu-so)

---

## 📋 Hướng dẫn 3 bước tự sở hữu bản Web App & dữ liệu độc lập

1. **Bước 1 — Nhân bản Web App (1 chạm):**
   - Bấm nút **Deploy to Netlify** ở trên → Đăng nhập tài khoản **GitHub** và **Netlify** (miễn phí).
   - Hệ thống sẽ tự động sao chép mã nguồn sang tài khoản của bạn, biên dịch và cấp riêng cho đơn vị một đường link web độc lập (`https://ten-don-vi-cua-ban.netlify.app`).
2. **Bước 2 — Thiết lập thông tin cơ quan, đơn vị:**
   - Mở đường link web riêng vừa tạo → Chuyển sang **Tab 6 (Cấu hình đơn vị)**.
   - Nhập tên cơ quan chủ quản, cơ quan ban hành, ký hiệu viết tắt, địa danh hành chính, danh sách lãnh đạo ký và nơi nhận thường dùng (áp dụng riêng cho cả **Khối Nhà nước** và **Khối Đảng**).
   - Toàn bộ cấu hình được lưu an toàn trong bộ nhớ trình duyệt (`localStorage`) trên máy của bạn.
3. **Bước 3 — Kết nối Trợ lý AI Gemini miễn phí (BYOK):**
   - Truy cập Google AI Studio tại [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Đăng nhập bằng Gmail và bấm **Create API key** để lấy mã Gemini API Key miễn phí.
   - Dán mã API Key vào **Tab 6 (Cấu hình đơn vị)** → Chọn model khuyên dùng **`gemini-3.5-flash-lite`** (hạn mức miễn phí lên tới **500 lượt/ngày**, chống lỗi quá tải 429) hoặc `gemini-3.8-flash` → Bấm **Lưu Key** và sử dụng độc lập hoàn toàn.

---

## ✨ Danh sách 6 tính năng chính (6 Tab chức năng)

### 1. 📝 Soạn thảo & Xem trước A4 (`Tab 1`)
- Hỗ trợ song song 2 hệ thống thể thức chuẩn:
  - **Khối Nhà nước:** Tuân thủ **Nghị định số 30/2020/NĐ-CP** của Chính phủ.
  - **Khối Đảng:** Tuân thủ **Hướng dẫn số 05-HD/VPTW** và **Quy định số 66-QĐ/TW** của Trung ương Đảng.
- Hỗ trợ đầy đủ 14 loại văn bản thông dụng: *Nghị quyết, Quyết định, Kế hoạch, Báo cáo, Tờ trình, Công văn, Thông báo, Biên bản, Hợp đồng, Quy chế, Hướng dẫn, Chỉ thị, Kết luận, Chương trình*.
- **Trợ lý AI soạn thảo thông minh:** Nhập yêu cầu ngắn gọn hoặc tải lên văn bản mẫu, AI tự động khởi tạo đầy đủ căn cứ pháp lý, bố cục điều khoản/mục lục, nơi nhận chuẩn xác.
- **Xem trước trang giấy A4 thời gian thực** (font *Times New Roman*, căn lề Trái 30mm – Phải 15mm – Trên/Dưới 20mm) và xuất file **Word (`.DOCX`)** hoặc **In / Lưu PDF** chuẩn 100% thể thức.

### 2. 📥 Xử lý văn bản đến & Thiết kế Infographic 4 tầng (`Tab 2`)
- Đọc trực tiếp file văn bản cấp trên gửi đến (`.docx`, `.pdf`, ảnh chụp trang văn bản `.jpg/.png` qua OCR Gemini Vision) hoặc dán nội dung văn bản.
- **AI phân tích & tham mưu 4 chiều:** Tóm tắt cốt lõi, bóc tách hạn xử lý (deadline), đề xuất phân công bộ phận chủ trì/phối hợp và dự thảo **Kế hoạch triển khai**, **Công văn chỉ đạo** hoặc **Báo cáo kết quả thực hiện** để đẩy thẳng sang Tab 1 chỉ với 1 cú nhấp chuột.
- **Tạo Infographic Truyền thông – Tuyên truyền 4 tầng:** Tự động chắt lọc nội dung văn bản thành Infographic tuyên truyền trực quan với 4 phong cách (*Hiện đại, Hành chính – Chính luận, Tối giản, Đồ họa quy trình*) và xuất ảnh **PNG chất lượng cao** phục vụ đăng cổng thông tin điện tử, Zalo OA, bảng tin cơ sở.

### 3. 🛡️ Rà soát thể thức tự động (`Tab 3`)
- Chấm điểm thể thức trên thang 100 điểm và kiểm tra tự động các lỗi thường gặp:
  - Quốc hiệu, Tiêu ngữ / Tiêu đề Đảng, dấu gạch ngang phân cách.
  - Cách ghi Số và Ký hiệu văn bản (tự động phân biệt số `< 10` giữa Khối Nhà nước `1` và Khối Đảng `01`).
  - Địa danh, ngày tháng năm ban hành, trích yếu, căn cứ ban hành, thể thức đề mục, thẩm quyền ký (`TM.`, `KT.`, `TL.` / `T/M`, `K/T`) và dấu chấm câu ở phần Nơi nhận (`Lưu: VT, ...`).
- Hỗ trợ **Tự động sửa nhanh 1 chạm** cho từng lỗi phát hiện được.

### 4. 📖 Tra cứu quy chuẩn (`Tab 4`)
- Cẩm nang tra cứu nhanh, trực quan bảng đối chiếu quy định thể thức, cỡ chữ, kiểu chữ, cách trình bày Quốc hiệu – Tiêu ngữ, Số/Ký hiệu, bảng viết tắt chuẩn giữa **Nghị định 30/2020/NĐ-CP** và **Hướng dẫn 05-HD/VPTW**.

### 5. 🗂️ Lịch sử & Cấp số tự động (`Tab 5`)
- Lưu trữ lịch sử văn bản đã soạn thảo ngay trên trình duyệt của người dùng.
- Tự động gợi ý số văn bản tiếp theo theo từng loại văn bản và từng khối cơ quan; tìm kiếm, mở lại để chỉnh sửa hoặc xuất bản bất cứ lúc nào.

### 6. ⚙️ Cấu hình đơn vị & Trợ lý AI (`Tab 6`)
- Quản lý thông tin cơ quan chủ quản, cơ quan ban hành, địa danh, danh sách lãnh đạo ký và danh sách nơi nhận mặc định cho cả 2 khối Nhà nước & Đảng.
- Quản lý khóa cá nhân **Gemini API Key (BYOK)**, kiểm tra kết nối trực tiếp và tùy chọn model Gemini ưu tiên.

---

## 💻 Hướng dẫn chạy và tùy biến mã nguồn trên máy cá nhân (Dành cho cán bộ CNTT / Lập trình viên)

Yêu cầu máy tính đã cài đặt **Node.js** (phiên bản 18+ trở lên) và **Git**.

```bash
git clone https://github.com/nguyenduchoiqt-ux/app-van-thu-so.git
cd app-van-thu-so
npm install
npm run dev
```

- Sau khi chạy `npm run dev`, mở trình duyệt tại địa chỉ `http://localhost:5173`.
- Để biên dịch bản Production đóng gói tĩnh vào thư mục `dist/`:

```bash
npm run build
```

---

## 🔒 Cam kết Bảo mật & Quyền riêng tư (BYOK - Bring Your Own Key)

- Mã nguồn công khai **100% không chứa bất kỳ khóa bí mật hay dữ liệu nội bộ nào**.
- Mọi dữ liệu văn bản, cấu hình đơn vị và Gemini API Key đều chỉ lưu trữ cục bộ (`localStorage`) trên trình duyệt máy tính của chính người dùng và kết nối trực tiếp tới máy chủ Google Gemini (`generativelanguage.googleapis.com`).
