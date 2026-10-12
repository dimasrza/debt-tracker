# Panduan Pemasangan Debt Tracker (dari nol, untuk pemula)

Total waktu sekitar 45 menit. Semua langkah gratis dan tidak perlu kartu kredit. Nama menu Google atau Firebase kadang sedikit berbeda dari tulisan di sini; cari menu yang paling mirip.

Gambaran besarnya:
- **Google Sheet** = tempat data utang Anda disimpan.
- **Apps Script** = "pintu" kecil yang membuat aplikasi bisa membaca dan menulis ke Sheet itu.
- **Aplikasi (website)** = tampilan yang Anda buka di iPhone dan komputer.
- **Firebase Hosting** = tempat website ditaruh supaya bisa dibuka dari mana saja.
- **GitHub** = tempat menyimpan kode (opsional tetapi disarankan).

---

# Jalur tanpa instal apa pun (disarankan jika tidak mau pasang Node.js)

Semua dikerjakan di browser. Website dibangun otomatis di server Netlify (gratis), bukan di komputer Anda. Lewati Bagian 1, 3, dan 4 di bawah; kerjakan **Bagian 2 (Google Sheet dan Apps Script)** lebih dulu, lalu langkah ini:

1. Ekstrak `debt-tracker.zip` di komputer (klik kanan, Extract/Ekstrak). Tidak perlu program tambahan.
2. Buat akun di https://github.com. Klik **New repository**, nama `debt-tracker`, pilih Public atau Private, klik **Create repository**.
3. Di halaman repo baru, klik tautan **uploading an existing file**. Buka folder hasil ekstrak, pilih **semua isi di dalamnya** (bukan folder luarnya), seret ke halaman GitHub. Tunggu semua file naik, lalu klik **Commit changes**.
4. Buat akun di https://app.netlify.com (pilih "Sign up with GitHub"). Klik **Add new site → Import an existing project → GitHub**, izinkan akses, pilih repo `debt-tracker`.
5. Biarkan pengaturan bawaan (sudah dibaca dari file `netlify.toml`), klik **Deploy**. Tunggu 2 sampai 5 menit.
6. Setelah selesai, Netlify memberi alamat seperti `https://nama-acak.netlify.app`. Buka di browser, lalu lanjut ke **Bagian 5 (Pakai di iPhone)**: isi URL Apps Script dan kunci API di halaman Pengaturan.

Jika status deploy merah (Failed), buka log deploy-nya, salin pesan error, dan kirim ke saya.

---

## Bagian 1. Siapkan komputer (sekali saja)

1. Pasang **Node.js versi 22 LTS** dari https://nodejs.org (pilih tombol "LTS", lalu Next terus). Versi lama membuat `npm test` gagal.
2. Pasang **Visual Studio Code** dari https://code.visualstudio.com (opsional, tetapi memudahkan melihat file).
3. Ekstrak file `debt-tracker.zip`. Anda akan mendapat folder `debt-tracker`. Taruh di tempat mudah, misalnya `Documents`.
4. Buka **terminal di folder itu**:
   - Windows: buka folder `debt-tracker` di File Explorer, klik kotak alamat di atas, ketik `cmd`, tekan Enter.
   - Mac: klik kanan folder, pilih "New Terminal at Folder".
5. Cek Node: ketik `node --version` lalu Enter. Harus muncul `v22...` atau lebih tinggi.
6. Ketik `npm install` lalu Enter. Tunggu beberapa menit sampai selesai (peringatan kuning biasanya aman, tulisan merah "ERROR" tidak).
7. Ketik `npm test` lalu Enter. Jika semua tes lulus (`fail 0`), lanjut.

## Bagian 2. Buat Google Sheet dan "pintu" Apps Script

1. Buka https://sheets.google.com, login dengan akun Google Anda, klik **Kosong / Blank**. Beri nama file, misalnya `Debt Tracker Data`. Biarkan kosong; tab dibuat otomatis oleh aplikasi.
2. Di menu atas Sheet, klik **Ekstensi → Apps Script** (Extensions → Apps Script). Tab baru terbuka.
3. Di editor, hapus semua kode bawaan (biasanya `function myFunction() {}`).
4. Di komputer, buka file `apps-script/Code.gs` di folder proyek (pakai VS Code atau Notepad), **salin semua isinya**, lalu tempel ke editor Apps Script.
5. Klik ikon disket (Simpan) atau tekan Ctrl+S.
6. **Buat kunci rahasia.** Kunci ini seperti kata sandi untuk aplikasi Anda. Buat teks acak 32 karakter atau lebih dari huruf dan angka saja, misalnya dari pengelola kata sandi di HP Anda. Contoh bentuknya: `k8Zp2mQx7vR4tLw9Bn3Yc6HdJf5Sa1Uf`. Jangan pakai contoh ini; buat sendiri. **Catat di tempat aman.**
7. Di Apps Script, klik ikon roda gigi **Project Settings** di kiri. Gulir ke **Script Properties**, klik **Add script property**:
   - Property: `API_KEY` (huruf besar semua)
   - Value: kunci rahasia dari langkah 6
   - Klik **Save script properties**.
8. Klik **Deploy** (kanan atas) → **New deployment**. Klik ikon roda gigi di samping "Select type" → pilih **Web app**. Isi:
   - Description: `v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy**.
9. Google meminta izin: klik **Authorize access**, pilih akun Anda. Jika muncul "Google hasn't verified this app", klik **Advanced** lalu **Go to ... (unsafe)** lalu **Allow**. Ini aman karena skrip itu milik Anda sendiri.
10. Salin **Web app URL** (berakhir dengan `/exec`). **Catat juga.**
11. Tes: tempel URL itu di tab browser baru. Jika muncul tulisan `{"ok":true,"name":"debt-tracker-api"}`, berhasil.

Jika nanti Anda mengubah isi Code.gs, ulangi **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy**. URL tetap sama.

## Bagian 3. Jalankan aplikasi di komputer dulu

1. Di terminal folder `debt-tracker`, ketik `npm run dev` lalu Enter.
2. Buka http://localhost:3000 di browser.
3. Pertama kali, aplikasi minta menyambungkan Sheet. Klik **Buka Pengaturan**.
4. Isi **URL Web app** (dari Bagian 2 langkah 10) dan **Kunci API** (langkah 6), klik **Tes dan simpan sambungan**. Jika sukses akan tertulis "Terhubung".
5. Coba dulu dengan **Mulai mode demo** untuk melihat contoh tampilan. Data demo tidak masuk ke Sheet.
6. Keluar dari demo, lalu klik **Daftar Utang → Tambah utang** untuk mencatat utang asli. Cek Google Sheet Anda: tab `debts` dan `installments` akan muncul otomatis.
7. Berhenti dengan Ctrl+C di terminal.

## Bagian 4. Taruh di internet agar bisa dibuka dari iPhone

1. Buka https://console.firebase.google.com, login dengan akun Google, klik **Create a project** (atau Add project). Beri nama, misalnya `debt-tracker-saya`. Matikan Google Analytics (tidak perlu). Klik Create. Jangan upgrade ke paket berbayar (Blaze); tetap paket **Spark** (gratis).
2. Di terminal folder proyek, ketik berurutan (Enter setiap baris):
   - `npm install -g firebase-tools`
   - `firebase login` (browser terbuka, login dan izinkan)
   - `firebase use --add` (pilih project yang tadi dibuat, beri alias `default`)
3. Bangun dan unggah: `npm run deploy`. Tunggu sampai muncul **Hosting URL** seperti `https://debt-tracker-saya.web.app`.
4. Buka alamat itu di browser.

## Bagian 5. Pakai di iPhone

1. Buka alamat `.web.app` di **Safari**.
2. Buka **Pengaturan** di aplikasi, isi URL Apps Script dan kunci API **sekali** (agar tidak mengetik ulang, simpan di pengelola kata sandi).
3. Agar mirip aplikasi: ketuk ikon **Bagikan** → **Tambah ke Layar Utama**.
4. Ulangi pengisian di komputer atau perangkat lain jika mau. Data tetap sama karena semuanya ada di Google Sheet.

## Bagian 6. Simpan kode di GitHub (opsional)

1. Buat akun di https://github.com, klik **New repository**, beri nama `debt-tracker`, pilih **Private**, jangan centang opsi README. Klik Create.
2. Pasang Git dari https://git-scm.com bila belum ada.
3. Di terminal folder proyek, ketik:
   - `git init`
   - `git add .`
   - `git commit -m "versi pertama"`
   - `git branch -M main`
   - `git remote add origin https://github.com/NAMA-ANDA/debt-tracker.git` (salin dari halaman repo)
   - `git push -u origin main`
4. **Jangan pernah** mengetik URL Apps Script atau kunci API ke file di folder proyek. Kunci hanya diisi lewat halaman Pengaturan aplikasi. File `.gitignore` sudah menjaga file rahasia seperti `.env` agar tidak terunggah.

## Rutinitas yang disarankan

- Sebulan sekali: **Pengaturan → Unduh backup JSON**, simpan di Google Drive atau email ke diri sendiri.
- Jika kunci API bocor: ubah nilai `API_KEY` di Script Properties, lalu isi kunci baru di Pengaturan tiap perangkat.

## Jika ada masalah

| Gejala | Penyebab dan solusi |
|---|---|
| `npm test` gagal dengan pesan soal "--experimental-strip-types" | Versi Node terlalu lama. Pasang Node 22 LTS. |
| "Kunci API salah" | Isi kunci di aplikasi harus sama persis dengan `API_KEY` di Script Properties (tanpa spasi). |
| "API_KEY belum diatur" | Langkah 7 Bagian 2 belum dilakukan atau kuncinya kurang dari 16 karakter. |
| "Tidak bisa menghubungi Google Sheet" | Periksa internet. Pastikan akses deployment **Anyone** dan URL berakhir `/exec`. Tes URL di tab browser. |
| "Respons server tidak valid" | Biasanya deployment belum diperbarui setelah Code.gs diubah. Buat New version. |
| Data tidak muncul di perangkat lain | Pastikan URL dan kunci di perangkat itu sama persis. |
| `npm run build` error | Salin seluruh pesan error dan kirim ke saya. |
| Tulisan "Kuota" atau "limit" dari Google | Kuota harian Apps Script habis (jarang). Coba lagi besok. |
