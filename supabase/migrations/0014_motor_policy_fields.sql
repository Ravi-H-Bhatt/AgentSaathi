-- ============================================================
-- Add motor policy specific fields to policies table
-- ============================================================

-- Add motor-specific columns
alter table public.policies 
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text,
  add column if not exists registration_number text,
  add column if not exists year_of_registration int,
  add column if not exists cubic_capacity int;

-- Add comment for clarity
comment on column public.policies.vehicle_make is 'Make of vehicle for motor policies (e.g., Honda, Maruti)';
comment on column public.policies.vehicle_model is 'Model of vehicle for motor policies';
comment on column public.policies.registration_number is 'Vehicle registration number';
comment on column public.policies.year_of_registration is 'Year when vehicle was registered';
comment on column public.policies.cubic_capacity is 'Engine cubic capacity (cc) for two-wheelers';

-- Index for searching by registration number
create index if not exists policies_registration_idx on public.policies (registration_number) where registration_number is not null;
