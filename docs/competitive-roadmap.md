# MoonCode Competitive Roadmap

Browser araştırması özeti: Claude Code, Cursor, Windsurf ve Codex CLI tarafında öne çıkan beklenti artık sadece chat değil; agentic planlama, terminal/FS güvenliği, MCP, paralel görevler, PR akışı, büyük context, hızlı autocomplete/preview ve kontrollü izin modelleri.

## Rakiplerden öğrenilenler

- **Claude Code**: terminal-native agent, repo okuma, test çalıştırma, git/PR, MCP ve uzun context.
- **Cursor**: IDE içinde hızlı composer, custom rules, multi-file refactor, paralel agent/worktree yaklaşımı.
- **Windsurf**: Cascade agent, insan-AI akışı, preview/deploy, agent komuta merkezi.
- **Codex CLI**: local-first CLI, izin modları, multimodal/screenshot, kontrollü full-access.

## MoonCode hedefleri

1. **Terminalde kendine has UI**
   - Tek kolon, sakin renk, az gürültü.
   - Header: inspect → act → verify akışı.
   - Footer: sadece kritik model/context/browser/git bilgisi.

2. **Browser Bridge üstünlüğü**
   - Varsayılan düşük token okuma.
   - Etiket/overlay sadece istenirse.
   - Upload file, drag/drop, clear_ui.
   - Tarayıcı kapalıysa otomatik açma denemesi.

3. **Ciddi agent davranışı**
   - En basit değil, en basit + en akıllı + en mantıklı + doğrulanabilir yol.
   - Kör tıklama/guess yok.
   - Her riskli aksiyondan sonra state kontrolü.

4. **Kurumsal yayın kalitesi**
   - Audit temiz.
   - Build/typecheck temiz.
   - Backward compatibility: eski `mooncli` alias ve eski extension manifest keyleri kırılmadan devam.

## Kısa vadeli backlog

- Browser Bridge için Playwright benzeri daha güvenilir selector heuristics.
- Terminal UI içinde görev timeline bileşeni ama sağ panel gibi boş yer kaplamadan.
- MCP presetleri: GitHub, Jira, Slack, docs.
- Permission profiles: read-only, safe-edit, full-access.
- Session intelligence: otomatik checkpoint, branch summary, aggressive compaction.
