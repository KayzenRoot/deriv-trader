# V1 Cost Guardrails

## Objective
Keep recurring infrastructure spend at or near $0 during research/demo development.

## Budget policy
Target V1 development infrastructure: $0/month recurring where possible.
Any service that can generate automatic overage must be disabled, capped, or require an explicit governance decision before billing is enabled.

## Rules
1. Re-check pricing before creating any hosted resource.
2. Record plan, quota and billing behavior in deployment evidence.
3. Never add a credit card just to make a prototype work without explicit user approval.
4. Prefer hard free limits over silent pay-as-you-go.
5. Keep raw market data local to avoid cloud storage/egress growth.
6. Use one Supabase Free project for dev/demo initially; reserve the second only if required.
7. Vercel Hobby is preview/non-commercial only under current terms.
8. No external Redis until measurements justify it.
9. No paid observability in V1.
10. Keep a migration path so free-tier changes do not trap the product.

## Cost telemetry
Admin/System Health should eventually show:
- Supabase DB/storage usage;
- cloud egress where available;
- deployment plan;
- external service quotas;
- warning threshold before free limits.

## Trigger to revisit architecture
Re-evaluate hosting when any occurs:
- first paying customer;
- cloud DB approaches 70% of free quota;
- local worker must run 24/7 without user's PC;
- multiple users need isolated concurrent trading workers;
- free-tier terms change;
- reliability requirements exceed free-tier guarantees.
