# git-explain

Understand what changed, why it changed, and what risks it introduces — powered by AI.

Instead of `+520 -380`, git-explain tells you _what actually changed_, infers _why_ from repository context, highlights _regressions_ and _affected modules_, and suggests _commit messages_, _PR descriptions_, and _test cases_.

## Installation

```bash
npm install -g git-explain
```

## Quick Start

On first run, the setup wizard walks you through selecting a model:

```
$ git-explain

Welcome to Git Explain!
  ✓ Git detected
  ✓ Ollama detected

Select AI model:
  1. DeepSeek V4 Flash  (recommended)
  2. Qwen3-Coder
  3. GPT-5              (requires API key)
  4. Claude             (requires API key)
```

Offline models (DeepSeek V4 Flash, Qwen3-Coder) are downloaded automatically via Ollama.

## Usage

```bash
git-explain                    # Full analysis of working tree changes
git-explain --staged           # Staged changes
git-explain HEAD               # Last commit
git-explain HEAD~3             # Specific commit
git-explain abc1234            # Commit hash

git-explain -m                 # Commit message only
git-explain -r                 # Risk analysis only

git-explain --offline          # Force offline mode
git-explain --model qwen3-coder:latest
git-explain --setup            # Re-run setup wizard
```

## Output Sections

| Section | Description |
|---|---|
| Summary | 2-3 sentence overview |
| Why This Change Was Made | Motivation inferred from diff + repository context |
| Potential Regressions | Specific regressions with file references |
| Affected Modules | Directly and indirectly impacted modules |
| Suggested Commit Message | Conventional commit format |
| PR Description | 3-5 sentence PR summary |
| Test Cases | Specific test scenarios to cover |

## Configuration

Config is stored at `~/.git-explain/config.json`. Environment variables override at runtime:

| Variable | Used For |
|---|---|
| `OPENAI_API_KEY` | GPT-5 / OpenAI-compatible |
| `ANTHROPIC_API_KEY` | Claude |
| `OLLAMA_URL` | Custom Ollama endpoint (default: `http://localhost:11434`) |

## Requirements

- Node.js 18+
- Git
- Ollama (for offline models)

## License

Apache 2.0
