// @ts-nocheck
import { APP_NAME } from "../config.js";
import type { SourceInfo } from "./source-info.js";

export type SlashCommandSource = "extension" | "prompt" | "skill";

export interface SlashCommandInfo {
	name: string;
	description?: string;
	source: SlashCommandSource;
	sourceInfo: SourceInfo;
}

export interface BuiltinSlashCommand {
	name: string;
	description: string;
}

export const BUILTIN_SLASH_COMMANDS: ReadonlyArray<BuiltinSlashCommand> = [
	// 📂 OTURUM & BAĞLAM YÖNETİMİ
	{ name: "new", description: "Yeni ve temiz bir oturum başlat" },
	{ name: "resume", description: "Geçmiş bir oturuma geri dön" },
	{ name: "session", description: "Mevcut oturumun istatistiklerini ve durumunu göster" },
	{ name: "context", description: "Context (bağlam) penceresi doluluk oranını göster" },
	{ name: "compact", description: "Oturum geçmişini manuel olarak sıkıştır (token tasarrufu)" },
	{ name: "name", description: "Mevcut oturumun başlığını değiştir" },
	{ name: "plan", description: "Plan modunu aç/kapat (Sadece okuma ve analiz yapar)" },

	// 🤖 YAPAY ZEKA & MODEL
	{ name: "model", description: "Kullanılacak yapay zeka modelini değiştir" },
	{ name: "scoped-models", description: "Hızlı model geçiş (Ctrl+P) listesini düzenle" },
	{ name: "impmodel", description: "Ollama veya yerel sağlayıcıya yeni model ekle" },
	{ name: "agentmode", description: "Çoklu Agent sistemini (Şirket Modu) aç/kapat" },
	{ name: "workspace", description: "Agent departmanlarını ve çalışma alanını görüntüle" },

	// 🔄 DOSYA & GEÇMİŞ İŞLEMLERİ
	{ name: "init", description: "Bu proje için kurallar dosyası (MOON.md) oluştur" },
	{ name: "fork", description: "Geçmiş bir mesajdan yeni bir alternatif dal (fork) oluştur" },
	{ name: "clone", description: "Mevcut oturumu birebir kopyala" },
	{ name: "tree", description: "Oturumun mesaj dalları (branches) arasında gezin" },
	{ name: "copy", description: "Yapay zekanın son mesajını panoya kopyala" },

	// 🔗 ENTEGRASYON & PAYLAŞIM
	{ name: "export", description: "Oturumu dışa aktar (HTML veya JSONL olarak)" },
	{ name: "import", description: "JSONL dosyasından eski bir oturumu içe aktar" },
	{ name: "share", description: "Oturumu gizli bir GitHub Gist bağlantısı olarak paylaş" },
	{ name: "mcp", description: "Bağlı olan MCP (Model Context Protocol) sunucularını listele" },
	{ name: "discord", description: "Discord entegrasyonunu yönet" },
	{ name: "robotics", description: "Robotik modunu yapılandır (Görüntü ve sahne analizi)" },

	// ⚙️ SİSTEM & AYARLAR
	{ name: "settings", description: "Genel ayarlar menüsünü aç" },
	{ name: "login", description: "API anahtarlarını (Provider) yapılandır" },
	{ name: "logout", description: "Kayıtlı API kimlik doğrulamasını sil" },
	{ name: "hotkeys", description: "Tüm klavye kısayollarını listele" },
	{ name: "changelog", description: "Sürüm notlarını ve yenilikleri göster" },
	{ name: "reload", description: "Uzantıları, temaları ve kısayolları yeniden yükle" },
	{ name: "update", description: "Mooncli uygulamasını en son sürüme güncelle" },
	// { name: "upgrade", description: "/update ile aynı" }, // Kopya komut kalabalık yapmaması için gizlenebilir, ama interactive-mode.ts hala tanıyor.

	// 🚪 ÇIKIŞ
	{ name: "quit", description: `${APP_NAME} uygulamasından çık` },
];
