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
	{ name: "settings", description: "Ayarlar menusunu ac" },
	{ name: "model", description: "Model sec (secici arayuzunu acar)" },
	{ name: "scoped-models", description: "Ctrl+P ile gecis yapilacak modelleri ac/kapat" },
	{ name: "export", description: "Oturumu disari aktar (HTML varsayilan, veya yol belirtin: .html/.jsonl)" },
	{ name: "import", description: "Bir JSONL dosyasindan oturumu ice aktar ve devam et" },
	{ name: "share", description: "Oturumu gizli bir GitHub gist olarak paylas" },
	{ name: "copy", description: "Son temsilci mesajini panoya kopyala" },
	{ name: "name", description: "Oturum goruntu adini ayarla" },
	{ name: "session", description: "Oturum bilgisini ve istatistiklerini goster" },
	{ name: "changelog", description: "Degisim gunlugu girdilerini goster" },
	{ name: "hotkeys", description: "Tum klavye kisayollarini goster" },
	{ name: "fork", description: "Onceki bir kullanici mesajindan yeni bir catal olustur" },
	{ name: "clone", description: "Mevcut oturumu mevcut konumda cogalt" },
	{ name: "tree", description: "Oturum agacinda gezinin (dallari degistirin)" },
	{ name: "login", description: "Saglayici kimlik dogrulamasini yapilandir" },
	{ name: "logout", description: "Saglayici kimlik dogrulamasini kaldir" },
	{ name: "new", description: "Yeni bir oturum baslat" },
	{ name: "compact", description: "Oturum baglamini manuel olarak sikistir" },
	{ name: "resume", description: "Farkli bir oturuma devam et" },
	{ name: "mcp", description: "Bagli MCP sunucularini goster" },
	{
		name: "reload",
		description: "Klavye kisayollarini, uzantilari, yetenekleri, istemleri ve temalari yeniden yukle",
	},
	{ name: "quit", description: `${APP_NAME}'den cik` },
	{ name: "robotics", description: "Robotics mode - goruntu analizi, nesne tespiti, yorunge planlama" },
	{ name: "discord", description: "Discord entegrasyonu ve bot yonetimi" },
	{ name: "update", description: "Mooncli ve uzantilari hizlica guncelle" },
	{ name: "upgrade", description: "/update kisayolu (Mooncli ve uzantilari gunceller)" },
	{ name: "impmodel", description: "Yeni bir modeli ollama saglayicisina ekle" },
];
