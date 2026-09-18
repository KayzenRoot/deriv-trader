# API Capability Matrix
| Capability | Current evidence | Auth | Project use |
|---|---|---|---|
| Active symbols | Official WebSocket API | No | instrument discovery |
| Live ticks | Official WebSocket API | No | live research feed |
| Tick history | Official WebSocket API | No | historical research |
| Price proposal | Official WebSocket API | No per endpoint docs | current contract economics |
| Buy contract | Official WebSocket API | Yes | demo later; real blocked |
| Sell contract | Official WebSocket API | Yes | demo lifecycle later |
| Open contract status | Official WebSocket API | Yes | reconciliation/monitoring |
| Options account setup | Official REST API | Yes | account/session setup |
| Demo WS | Official Options API | OTP | demo execution |
| Real WS | Official Options API | OTP | BLOCKED by project gate |

Evidence sources are recorded in docs/discovery/SOURCES.md. Capabilities must be contract-tested against the current API before implementation acceptance.