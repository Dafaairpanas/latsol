# Laporan Audit Akurasi Bank Soal Latihan SSW Pengolahan Makanan (`bombsoal3` – `bombsoal11`) Terhadap Modul Resmi OTAFF Edisi 5.1

> **Acuan Resmi**: [rekapmodulpm.txt](file:///e:/CODING/mengeloladata/rekapmodulpm.txt) & [rekapmodulpm_indo.md](file:///e:/CODING/mengeloladata/rekapmodulpm_indo.md) (OTAFF Edisi 5.1, revisi alergen 1 April 2026)  
> **Objek Audit**: **9 file paket (200 soal)** — `packs/bombsoal3.txt` s.d. `packs/bombsoal11.txt` *(tidak mencakup `bombsoal1.txt` & `packs/bombsoal2.txt` sesuai permintaan)*.

---

## Ringkasan Eksekutif

Seluruh paket `bombsoal3.txt` – `bombsoal11.txt` berasal dari **bank soal recall LPK edisi lama (sekitar OTAFF v3/v4 era 2020–2023 + masa COVID-19)**, bukan dari modul terbaru **OTAFF Edisi 5.1 (2026)**.

Akibatnya:
- Sebagian besar dasar materi (bakteri umum, 75℃ 1 menit, Norovirus 85–90℃ 90 detik, Botulinum 120℃ 4 menit, suhu kulkas ≤10℃ / freezer ≤-15℃, 5S dasar, 7 prinsip HACCP) **masih akurat**.
- Namun ditemukan **34 kemunculan masalah akurasi / inkonsistensi kunci** (kunci salah, fakta keliru terhadap OTAFF v5.1, saling bentrok antar-paket), **6 soal bergambar tanpa gambar**, serta beberapa soal berbahasa cacat/ambigu, duplikat internal, dan **20+ kemunculan materi usang / di luar silabus OTAFF v5.1** (seperti COVID-19 `3密`, kimia deterjen alkali/asam, dll.).

---

## Tabel Rekap Per File Paket

| File | Judul Paket | Jml Soal | Kunci Salah / Bentrok v5.1 / Rancu | Soal Tanpa Gambar | Materi Usang / Non-v5.1 Utama | Status Umum |
|---|---|---:|---|---|---|---|
| [bombsoal3.txt](file:///e:/CODING/mengeloladata/packs/bombsoal3.txt) | Latihan Recall CBT (Set 1) | 20 | **No. 17** (`4°C以下`), **No. 18** (hanya 7 alergen) | – | No. 14 (COVID `密閉`), No. 19 (frasa edisi lama) | **Perlu revisi ringan–sedang** (2 wajib + 1 usang) |
| [bombsoal4.txt](file:///e:/CODING/mengeloladata/packs/bombsoal4.txt) | Latihan Recall CBT Set 2 | 20 | **No. 3** (`服装` disalahkan), **No. 6** (`野菜` ikut di Salmonella), **No. 8** (kunci **D** salah -> harus **A**), **No. 14** (`加熱` bunuh jamur), **No. 15** (`10–60℃`), **No. 17** (`加熱魚介` disalahkan) | – | No. 2 & 4 (`感染型`), **No. 13** (`魚` ambigu & non-v5.1), No. 20 (COVID `3密`) | **Banyak kesalahan kritis** (6 akurasi + 1 ambigu non-v5.1) |
| [bombsoal5.txt](file:///e:/CODING/mengeloladata/packs/bombsoal5.txt) | Latihan Recall CBT Set 3 | 20 | **No. 3** (`正しいものはない`), **No. 5** (bentrok dgn Lat.4 No.11), **No. 7** (X-ray non-metal), **No. 11** (`帽子` vs `耳栓` kurang konteks), **No. 12** (X-ray deteksi logam disalahkan) | – | No. 13 (statistik `虫・髪の毛` tak ada di v5.1) | **Perlu revisi sedang–berat** (5 bermasalah) |
| [bombsoal6.txt](file:///e:/CODING/mengeloladata/packs/bombsoal6.txt) | Latihan Recall CBT Set 4 / Latihan 3 | 20 | **No. 5** (kunci **B** `21種類` -> harus **A** `20種類`!), **No. 8** (soal & opsi bahasa rusak) | **No. 10** (ilustrasi hilang) | No. 12 (typo 5S kurang `清掃`), No. 13–14 (frasa lama gejala heatstroke) | **Perlu revisi** (kunci alergen salah + gambar hilang + soal rusak) |
| [bombsoal7.txt](file:///e:/CODING/mengeloladata/packs/bombsoal7.txt) | Latihan 4 | 20 | **No. 11** (bentrok dgn Set 3 No.5), **No. 12** (`10–60℃`), **No. 13** (`冷凍庫` bentrok 3 arah), **No. 14** (X-ray deteksi logam disalahkan), **No. 16** (X-ray non-metal), **No. 17** (hanya `7種類`, opsi `9種類` belum ada) | **No. 10** (wajib lihat gambar, semua opsi tampak benar!) | No. 3 (`虫・髪の毛`), No. 4 (`感染型`), No. 8 (frasa lama) | **Banyak masalah kritis + 1 soal mustahil tanpa gambar** |
| [bombsoal8.txt](file:///e:/CODING/mengeloladata/packs/bombsoal8.txt) | Latihan 5 | 20 | **No. 3** (`ウェルシュ菌` vs `セレウス菌` ambigu di v5.1 P.13) | **No. 8** (`[Ilustrasi A/B/C]`), **No. 9** (angka `3, 1, 2`) | No. 6 (arsip HACCP), No. 7 (`農薬/抗生物質`), No. 16–17 (deterjen alkali/asam), No. 19–20 (sampah & *shadow board*) | **2 soal cacat tanpa gambar + banyak materi non-v5.1** |
| [bombsoal9.txt](file:///e:/CODING/mengeloladata/packs/bombsoal9.txt) | Latihan 6 | 20 | **No. 13** (kunci `金属` salah -> harus `プラスチック`!), **No. 15** (`サルモネラ` disalahkan meski ada di P.36), **No. 18** (7 alergen + opsi C ada `まつたけ`) | – | No. 8 (`毛髪と虫`), No. 9 (COVID-19), No. 19–20 (daftar 3 poin `薬剤・交差汚染` lama) | **Perlu revisi** (kunci X-ray salah + alergen usang + COVID) |
| [bombsoal10.txt](file:///e:/CODING/mengeloladata/packs/bombsoal10.txt) | Latihan 7 | 20 | **No. 1** (`服装` disalahkan), **No. 12** (bentrok dgn Set 3 No.5 & kurang `責任者`), **No. 16** (X-ray non-metal) | – | No. 2 (`感染型`), No. 7 (`農薬/抗生物質`), No. 8 (`毛髪と虫`), No. 15 (`アルカリ性洗剤`) | **Perlu revisi sedang** (3 bermasalah) |
| [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt) | Latihan 8 | 40 | **No. 3 & 14** (duplikat + Cereus/Welch), **No. 5** (`服装` disalahkan), **No. 8** (`10–60℃`), **No. 10** (`加熱魚介` disalahkan), **No. 17** (`4℃以下`), **No. 18 & 24** (duplikat 7 alergen + `まつたけ`), **No. 29** (kunci `7種類` tanpa opsi `9種類`), **No. 30** (X-ray deteksi logam disalahkan), **No. 31** (X-ray `金属` salah -> harus `プラスチック`) | **No. 34** (angka `3, 2, 1`), **No. 36** (kecelakaan tanpa gambar) | No. 15 & 22 (COVID-19), No. 19, 21, 28, 38–40 (materi edisi lama) | **Paling banyak item bermasalah + banyak duplikasi internal** |

---

## Daftar Rinci Hal yang Harus Diganti

### 1. Kesalahan Kunci Jawaban & Fakta Bertentangan dengan OTAFF v5.1 (Wajib Ganti)

#### A. Klaim Keliru Bahwa Detektor Sinar-X (`X線異物検出機`) Tidak Bisa Mendeteksi Logam (8 soal)
- **Fakta Modul OTAFF v5.1 P.36 ([rekapmodulpm.txt](file:///e:/CODING/mengeloladata/rekapmodulpm.txt#L449-L452))**: Detektor sinar-X mendeteksi benda asing keras seperti batu dan kaca yang tidak tertangkap detektor logam, **tetapi BUKAN berarti X-ray tidak dapat mendeteksi logam** (X-ray tetap bisa mendeteksi logam padat, batu, kaca, dan tulang). Justru benda yang **sulit dideteksi oleh sinar-X adalah plastik (`プラスチック`)**!
- **Yang Harus Diganti**:
  1. [bombsoal5.txt](file:///e:/CODING/mengeloladata/packs/bombsoal5.txt#L94-L100) (Set 3 No. 12): Opsi `A (X線異物検出器は金属の危険異物を検出することができる)` sebenarnya **BENAR**, tidak boleh disalahkan! → **Ganti** pernyataan salah menjadi: `X線異物検出機はプラスチックを簡単に見つけることができる`.
  2. [bombsoal7.txt](file:///e:/CODING/mengeloladata/packs/bombsoal7.txt#L110-L116) (Latihan 4 No. 14): Sama seperti di atas, opsi `C` sebenarnya benar → **Ganti** ke klaim salah tentang `プラスチック`.
  3. [bombsoal9.txt](file:///e:/CODING/mengeloladata/packs/bombsoal9.txt#L91-L96) (Latihan 6 No. 13): Menanyakan apa yang TIDAK bisa dideteksi X-ray dengan kunci `C. 金属`. → **Ganti** opsi `C` dari `金属` menjadi **`プラスチック`**.
  4. [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L218-L223) (Latihan 8 No. 30): Opsi `B` sebenarnya benar → **Ganti** ke klaim salah tentang `プラスチック`.
  5. [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L225-L230) (Latihan 8 No. 31): Kunci `B. 金属` salah → **Ganti** opsi `B` menjadi **`プラスチック`**.
  6. [bombsoal5.txt](file:///e:/CODING/mengeloladata/packs/bombsoal5.txt#L54-L60) (Set 3 No. 7), [bombsoal7.txt](file:///e:/CODING/mengeloladata/packs/bombsoal7.txt#L126-L132) (Latihan 4 No. 16), & [bombsoal10.txt](file:///e:/CODING/mengeloladata/packs/bombsoal10.txt#L111-L116) (Latihan 7 No. 16): Memosisikan definisi X-ray seolah *"mendeteksi benda asing selain logam (`金属以外の危険異物`)"* sambil menolak opsi logam. → **Ubah** opsi benar menjadi `石やガラスなどの硬質異物（金属探知機では見つけられないもの）を検出し、数量や形状も確認できるもの`, serta jadikan opsi salahnya `プラスチックなど柔らかい異物を必ず検出するもの`.

#### B. Jumlah & Daftar Alergen Usang vs Revisi 1 April 2026 (7 soal wajib update)
- **Fakta Modul OTAFF v5.1 P.8–P.9 ([rekapmodulpm.txt](file:///e:/CODING/mengeloladata/rekapmodulpm.txt#L112-L118))**:
  - **Alergen Wajib (`特定原材料`)** = **9 jenis** *(ditambah `くるみ` dan `カシューナッツ`)*: `えび、かに、くるみ、小麦、そば、卵、乳、落花生、カシューナッツ`.
  - **Alergen Rekomendasi (`特定原材料に準ずるもの`)** = **20 jenis** *(ditambah `ピスタチオ`; `まつたけ` sudah dihapus tahun 2024)*.
- **Yang Harus Diganti**:
  1. [bombsoal6.txt](file:///e:/CODING/mengeloladata/packs/bombsoal6.txt#L34-L39) (Latihan 3 No. 5): Menanyakan jumlah makanan *anjuran/望ましい*, kunci masih **`B. 21種類`**, padahal **`A. 20種類`** sudah tersedia di pilihan! → **Segera ganti kunci jawaban ke A (`20種類`)!**
  2. [bombsoal7.txt](file:///e:/CODING/mengeloladata/packs/bombsoal7.txt#L134-L140) (Latihan 4 No. 17) & [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L211-L216) (Latihan 8 No. 29): Kunci **`B. 7種類`** dan bahkan **tidak memiliki opsi `9種類`**. → **Ubah** opsi salah satu (misal `5種類`/`14種類`) menjadi **`9種類`** dan set sebagai kunci benar!
  3. [bombsoal3.txt](file:///e:/CODING/mengeloladata/packs/bombsoal3.txt#L125-L130) (Set 1 No. 18), [bombsoal9.txt](file:///e:/CODING/mengeloladata/packs/bombsoal9.txt#L126-L131) (Latihan 6 No. 18), dan [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L125-L130) & [No. 24](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L171-L176) (Latihan 8 No. 18 & 24):
     - Pilihan kunci hanya berisi 7 item (kurang **`くるみ`** dan **`カシューナッツ`**).
     - Pada Latihan 6 No. 18 dan Latihan 8 No. 24, opsi pengecoh masih mencantumkan **`まつたけ`** (sudah dihapus) dan menaruh `くるみ` di opsi salah! → **Perbarui** daftar kunci menjadi 9 item wajib (atau sebagian dari 9 item tanpa mencampur kelompok rekomendasi) dan hapus `まつたけ`.

#### C. Kunci Jawaban `カンピロバクター属菌` Salah Total (1 soal + 1 perbaikan minor)
- **Fakta Modul OTAFF v5.1 P.11 ([rekapmodulpm.txt](file:///e:/CODING/mengeloladata/rekapmodulpm.txt#L147-L150))**:
  - `カンピロバクター属菌` → **`食肉（特に鶏肉）`** saja.
  - `サルモネラ属菌` → **`鶏卵、食肉（特に鶏肉）`**.
  - `腸管出血性大腸菌 (O157)` → **`食肉（特に牛肉）、野菜、井戸水`**.
- **Yang Harus Diganti**:
  1. [bombsoal4.txt](file:///e:/CODING/mengeloladata/packs/bombsoal4.txt#L58-L64) (Set 2 No. 8): Kunci saat ini **`D (野菜、食肉、鶏肉、井戸水)`** keliru mencampur bahan O157 ke Campylobacter. → **Ganti kunci menjadi `A (食肉、鶏肉)`**!
  2. [bombsoal4.txt](file:///e:/CODING/mengeloladata/packs/bombsoal4.txt#L43-L48) (Set 2 No. 6 — minor): Opsi C `サルモネラ属菌` mencantumkan `野菜` di `野菜、食肉、鶏肉、鶏卵など`. → **Hapus `野菜`** agar persis P.11 (`鶏卵、食肉（特に鶏肉）`).

#### D. Memanaskan Hasil Laut (`海水の魚介類を加熱します`) Dianggap SALAH (2 soal)
- **Fakta Modul OTAFF v5.1 P.12, P.14, P.32, P.33**: Memanaskan hasil laut (75℃ 1 menit untuk *Vibrio*, ≥70℃ untuk Anisakis) adalah langkah pencegahan **BENAR**. Aturan lama `"真水で洗う"` bahkan **tidak ada** di modul v5.1 (justru P.32 menyebut pencucian dengan `食塩水`).
- **Yang Harus Diganti**:
  1. [bombsoal4.txt](file:///e:/CODING/mengeloladata/packs/bombsoal4.txt#L122-L127) (Set 2 No. 17): Kunci `C (海水の魚介類を加熱します)` → **Ganti** opsi C dengan tindakan salah, misal `加熱せずに室温で長時間保管します`.
  2. [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L69-L74) (Latihan 8 No. 10): Kunci `B (海水の魚介類を加熱します)` → **Ganti** opsi B dengan tindakan salah serupa.

#### E. Suhu Penyimpanan Daging & Hasil Laut Bentrok 3 Arah vs Tabel P.29 (4 soal)
- **Fakta Modul OTAFF v5.1 P.29–P.30 ([rekapmodulpm.txt](file:///e:/CODING/mengeloladata/rekapmodulpm.txt#L352-L372))**:
  - `食肉` = **`10℃以下`** | `生鮮魚介類` = **`5℃以下`** (keduanya disimpan di **`冷蔵庫`** standar `10℃以下`); daging/ikan beku di **`冷凍庫`** (`-15℃` / `-18℃以下`).
  - Angka **`4℃以下`** di P.12 adalah suhu di mana bakteri *hampir tidak bertambah banyak*, bukan ketentuan suhu simpan daging & ikan pada tabel P.29.
- **Yang Harus Diganti**:
  1. [bombsoal3.txt](file:///e:/CODING/mengeloladata/packs/bombsoal3.txt#L118-L123) (Set 1 No. 17) & [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L118-L123) (Latihan 8 No. 17): Kunci `4°C以下です` bertentangan dengan tabel P.29 → **Ganti pertanyaan** ke `"生鮮魚介類5℃以下・食肉10℃以下"` atau `"微生物がほとんど増えない温度（4℃以下）"`.
  2. [bombsoal5.txt](file:///e:/CODING/mengeloladata/packs/bombsoal5.txt#L22-L28) (Set 3 No. 3 — kunci `正しいものはない`) & [bombsoal7.txt](file:///e:/CODING/mengeloladata/packs/bombsoal7.txt#L102-L108) (Latihan 4 No. 13 — kunci `冷凍庫で保管する`): Keduanya **saling bertentangan** untuk soal identik! Untuk bahan segar (`食肉・魚介類`), di P.29 penyimpanan dinginnya di **`冷蔵庫`** (atau gunakan `生鮮魚介類5℃以下・食肉10℃以下` / `冷凍庫` khusus daging & ikan beku).

#### F. `"製造中の服装の衛生的な取り扱い"` Disalahkan pada Soal `全体像` (3 soal)
- **Fakta Modul OTAFF v5.1 P.5 & P.19–P.20**: Kebersihan pakaian kerja (`作業服`) dan kewajiban tidak melepas masker/topi selama bekerja (`作業中`) adalah bagian integral dari pilar `作業者の衛生管理`. Menjadikannya jawaban SALAH akan menyesatkan peserta.
- **Yang Harus Diganti**:
  - [bombsoal4.txt](file:///e:/CODING/mengeloladata/packs/bombsoal4.txt#L20-L26) (Set 2 No. 3)
  - [bombsoal10.txt](file:///e:/CODING/mengeloladata/packs/bombsoal10.txt#L6-L11) (Latihan 7 No. 1)
  - [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L34-L39) (Latihan 8 No. 5)
  → **Ganti** opsi tersebut dengan pengecoh yang benar-benar keliru, misal `微生物の増殖を放置すること` atau `汚染された製造環境`.

#### G. Konflik Penanganan Produk Abnormal (`作業中の製品の扱い`) (3 soal)
- **Kondisi**: [bombsoal5.txt](file:///e:/CODING/mengeloladata/packs/bombsoal5.txt#L38-L44) (Set 3 No. 5) menganggap `製品に水がかからないようにする` BENAR dan menolak `製品に異常が見つかったら、決められた場所に置いておく`. Sebaliknya [bombsoal7.txt](file:///e:/CODING/mengeloladata/packs/bombsoal7.txt#L86-L92) (Latihan 4 No. 11) dan [bombsoal10.txt](file:///e:/CODING/mengeloladata/packs/bombsoal10.txt#L83-L88) (Latihan 7 No. 12) memilih `決められた場所に置いておく` sebagai BENAR!
- **Perbaikan (P.8, P.39, P.52)**: Di v5.1, jika ada kelainan wajib **stop kerja & lapor ke `責任者`**. Jangan benturkan dua pernyataan benar; ubah opsi kelainan menjadi `"異常が見つかったら作業を止めて責任者に報告する"` atau buat opsi salah baru yang jelas salah.

#### H. Rentang Suhu Pertumbuhan Mikroba (`10℃〜60℃`) vs Modul v5.1 (`20℃〜50℃`) (3 soal)
- **Yang Harus Diganti**:
  - [bombsoal4.txt](file:///e:/CODING/mengeloladata/packs/bombsoal4.txt#L108-L113) (Set 2 No. 15)
  - [bombsoal7.txt](file:///e:/CODING/mengeloladata/packs/bombsoal7.txt#L94-L100) (Latihan 4 No. 12)
  - [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L55-L60) (Latihan 8 No. 8)
  → Ganti angka **`10℃ - 60℃`** menjadi **`20℃ - 50℃`** sesuai [rekapmodulpm.txt P.12](file:///e:/CODING/mengeloladata/rekapmodulpm.txt#L160-L161) (`高い温度（20℃〜50℃）`).

#### I. Klaim Membunuh Jamur (`カビ`) dengan Pemanasan & Uji `サルモネラ` Disalahkan (2 soal)
1. [bombsoal4.txt](file:///e:/CODING/mengeloladata/packs/bombsoal4.txt#L101-L106) (Set 2 No. 14): Menanyakan cara membunuh jamur (`カビ`) dengan kunci `加熱します`. → Bertentangan dengan P.14 (`完全になくすことはできない。カビが生えた食品は使わない`). **Ganti** soal menjadi penanganan bahan berjamur → **`使わない`**.
2. [bombsoal9.txt](file:///e:/CODING/mengeloladata/packs/bombsoal9.txt#L105-L110) (Latihan 6 No. 15): Menjadikan `サルモネラ属菌` jawaban salah pada uji mikroba sukarela, padahal P.36 menulis `サルモネラ属菌` juga kadang diuji (`検査することもある`). → **Ganti** opsi B ke **`ノロウイルス`** (seperti di Latihan 3 No. 4).

---

### 2. Soal Bergambar Tanpa Gambar (6 soal — Wajib Dilampirkan Gambar atau Dikonversi ke Soal Teks)

1. [bombsoal6.txt](file:///e:/CODING/mengeloladata/packs/bombsoal6.txt#L69-L74) (Latihan 3 No. 10) — `この人はどうしてですか` (tanpa gambar).
2. [bombsoal7.txt](file:///e:/CODING/mengeloladata/packs/bombsoal7.txt#L78-L84) (Latihan 4 No. 10) — `次の画像を見てください！` (tanpa gambar; semua opsi terlihat benar sehingga mustahil dijawab!).
3. [bombsoal8.txt](file:///e:/CODING/mengeloladata/packs/bombsoal8.txt#L61-L66) (Latihan 5 No. 8) — `正しい手洗いの方法` (opsi `[Ilustrasi A/B/C]`).
4. [bombsoal8.txt](file:///e:/CODING/mengeloladata/packs/bombsoal8.txt#L68-L73) (Latihan 5 No. 9) — `正しい服装の着方` (opsi hanya angka `3, 1, 2`).
5. [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L246-L251) (Latihan 8 No. 34) — `正しい服装の着方` (opsi hanya angka `3, 2, 1`).
6. [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L260-L265) (Latihan 8 No. 36) — `この人はどうしてですか` (tanpa gambar).

---

### 3. Soal Bahasa Rusak, Ambigu, & Duplikat Internal

1. **Bahasa Jepang / Logika Opsi Rusak**:
   - [bombsoal6.txt](file:///e:/CODING/mengeloladata/packs/bombsoal6.txt#L55-L60) (Latihan 3 No. 8): `"作業手順はどういう意味ですか。間違っているものをひとつえらびなさい。"` dengan potongan kalimat menggantung (`〜て`). → **Tulis ulang** soal & pilihan kalimatnya agar utuh dan jelas mana yang benar/salah.
   - [bombsoal4.txt](file:///e:/CODING/mengeloladata/packs/bombsoal4.txt#L94-L99) (Set 2 No. 13): Menanyakan bahan pangan yang paling mudah ditumbuhi mikroba antara `鶏肉`, `豚肉`, dan `魚` (kunci `C. 魚`) — **ambigu & tidak tercantum di OTAFF v5.1**. → Sebaiknya ganti dengan soal angka suhu P.12 (`20〜50℃`, `30〜40℃`, `≤4℃`, `≤-15℃`).
   - [bombsoal8.txt](file:///e:/CODING/mengeloladata/packs/bombsoal8.txt#L20-L25) (Latihan 5 No. 3) & [bombsoal11.txt](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L20-L25) & [No. 14](file:///e:/CODING/mengeloladata/packs/bombsoal11.txt#L97-L102) (Latihan 8 No. 3 & 14): Menanyakan bakteri spora yang harus segera didinginkan ke `≤ 20℃`, padahal di opsi ada **`ウェルシュ菌`** dan **`セレウス菌`** sekaligus. Di OTAFF v5.1 P.13, **keduanya** disebut bersama untuk pendinginan cepat (`セレウス菌やウェルシュ菌...すぐに冷やす`). → Sebaiknya sebutkan ciri khas makanannya (`カレー・シチュー`) atau ganti opsi pengecoh `セレウス菌` dengan bakteri non-spora.
   - [bombsoal5.txt](file:///e:/CODING/mengeloladata/packs/bombsoal5.txt#L86-L92) (Set 3 No. 11): Tambahkan konteks `騒音のある場所では` agar pembedaan `耳栓` (APD di P.47) vs `帽子` (seragam higiene di P.19) tidak membingungkan.
   - **Typo minor**: [bombsoal6.txt No. 12](file:///e:/CODING/mengeloladata/packs/bombsoal6.txt#L86) lupa `清掃` di daftar 5S; [bombsoal4.txt No. 7](file:///e:/CODING/mengeloladata/packs/bombsoal4.txt#L54) opsi C `下痢、はげしい下痢`; [bombsoal3.txt No. 1](file:///e:/CODING/mengeloladata/packs/bombsoal3.txt#L9) penulisan `85°C - 90°C 〜 90秒以上`.
2. **Duplikat Internal di `bombsoal11.txt` (Latihan 8)**:
   - **No. 3** dan **No. 14** identik (`ウェルシュ菌` cooling `20℃以下`).
   - **No. 18** dan **No. 24** sama-sama menguji 7 alergen wajib.
   - **No. 30** dan **No. 31** sama-sama menguji klaim keliru X-ray vs logam.
   - **No. 15** dan **No. 22** sama-sama menguji materi usang COVID-19.

---

### 4. Materi Usang / Edisi Lama yang Tidak Ada di OTAFF v5.1 (Disarankan Ganti ke Topik Baru v5.1)

Agar selaras dengan kisi-kisi terbaru OTAFF v5.1 (`rekapmodulpm.txt`), pertimbangkan mengganti materi edisi lama berikut dengan topik v5.1 yang belum tercover di Latihan 1–8 (misalnya **15 Rambu Keselamatan P.63–65**, **Fail Safe vs Fool Proof P.51**, **Hukum Heinrich `1:29:300` P.54**, **KYT P.55–56**, **Histamin & Solanin P.10**, **Anisakis P.14**, **3 Zona Kerja & Kardus P.16–17**, **Larangan Mencatat Sepihak P.40–41**, **Aturan Tangga/Slicer P.58–60**, dan **Gas Klorin/Alkohol dekat Oven P.52**):

- **COVID-19 & `3密`**: `bombsoal3` No. 14; `bombsoal4` No. 20; `bombsoal9` No. 9; `bombsoal11` No. 15, 22. *(5 soal)*
- **Klasifikasi deterjen alkali/asam (organik vs anorganik)**: `bombsoal8` No. 16, 17; `bombsoal10` No. 15. *(3 soal — secara kimia benar, tapi tak dibahas di v5.1)*
- **Istilah `感染型` (v5.1 membedakan di tabel P.11 tanpa label tersebut)**: `bombsoal4` No. 2, 4; `bombsoal7` No. 4; `bombsoal10` No. 2; `bombsoal11` No. 4.
- **Statistik `虫・髪の毛` terbanyak**: `bombsoal5` No. 13; `bombsoal7` No. 3; `bombsoal9` No. 8; `bombsoal10` No. 8.
- **`魚` sebagai bahan paling mudah ditumbuhi mikroba**: `bombsoal4` No. 13 *(ambigu & tak ada di v5.1 — sebaiknya diganti)*.
- **Daftar 3 poin `薬剤の管理` (`入出庫台帳・容器の工夫`) & `交差汚染` versi lama**: `bombsoal9` No. 19, 20; `bombsoal11` No. 28.
- **Arsip HACCP (`保管管理責任者・保管期間・保管場所`)**: `bombsoal8` No. 6 *(secara logika benar, tak tercantum di v5.1)*.
- **`農薬・抗生物質` di bahaya kimia**: `bombsoal8` No. 7; `bombsoal10` No. 7; `bombsoal11` No. 21 *(valid secara umum, di v5.1 P.8 contohnya alergen, histamin, solanin, pembersih/disinfektan)*.
- **Frasa lama `原材料の区分と保管` / `ゴミ箱` / `工具・部品箱`**: `bombsoal3` No. 19; `bombsoal8` No. 19, 20; `bombsoal11` No. 19, 38–40.

---

## Ringkasan Kondisi Sebelum Ujian Besok

- Untuk latihan paling akurat sesuai ujian **OTAFF Edisi 5.1**, jadikan **[rekapmodulpm_indo.md](file:///e:/CODING/mengeloladata/rekapmodulpm_indo.md)** (serta paket utama `bombsoal1.txt` & `bombsoal2.txt`) sebagai pegangan utama angka suhu, alergen **9 wajib + 20 anjuran**, X-ray vs plastik, dan 15 rambu K3.
- Jika ingin, seluruh poin pada Bagian 1, 2, dan 3 di atas bisa langsung kami **perbaiki/update massal** ke dalam file `packs/bombsoal3.txt` s.d. `packs/bombsoal11.txt` agar 100% akurat sesuai OTAFF v5.1.
