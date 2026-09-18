# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Data architecture planning now includes:
- strict operational vs research data separation;
- local Parquet capture for high-frequency ticks/proposals/execution evidence;
- DuckDB analytical/query layer;
- Dataset Passport manifests;
- Data Quality Gate;
- retention/compaction/recovery policies;
- data test matrix;
- free-first protection against filling Supabase with raw market streams.

A planning runway now records the explicit user requirement to warn on the final planning response before the first development prompt.

No infrastructure provisioned, credentials handled or trading performed.
Pending: UX/admin/security/alerts final passes, architecture version freeze, acceptance consistency, Hive sequencing, final planning audit/PR/checkpoint.
