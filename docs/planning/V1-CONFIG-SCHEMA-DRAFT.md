# V1 Configuration Schema Draft

## user_profile
- user_id = Supabase Auth UUID
- role: USER | ADMIN
- timezone
- profile metadata

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

## local_worker_instance
- worker_id
- user_id
- installation_id
- device_label
- app_version
- runtime_state
- last_seen_at
- revoked_at

## execution_profile
- execution_profile_id
- user_id
- connection_id
- minimum_payout_percent
- fixed_stake
- max_stake
- max_simultaneous_orders
- max_orders_per_instrument
- max_open_exposure
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
- desired_state
- runtime_status
- strategy_version
- preset_version

Unique constraint: execution_profile_id + strategy_id + expiry_seconds.

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

## execution records
signals, orders, order_events, risk_events and audit_events all preserve user/Runner/connection attribution.

## SecretStore
secret_ref points to secure storage outside ordinary tables.

All configuration mutations are versioned/auditable. Secret material is excluded from audit payloads.
