-- Add new policy fields for product name and address
-- This migration adds product_name and client_address columns to policies table

alter table public.policies add column if not exists product_name text;
alter table public.policies add column if not exists client_address text;

-- Create index for faster address lookups if needed
create index if not exists policies_address_idx on public.policies using gin(to_tsvector('english', client_address));

-- Add comment for clarity
comment on column public.policies.product_name is 'Product/Plan name like "New India Mediclaim Policy" or "Bharat Sookshma Udyam Suraksha"';
comment on column public.policies.client_address is 'Full address of the insured person';
