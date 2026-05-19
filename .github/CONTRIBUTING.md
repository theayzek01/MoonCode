# [ MoonCode'a Katkıda Bulunma ]

MoonCode'u geliştirmemize yardımcı olmak istiyorsan, bu rehber hem senin hem de bizim vaktimizi korumak için var.

### [ Temel Kural ]

**Kodunu anlamalısın.** Gönderdiğin değişikliğin ne işe yaradığını ve sistemin geri kalanıyla nasıl etkileşime girdiğini açıklayamıyorsan, PR (Pull Request) kapatılacaktır. AI kullanarak kod yazmak serbesttir, ancak ne yaptığını anlamadan "AI çıktısı" paylaşmak yasaktır.

---

### [ Katkı Süreci ]

1. **Sorun Bildirme:** Bir hata bulduysan veya özellik istiyorsan önce Discord'da konuşalım.
2. **Hafta Sonu:** Cuma-Pazar arası açılan issue'lar hemen incelenmeyebilir. Acil bir durum varsa Discord'dan ulaş.
3. **Discord:** [discord.gg/kanser](https://discord.gg/kanser)

---

### [ PR Öncesi Kontrol ]

Değişiklik yapmadan önce ana branch'in (main veya launch/mooncode) güncel olduğundan emin ol. PR göndermeden önce şu komutları mutlaka çalıştır:

```bash
npm run check
npm run build
```

Hata alıyorsan, önce hataları çöz sonra PR aç.

---

### [ Felsefemiz ]

MoonCode'un çekirdeği (core) her zaman yalın kalmalıdır. Eğer istediğin özellik çekirdek için çok ağırsa, bunu bir eklenti (extension) olarak kurgulamalısın. Çekirdeği şişirecek PR'lar reddedilebilir.

---

### [ Sorular ]

Her türlü soru için Discord veya Instagram üzerinden ulaşabilirsin:

- **👾 Discord:** [discord.gg/kanser](https://discord.gg/kanser)
- **📸 Instagram:** [@theayzek01](https://instagram.com/theayzek01)

---

### [ Sıkça Sorulan Sorular ]

**Neden issue'lar hemen kapanıyor?**
Düşük kaliteli, ne olduğu belli olmayan veya spam raporlar vaktimizi çalıyor. Eğer issue'n kapandıysa, rehberi okuyup daha net bir şekilde tekrar açabilirsin.

**Bu kurallar sert değil mi?**
Hayır, bu kurallar projenin kalitesini korumak ve burnout (tükenmişlik) yaşamamak için var. Somut, hatası kanıtlanmış ve üzerine düşünülmüş her türlü katkıya kapımız açık.

