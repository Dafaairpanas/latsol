# Folder Paket Soal Tambahan (`packs/`)

Cukup taruh file soal baru berformat **`.txt`** (format Bomb Soal) atau **`.json`** (hasil ekspor dari Studio Soal di aplikasi) ke dalam folder ini.

Saat kamu menjalankan `npm run build` atau push ke GitHub untuk deploy di **Netlify / Vercel**, semua file di folder ini akan **otomatis muncul** di halaman utama simulator tanpa perlu mengubah kode!

Contoh format `.txt`:
```md
# Judul Paket Soalmu
> Kategori: SSW | Durasi: 60 | Lulus: 65

## 第1章 Nama Bab
**1. [P.1]** Pertanyaan dengan furigana 食品衛生(しょくひんえいせい)...
A. Pilihan pertama
B. Pilihan kedua
C. Pilihan ketiga
**Jawaban: A** — Penjelasan jawaban benar dan jebakannya.
```
