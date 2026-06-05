# Wander — Database Schema

Hosted on Supabase (Postgres). Migrations are numbered sequentially in `/migrations`.

## Running migrations

Paste each file into Supabase SQL Editor in order, or use the Supabase CLI:
```bash
supabase db push
```

## Migration history

| File | Description |
|------|-------------|
| 001_users.sql | Users table — username + passphrase auth |