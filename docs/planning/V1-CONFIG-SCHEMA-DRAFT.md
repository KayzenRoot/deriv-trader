# V1 Configuration Schema Draft

## user_profile
- user_id = Supabase auth user UUID
- role: user | admin
- display/profile metadata

## deriv_connection
- connection_id
- user_id
- auth_method: PAT | OAUTH2
- deriv_app_id_optional
- selected_account_id
- selected_environment: DEMO | REAL
- secret_ref
- connection_status
- granted_scopes
- last_validated_at
- last_error_code
- created_at / updated_at

RLS: user can access only their own connection metadata.
Secret content is NOT stored in this table.

## execution_profile
- user_id
- connection_id
- minimum_payout_percent
- fixed_stake
- max_stake
- max_simultaneous_orders
- max_orders_per_instrument
- cooldown_seconds
- operating_windows
- allowlist / blocklist
- enabled

## strategy_runner
- runner_id
- execution_profile_id
- strategy_id
- expiry_seconds: [60,180,300]
- enabled
- runtime_status
- strategy_version
- preset_version

## risk_profile
- execution_profile_id
- daily_max_loss
- daily_profit_target_optional
- stop_on_daily_target
- max_consecutive_losses
- max_open_exposure
- max_orders_per_instrument
- cooldowns
- kill_switch
- pause_new_entries
- loss_cascade settings
- reset_boundary_timezone

## SecretStore
Maps secret_ref to encrypted/local-secret storage outside ordinary tables.

Every connection/config mutation is auditable, but secret material is excluded from audit payloads.
