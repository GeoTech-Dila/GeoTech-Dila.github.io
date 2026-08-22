# GeoTech.D | Etkileşimli CV ve Portfolyo

[Canlı siteyi görüntüle](https://geotech-dila.github.io/) · [LinkedIn](https://www.linkedin.com/in/r-dila-%C3%B6zt%C3%BCrk-986a14326/) · [Çalışma arşivi](https://drive.google.com/drive/folders/1VUPZLJlDwjD7hqGiy-MWH93uD3IT6M4z?usp=drive_link)

GeoTech.D; Rabia Dila Öztürk'ün şehir ve bölge planlama, mekânsal veri üretimi, CBS, veri analizi ve üç boyutlu kent modelleme çalışmalarını bir araya getiren etkileşimli kişisel web sitesidir. Klasik bir CV sayfası yerine, ziyaretçinin içerikleri bir kent rotası üzerinde keşfettiği oyunlaştırılmış bir portfolyo deneyimi olarak tasarlanmıştır.

## Projenin Amacı

Bu proje; eğitim, deneyim, projeler, sertifikalar ve iletişim bilgilerini yalnızca listelemek yerine, yapılan çalışmaların arkasındaki araştırma ve üretim sürecini de görünür kılmak amacıyla geliştirildi.

Sitenin temel hedefleri:

- Şehir planlama ve mekânsal analiz çalışmalarını görsel bir anlatıyla sunmak
- Akademik ve profesyonel gelişimi kronolojik bir keşif rotasına dönüştürmek
- Proje paftalarını, haritaları, sertifikaları ve canlı uygulamaları tek yerde toplamak
- CBS, veri üretimi ve üç boyutlu modelleme yetkinliklerini doğrudan deneyimlenebilir hale getirmek
- İş birlikleri ve profesyonel bağlantılar için özgün bir dijital portfolyo oluşturmak

## Keşif Haritası Nasıl Çalışır?

Ziyaretçi rotaya **Dila'nın Evi / Hakkımda** durağından başlar. Her durak tamamlandığında sıra numarasını izleyen yol ağı adım adım oluşur ve yeni bölüm erişime açılır.

Rota sırasıyla şu duraklardan geçer:

1. **Dila'nın Evi** — Hakkımda
2. **Dokuz Eylül Üniversitesi** — Akademik gelişim
3. **Deneyim Müzesi** — İş ve staj deneyimleri
4. **Projeler Ticaret Merkezi** — Seçili çalışmalar
5. **Başarıya Giden Yol** — Sertifikalar ve kazanımlar
6. **Bağlantı Direği** — İletişim ve profesyonel bağlantılar

Harita döndürülebilir ve yakınlaştırılabilir. Kullanıcı her yeni durağa ilerlediğinde rota görsel olarak uzar; keşif yüzdesi ve etkin durak bilgisi eş zamanlı olarak güncellenir.

## Öne Çıkan Özellikler

- Döndürülebilen ve yakınlaştırılabilen üç boyutlu kariyer kenti
- Adım adım açılan oyunlaştırılmış içerik sistemi
- Türkiye üzerinde İzmir, Sakarya, Konya ve İstanbul çalışmalarını gösteren etkileşimli proje haritası
- Farklı animasyonlara sahip sürüklenebilir proje sunumu
- TÜBİTAK 2209-A kentsel ısı adası ve ulaşım araştırması
- Sakarya Kadın Dostu Kent bitirme projesi
- Dokuz Eylül Üniversitesi Selçuk 3.1 ve 3.2 planlama projeleri
- Konya Koruma ve İzleme Haritası gibi canlı WebGIS uygulamalarına bağlantılar
- PDF belgeleriyle birlikte görüntülenebilen sertifika arşivi
- Gerçek sayfa çevirme hissi veren, döndürülebilen ve yakınlaştırılabilen üç boyutlu portfolyo kitabı
- Açık ve karanlık tema desteği
- Masaüstü ve mobil ekranlara uyumlu tasarım

## Nasıl Yapıldı?

Proje herhangi bir hazır site şablonu veya içerik yönetim sistemi kullanılmadan geliştirildi.

- Sayfa yapısı semantik **HTML5** ile oluşturuldu.
- Görsel düzen, responsive yapı, geçişler ve arayüz animasyonları **CSS3** ile tasarlandı.
- Tema değişimi, keşif ilerlemesi, proje geçişleri, açılır içerikler ve kullanıcı etkileşimleri **JavaScript** ile geliştirildi.
- Üç boyutlu kent, kamera hareketleri, etkileşimli duraklar ve portfolyo kitabı **Three.js** kullanılarak üretildi.
- Türkiye haritası gerçek il sınırı verileri kullanılarak ölçeklendirildi ve etkileşimli çalışma noktalarıyla birleştirildi.
- Proje paftaları ve portfolyo sayfaları web performansı için **WebP** formatında hazırlandı.
- CV ve sertifikalar özgün **PDF** belgeleriyle bağlantılı biçimde sunuldu.
- Site statik yapıda hazırlandı ve **GitHub Pages** üzerinden yayımlandı.

## Kullanılan Teknolojiler

`HTML5` · `CSS3` · `JavaScript` · `Three.js` · `WebP` · `GitHub Pages`

Projelerde kullanılan başlıca üretim ve analiz araçları arasında QGIS, ArcGIS, Google Earth Engine, CityEngine, Python, SQL, PostGIS, Netcad, AutoCAD, Blender ve SPSS bulunmaktadır.

## Proje Yapısı

```text
.
├── index.html              # Sayfa yapısı ve içerikler
├── styles.css              # Tasarım, responsive düzen ve animasyonlar
├── script.js               # Arayüz ve keşif akışı
├── city-3d.js              # Üç boyutlu kariyer kenti
├── portfolio-book.js       # Etkileşimli 3B portfolyo kitabı
├── assets/                 # Görseller, harita verileri ve portfolyo sayfaları
├── certificates/           # Sertifika PDF dosyaları
└── rabia-dila-ozturk-cv.pdf
```

## Yerel Olarak Görüntüleme

Proje statik bir web sitesidir. Dosyalar bir yerel web sunucusu üzerinden açıldığında tüm etkileşimler ve görsel varlıklar doğru şekilde çalışır. Herhangi bir derleme veya paket kurulum adımı gerekmez.

## Yayınlama

Site, `GeoTech-Dila.github.io` deposunun `main` dalından GitHub Pages ile yayımlanır. Depodaki dosyalar güncellendikten sonra GitHub Pages dağıtımı otomatik olarak başlar ve değişiklikler kısa süre içinde canlı siteye yansır.

## İletişim

**Rabia Dila Öztürk — GeoTech.D**  
Şehir Plancısı · Mekânsal Veri Üreticisi · Spatial Data Analyst

- [LinkedIn](https://www.linkedin.com/in/r-dila-%C3%B6zt%C3%BCrk-986a14326/)
- [GitHub](https://github.com/GeoTech-Dila)
- [Google Drive çalışma arşivi](https://drive.google.com/drive/folders/1VUPZLJlDwjD7hqGiy-MWH93uD3IT6M4z?usp=drive_link)

---

Bu site, kentleri veriyle okumayı ve planlama çalışmalarını etkileşimli bir dijital anlatıya dönüştürmeyi amaçlar.
