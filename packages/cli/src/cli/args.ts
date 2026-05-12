// @ts-nocheck
/**
 * CLI argument parsing and help display
 */

import chalk from "chalk";
import type { ThinkingLevel } from "moon-engine";
import { APP_NAME, CONFIG_DIR_NAME, ENV_AGENT_DIR, ENV_SESSION_DIR } from "../config.js";
import type { ExtensionFlag } from "../core/extensions/types.js";

export type Mode = "text" | "json" | "rpc";

export interface Args {
	provider?: string;
	headless?: boolean;
	timeout?: number;
	outputFormat?: "json" | "text";
	model?: string;
	apiKey?: string;
	systemPrompt?: string;
	appendSystemPrompt?: string[];
	thinking?: ThinkingLevel;
	continue?: boolean;
	resume?: boolean;
	help?: boolean;
	version?: boolean;
	mode?: Mode;
	noSession?: boolean;
	session?: string;
	fork?: string;
	sessionDir?: string;
	models?: string[];
	tools?: string[];
	noTools?: boolean;
	noBuiltinTools?: boolean;
	extensions?: string[];
	noExtensions?: boolean;
	print?: boolean;
	export?: string;
	noSkills?: boolean;
	skills?: string[];
	promptTemplates?: string[];
	noPromptTemplates?: boolean;
	themes?: string[];
	noThemes?: boolean;
	noContextFiles?: boolean;
	listModels?: string | true;
	offline?: boolean;
	verbose?: boolean;
	messages: string[];
	fileArgs: string[];
	/** Unknown flags (potentially extension flags) - map of flag name to value */
	unknownFlags: Map<string, boolean | string>;
	diagnostics: Array<{ type: "warning" | "error"; message: string }>;
}

const VALID_THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;

export function isValidThinkingLevel(level: string): level is ThinkingLevel {
	return VALID_THINKING_LEVELS.includes(level as ThinkingLevel);
}

export function parseArgs(args: string[]): Args {
	const result: Args = {
		messages: [],
		fileArgs: [],
		unknownFlags: new Map(),
		diagnostics: [],
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--help" || arg === "-h") {
			result.help = true;
		} else if (arg === "--version" || arg === "-v") {
			result.version = true;
		} else if (arg === "--headless") {
			result.headless = true;
		} else if (arg === "--timeout" && i + 1 < args.length) {
			result.timeout = Number(args[++i]);
		} else if (arg === "--output-format" && i + 1 < args.length) {
			const value = args[++i];
			if (value === "json" || value === "text") result.outputFormat = value;
		} else if (arg === "--mode" && i + 1 < args.length) {
			const mode = args[++i];
			if (mode === "text" || mode === "json" || mode === "rpc") {
				result.mode = mode;
			}
		} else if (arg === "--continue" || arg === "-c") {
			result.continue = true;
		} else if (arg === "--resume" || arg === "-r") {
			result.resume = true;
		} else if (arg === "--provider" && i + 1 < args.length) {
			result.provider = args[++i];
		} else if (arg === "--model" && i + 1 < args.length) {
			result.model = args[++i];
		} else if (arg === "--api-key" && i + 1 < args.length) {
			result.apiKey = args[++i];
		} else if (arg === "--system-prompt" && i + 1 < args.length) {
			result.systemPrompt = args[++i];
		} else if (arg === "--append-system-prompt" && i + 1 < args.length) {
			result.appendSystemPrompt = result.appendSystemPrompt ?? [];
			result.appendSystemPrompt.push(args[++i]);
		} else if (arg === "--no-session") {
			result.noSession = true;
		} else if (arg === "--session" && i + 1 < args.length) {
			result.session = args[++i];
		} else if (arg === "--fork" && i + 1 < args.length) {
			result.fork = args[++i];
		} else if (arg === "--session-dir" && i + 1 < args.length) {
			result.sessionDir = args[++i];
		} else if (arg === "--models" && i + 1 < args.length) {
			result.models = args[++i].split(",").map((s) => s.trim());
		} else if (arg === "--no-tools" || arg === "-nt") {
			result.noTools = true;
		} else if (arg === "--no-builtin-tools" || arg === "-nbt") {
			result.noBuiltinTools = true;
		} else if ((arg === "--tools" || arg === "-t") && i + 1 < args.length) {
			result.tools = args[++i]
				.split(",")
				.map((s) => s.trim())
				.filter((name) => name.length > 0);
		} else if (arg === "--thinking" && i + 1 < args.length) {
			const level = args[++i];
			if (isValidThinkingLevel(level)) {
				result.thinking = level;
			} else {
				result.diagnostics.push({
					type: "warning",
					message: `Geçersiz düşünme seviyesi "${level}". Geçerli değerler: ${VALID_THINKING_LEVELS.join(", ")}`,
				});
			}
		} else if (arg === "--print" || arg === "-p") {
			result.print = true;
		} else if (arg === "--export" && i + 1 < args.length) {
			result.export = args[++i];
		} else if ((arg === "--extension" || arg === "-e") && i + 1 < args.length) {
			result.extensions = result.extensions ?? [];
			result.extensions.push(args[++i]);
		} else if (arg === "--no-extensions" || arg === "-ne") {
			result.noExtensions = true;
		} else if (arg === "--skill" && i + 1 < args.length) {
			result.skills = result.skills ?? [];
			result.skills.push(args[++i]);
		} else if (arg === "--prompt-template" && i + 1 < args.length) {
			result.promptTemplates = result.promptTemplates ?? [];
			result.promptTemplates.push(args[++i]);
		} else if (arg === "--theme" && i + 1 < args.length) {
			result.themes = result.themes ?? [];
			result.themes.push(args[++i]);
		} else if (arg === "--no-skills" || arg === "-ns") {
			result.noSkills = true;
		} else if (arg === "--no-prompt-templates" || arg === "-np") {
			result.noPromptTemplates = true;
		} else if (arg === "--no-themes") {
			result.noThemes = true;
		} else if (arg === "--no-context-files" || arg === "-nc") {
			result.noContextFiles = true;
		} else if (arg === "--list-models") {
			// Check if next arg is a search pattern (not a flag or file arg)
			if (i + 1 < args.length && !args[i + 1].startsWith("-") && !args[i + 1].startsWith("@")) {
				result.listModels = args[++i];
			} else {
				result.listModels = true;
			}
		} else if (arg === "--verbose") {
			result.verbose = true;
		} else if (arg === "--offline") {
			result.offline = true;
		} else if (arg.startsWith("@")) {
			result.fileArgs.push(arg.slice(1)); // Remove @ prefix
		} else if (arg.startsWith("--")) {
			const eqIndex = arg.indexOf("=");
			if (eqIndex !== -1) {
				result.unknownFlags.set(arg.slice(2, eqIndex), arg.slice(eqIndex + 1));
			} else {
				const flagName = arg.slice(2);
				const next = args[i + 1];
				if (next !== undefined && !next.startsWith("-") && !next.startsWith("@")) {
					result.unknownFlags.set(flagName, next);
					i++;
				} else {
					result.unknownFlags.set(flagName, true);
				}
			}
		} else if (arg.startsWith("-") && !arg.startsWith("--")) {
			result.diagnostics.push({ type: "error", message: `Bilinmeyen seçenek: ${arg}` });
		} else if (!arg.startsWith("-")) {
			result.messages.push(arg);
		}
	}

	return result;
}

export function printHelp(extensionFlags?: ExtensionFlag[]): void {
	const extensionFlagsText =
		extensionFlags && extensionFlags.length > 0
			? `\n${chalk.bold("Eklenti CLI Bayrakları:")}\n${extensionFlags
					.map((flag) => {
						const value = flag.type === "string" ? " <değer>" : "";
						const description = flag.description ?? `${flag.extensionPath} tarafından kaydedildi`;
						return `  --${flag.name}${value}`.padEnd(30) + description;
					})
					.join("\n")}\n`
			: "";
	console.log(`${chalk.bold(APP_NAME)} - Okuma, bash, düzenleme ve yazma araçlarına sahip çekirdek kodlama asistanı

${chalk.bold("Kullanım:")}
  ${APP_NAME} [seçenekler] [@dosyalar...] [mesajlar...]

${chalk.bold("Komutlar:")}
  ${APP_NAME} install <kaynak> [-l]     Eklenti kaynağını yükle ve ayarlara ekle
  ${APP_NAME} remove <kaynak> [-l]      Eklenti kaynağını ayarlardan kaldır
  ${APP_NAME} uninstall <kaynak> [-l]   Kaldırmak için alternatif komut
  ${APP_NAME} update [kaynak|self|Moon] MoonCode'yi ve yüklü eklentileri güncelle
  ${APP_NAME} list                      Ayarlarda yüklü eklentileri listele
  ${APP_NAME} config                    Paket kaynaklarını etkinleştirmek/devre dışı bırakmak için TUI'yi aç
  ${APP_NAME} doctor                    Kurulum, PATH, sürüm ve güncelleme teşhisi
  ${APP_NAME} ollama doctor             Yerel Ollama bağlantısını ve modelleri kontrol et
  ${APP_NAME} ollama profile <profil>   Ollama hız/RAM profil komutlarını yazdır
  ${APP_NAME} browser-bridge            Sadece Chrome extension bridge server'ını çalıştır
  echo '{"type":"prompt","text":"Fix lint"}' | ${APP_NAME} --headless --timeout 120
  ${APP_NAME} <komut> --help            Yükleme/kaldırma/güncelleme/listeleme için yardım göster

${chalk.bold("Seçenekler:")}
  --provider <isim>              Sağlayıcı ismi (varsayılan: google)
  --model <desen>                Model deseni veya ID'si ("provider/id" ve isteğe bağlı ":<düşünme>" destekler)
  --api-key <anahtar>            API anahtarı (ortam değişkenlerine varsayılan olarak ayarlanır)
  --system-prompt <metin>        Sistem istemi (varsayılan: kodlama asistanı istemi)
  --append-system-prompt <metin> Sistem istemine metin veya dosya içeriği ekle (birden fazla kez kullanılabilir)
  --mode <mod>                   Çıktı modu: text (varsayılan), json veya rpc
  --headless                     CI/headless JSON stdin/stdout modu
  --timeout <sn>                 Headless zaman aşımı (saniye)
  --output-format <json|text>    Headless çıktı formatı
  --print, -p                    Etkileşimsiz mod: istemi işle ve çık
  --continue, -c                 Önceki oturuma devam et
  --resume, -r                   Devam etmek için bir oturum seç
  --session <yol|id>             Belirli bir oturum dosyasını veya kısmi UUID'yi kullan
  --fork <yol|id>                Belirli bir oturum dosyasını veya kısmi UUID'yi yeni bir oturuma çatalla
  --session-dir <dizin>          Oturum depolama ve arama dizini
  --no-session                   Oturumu kaydetme (geçici)
  --models <desenler>            Ctrl+P döngüsü için virgülle ayrılmış model desenleri
                                 Glob'ları (anthropic/*, *sonnet*) ve bulanık eşleşmeyi destekler
  --no-tools, -nt                Tüm araçları varsayılan olarak devre dışı bırak (yerleşik ve eklenti)
  --no-builtin-tools, -nbt       Yerleşik araçları devre dışı bırak ama eklenti/özel araçları etkin tut
  --tools, -t <araçlar>          Etkinleştirilecek araç isimlerinin virgülle ayrılmış izin listesi
                                 Yerleşik, eklenti ve özel araçlar için geçerlidir
  --thinking <seviye>            Düşünme seviyesini ayarla: off, minimal, low, medium, high, xhigh
  --extension, -e <yol>          Bir eklenti dosyası yükle (birden fazla kez kullanılabilir)
  --no-extensions, -ne           Eklenti keşfini devre dışı bırak (açık -e yolları hala çalışır)
  --skill <yol>                  Bir yetenek dosyası veya dizini yükle (birden fazla kez kullanılabilir)
  --no-skills, -ns               Yetenek keşfini ve yüklemesini devre dışı bırak
  --prompt-template <yol>        Bir istem şablonu dosyası veya dizini yükle (birden fazla kez kullanılabilir)
  --no-prompt-templates, -np     İstem şablonu keşfini ve yüklemesini devre dışı bırak
  --theme <yol>                  Bir tema dosyası veya dizini yükle (birden fazla kez kullanılabilir)
  --no-themes                    Tema keşfini ve yüklemesini devre dışı bırak
  --no-context-files, -nc        AGENTS.md ve CLAUDE.md keşfini ve yüklemesini devre dışı bırak
  --export <dosya>               Oturum dosyasını HTML'e aktar ve çık
  --list-models [arama]          Mevcut modelleri listele (isteğe bağlı bulanık arama ile)
  --verbose                      Zorunlu ayrıntılı başlatma (quietStartup ayarını geçersiz kılar)
  --offline                      Başlangıç ağ işlemlerini devre dışı bırak (PI_OFFLINE=1 ile aynı)
  --help, -h                     Bu yardımı göster
  --version, -v                  Sürüm numarasını göster

Eklentiler ek bayraklar kaydedebilir (örneğin, plan-mode eklentisinden --plan).${extensionFlagsText}

${chalk.bold("Örnekler:")}
  # Etkileşimli mod
  ${APP_NAME}

  # İlk istemle etkileşimli mod
  ${APP_NAME} "src/ dizinindeki tüm .ts dosyalarını listele"

  # İlk mesaja dosyaları dahil et
  ${APP_NAME} @prompt.md @image.png "Gökyüzü ne renk?"

  # Etkileşimsiz mod (işle ve çık)
  ${APP_NAME} -p "src/ dizinindeki tüm .ts dosyalarını listele"

  # Birden fazla mesaj (etkileşimli)
  ${APP_NAME} "package.json dosyasını oku" "Hangi bağımlılıklara sahibiz?"

  # Önceki oturuma devam et
  ${APP_NAME} --continue "Neyi tartışmıştık?"

  # Yerel Ollama modelini hızlı başlat
  ${APP_NAME} olm qwen2.5-coder:7b "Bu kodu refactor etmeme yardım et"

  # Ollama düşük RAM / yüksek hız profilini hazırla
  ${APP_NAME} ollama profile turbo

  # Farklı model kullan
  ${APP_NAME} --provider openai --model gpt-4o-mini "Bu kodu refactor etmeme yardım et"

  # Sağlayıcı ön ekiyle model kullan (--provider gerekmez)
  ${APP_NAME} --model openai/gpt-4o "Bu kodu refactor etmeme yardım et"

  # Düşünme seviyesi kısayoluyla model kullan
  ${APP_NAME} --model sonnet:high "Bu karmaşık sorunu çöz"

  # Model döngüsünü belirli modellerle sınırla
  ${APP_NAME} --models claude-sonnet,claude-haiku,gpt-4o

  # Glob deseniyle belirli bir sağlayıcıyla sınırla
  ${APP_NAME} --models "github-copilot/*"

  # Sabit düşünme seviyeleriyle modeller arasında döngü yap
  ${APP_NAME} --models sonnet:high,haiku:low

  # Belirli bir düşünme seviyesiyle başla
  ${APP_NAME} --thinking high "Bu karmaşık sorunu çöz"

  # Salt okunur mod (dosya değişikliği yapılamaz)
  ${APP_NAME} --tools read,grep,find,ls -p "src/ dizinindeki kodu incele"

  # Bir oturum dosyasını HTML'e aktar
  ${APP_NAME} --export ~/${CONFIG_DIR_NAME}/engine/sessions/--path--/session.jsonl
  ${APP_NAME} --export session.jsonl cikti.html

${chalk.bold("Ortam Değişkenleri:")}
  ANTHROPIC_API_KEY                - Anthropic Claude API anahtarı
  ANTHROPIC_OAUTH_TOKEN            - Anthropic OAuth jetonu (API anahtarına alternatif)
  OpenAI_API_KEY                   - OpenAI GPT API anahtarı
  AZURE_OpenAI_API_KEY             - Azure OpenAI API anahtarı
  AZURE_OpenAI_BASE_URL            - Azure OpenAI/Cognitive Services taban URL'si
  AZURE_OpenAI_RESOURCE_NAME       - Azure OpenAI kaynak adı
  AZURE_OpenAI_API_VERSION         - Azure OpenAI API sürümü (varsayılan: v1)
  AZURE_OpenAI_DEPLOYMENT_NAME_MAP - Azure OpenAI model=deployment haritası (virgülle ayrılmış)
  DEEPSEEK_API_KEY                 - DeepSeek API anahtarı
  GEMINI_API_KEY                   - Google Gemini API anahtarı
  GROQ_API_KEY                     - Groq API anahtarı
  CEREBRAS_API_KEY                 - Cerebras API anahtarı
  XCore_API_KEY                    - xCore Grok API anahtarı
  FIREWORKS_API_KEY                - Fireworks API anahtarı
  OPENROUTER_API_KEY               - OpenRouter API anahtarı
  Core_GATEWAY_API_KEY             - Vercel Core Gateway API anahtarı
  ZCore_API_KEY                    - ZCore API anahtarı
  MISTRAL_API_KEY                  - Mistral API anahtarı
  MINIMAX_API_KEY                  - MiniMax API anahtarı
  MOONSHOT_API_KEY                 - Moonshot Core API anahtarı
  OPENCODE_API_KEY                 - OpenCode Zen/OpenCode Go API anahtarı
  KIMI_API_KEY                     - Kimi For Coding API anahtarı
  CLOUDFLARE_API_KEY               - Cloudflare API jetonu
  CLOUDFLARE_ACCOUNT_ID            - Cloudflare hesap kimliği
  CLOUDFLARE_GATEWAY_ID            - Cloudflare Core Gateway slug'ı
  XIAOMI_API_KEY                   - Xiaomi MiMo API anahtarı
  XIAOMI_TOKEN_PLAN_CN_API_KEY     - Xiaomi MiMo Token Plan API anahtarı (Çin bölgesi)
  XIAOMI_TOKEN_PLAN_AMS_API_KEY    - Xiaomi MiMo Token Plan API anahtarı (Amsterdam bölgesi)
  XIAOMI_TOKEN_PLAN_SGP_API_KEY    - Xiaomi MiMo Token Plan API anahtarı (Singapur bölgesi)
  AWS_PROFILE                      - Amazon Bedrock için AWS profili
  AWS_ACCESS_KEY_ID                - Amazon Bedrock için AWS erişim anahtarı
  AWS_SECRET_ACCESS_KEY            - Amazon Bedrock için AWS gizli anahtarı
  AWS_BEARER_TOKEN_BEDROCK         - Bedrock API anahtarı (bearer token)
  AWS_REGION                       - Amazon Bedrock için AWS bölgesi (örn. us-east-1)
  ${ENV_AGENT_DIR.padEnd(32)} - Yapılandırma dizini (varsayılan: ~/${CONFIG_DIR_NAME}/engine)
  ${ENV_SESSION_DIR.padEnd(32)} - Oturum depolama dizini (--session-dir ile geçersiz kılınır)
  MOON_PACKAGE_DIR                 - Paket dizini geçersiz kılma
  MOON_OFFLINE                     - Ayarlandığında başlangıç ağ işlemlerini devre dışı bırakır
  MOON_TELEMETRY                   - Kurulum telemetrisini geçersiz kıl
  MOON_SHARE_VIEWER_URL            - /share komutu için taban URL (varsayılan: https://MoonCode.dev/session/)

${chalk.bold("Yerleşik Araç İsimleri:")}
  read   - Dosya içeriğini oku
  bash   - Bash komutlarını yürüt
  edit   - Bul/değiştir ile dosyaları düzenle
  write  - Dosyaları yaz (oluşturur/üzerine yazar)
  grep   - Dosya içeriğini ara (salt okunur, varsayılan olarak kapalı)
  find   - Glob deseniyle dosyaları bul (salt okunur, varsayılan olarak kapalı)
  ls     - Dizin içeriğini listele (salt okunur, varsayılan olarak kapalı)
`);
}
