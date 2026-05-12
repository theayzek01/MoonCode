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
	{ name: "settings", description: "Ayarlar menüsünü aç" },
	{ name: "models", description: "Model seç (seçici arayüzünü açar)" },
	{ name: "scoped-models", description: "Hızlı geçiş listesini düzenle (Ctrl+P)" },
	{ name: "export", description: "Oturumu dışarı aktar (.html veya .jsonl)" },
	{ name: "import", description: "JSONL dosyasından oturumu içe aktar" },
	{ name: "share", description: "Oturumu gizli GitHub Gist olarak paylaş" },
	{ name: "copy", description: "Son yanıtı panoya kopyala" },
	{ name: "name", description: "Oturum adını değiştir" },
	{ name: "session", description: "Oturum bilgilerini ve istatistiklerini göster" },
	{ name: "context", description: "Bağlam kullanımı ve token dağılımını göster" },
	{ name: "plan", description: "Plan modunu aç/kapat (analiz modu)" },
	{ name: "autothink", description: "Otomatik dusunme seviyesini ac/kapat" },
	{ name: "init", description: "Proje yapılandırma dosyalarını oluştur" },
	{ name: "changelog", description: "Değişim günlüğünü göster" },
	{ name: "hotkeys", description: "Klavye kısayollarını listele" },
	{ name: "fork", description: "Mesajdan yeni bir çatal (fork) oluştur" },
	{ name: "clone", description: "Oturumu mevcut konumda kopyala" },
	{ name: "tree", description: "Oturum ağacında gezin" },
	{ name: "login", description: "Sağlayıcı girişi yap" },
	{ name: "logout", description: "Sağlayıcı çıkışı yap" },
	{ name: "new", description: "Yeni oturum başlat" },
	{ name: "compact", description: "Oturum bağlamını sıkıştır" },
	{ name: "resume", description: "Farklı bir oturuma devam et" },
	{ name: "mcp", description: "Bağlı MCP sunucularını listele" },
	{
		name: "reload",
		description: "Tüm sistem bileşenlerini yeniden yükle",
	},
	{ name: "quit", description: `${APP_NAME}'den çık` },
	{ name: "agentmode", description: "Agent modunu aç/kapat" },
	{ name: "agents", description: "Agent yönetim sistemi" },
	{ name: "workspace", description: "Çalışma alanı ve departmanları göster" },
	{ name: "mood", description: "Duygusal durum katmanı (Affective State)" },
	{ name: "browser", description: "Chrome eklenti durumu ve kontrolü" },
	{ name: "robotics", description: "Robotik kontrol modu (Vision/Planning)" },
	{ name: "discord", description: "Discord entegrasyonu" },
	{ name: "update", description: "Mooncli ve paketleri güncelle" },
	{ name: "upgrade", description: "Sistemi en son sürüme yükselt" },
	{ name: "impmodel", description: "Ollama'ya yeni model ekle" },
	{ name: "index", description: "Kod tabanını semantik arama için indeksle" },
	{ name: "ship", description: "Değişiklikleri yayına gönder (Branch/PR)" },
	{ name: "git", description: "Git yardımcı komutları" },
	{ name: "ollama", description: "Ollama model yönetimi" },
	{ name: "diff", description: "Git değişikliklerini göster" },
	{ name: "web", description: "Web arayüzünü aç" },
	{ name: "marketplace", description: "Eklenti ve tema marketi" },
];
