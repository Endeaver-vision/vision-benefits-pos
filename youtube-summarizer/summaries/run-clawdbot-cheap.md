# How to Run ClawdBot for DIRT CHEAP

**Video:** [How to run ClawdBot for DIRT CHEAP](https://www.youtube.com/watch?v=lxfakTpdz1Y)
**Category:** Cost Optimization

## Overview
This guide breaks down cost-saving strategies for each ClawdBot use case, comparing premium vs budget model options. Using the wrong models can cost thousands monthly.

## Cost Architecture: Brain vs Muscles
- **Brain:** The model you chat with (routing decisions)
- **Muscles:** Specialized models for specific tasks (coding, web search, etc.)

## Model Recommendations by Task

### 1. Brain (Primary Chat)
| Best | Budget Alternative |
|------|-------------------|
| Opus 4.5 | Kimmy K2.5 |
| $1000+/mo API | Near-free (promo deals available) |

**Savings:** Kimmy K2.5 has near-Opus personality and intelligence for a fraction of the cost.

### 2. Heartbeat (Background Checks)
| Default | Recommended |
|---------|-------------|
| Uses brain model | Switch to Haiku |
| $2/day (~$54/mo) | ~$0.01/day |

**Critical fix:** Change heartbeat from every 10 minutes to every hour unless you need frequent task checking.

### 3. Coding
| Best | Budget Alternative |
|------|-------------------|
| Codex GPT 5.2 Extra High | MiniMax 2.1 |
| $250/mo (Codex Pro) | ~$4/mo |

**Note:** ClawdBot uses CLI vibe coding - it controls coding tools for you.

### 4. Web Search/Crawling
| Best | Budget Alternative |
|------|-------------------|
| Opus 4.5 | DeepSeek V3 |
| Expensive | Very cheap |

**Savings:** Hundreds per month by switching web crawling to DeepSeek V3.

### 5. Content Writing
| Best | Budget Alternative |
|------|-------------------|
| Opus 4.5 | Kimmy K2.5 |
| Best personality | Near-Opus personality |

### 6. Voice Chat
| Recommended (Both) |
|--------------------|
| ChatGPT 4.0 Realtime API |
| Good performance, reasonable cost |

Use for Telegram voice notes and phone call integration.

### 7. Image Understanding
| Best | Budget Alternative |
|------|-------------------|
| Opus 4.5 | Gemini 2.5 Flash |
| Perfect accuracy | Very good, much cheaper |

## Quick Implementation
Just tell ClawdBot:
```
"Please use [MODEL] whenever you [TASK]. Use the CLI."
```
It will ask for API keys and configure itself.

## Cost Summary

| Configuration | Monthly Cost |
|---------------|--------------|
| All Opus | $1000+ |
| Optimized | ~$50-100 |
| Ultra-Budget | ~$10-20 |

## Top 3 Immediate Fixes
1. **Switch heartbeat to Haiku** - saves $50+/mo instantly
2. **Use Kimmy K2.5 for brain** - saves hundreds
3. **Use cheaper coding model** - saves $200+/mo on overnight coding

## Local Model Option
Running Kimmy K2.5 locally on Mac Studios = unlimited free tokens after hardware investment (~$20K for dual Mac Studios).
