-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

create table public.inventory_classifications (
  id serial not null,
  name character varying(100) not null,
  description text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint inventory_classifications_pkey primary key (id),
  constraint inventory_classifications_name_key unique (name)
) TABLESPACE pg_default;

create table public.inventory_items (
  id serial not null,
  generic_name character varying(255) not null,
  brand_name character varying(255) null,
  classification_id integer null,
  category character varying(100) null,
  department character varying(50) not null,
  stock_quantity integer not null default 0,
  unit_of_measurement character varying(50) null default 'pcs'::character varying,
  expiration_date date null,
  status character varying(50) not null default 'active'::character varying,
  notes text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  created_by integer null,
  updated_by integer null,
  code text null,
  constraint inventory_items_pkey primary key (id),
  constraint inventory_items_classification_id_fkey foreign KEY (classification_id) references inventory_classifications (id) on delete set null,
  constraint inventory_items_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint inventory_items_updated_by_fkey foreign KEY (updated_by) references users (id) on delete set null,
  constraint inventory_items_department_check check (
    (
      (department)::text = any (
        (
          array[
            'medical'::character varying,
            'dental'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint inventory_items_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'low_stock'::character varying,
            'out_of_stock'::character varying,
            'expired'::character varying,
            'maintenance'::character varying,
            'archived'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_inventory_items_department on public.inventory_items using btree (department) TABLESPACE pg_default;

create index IF not exists idx_inventory_items_classification_id on public.inventory_items using btree (classification_id) TABLESPACE pg_default;

create index IF not exists idx_inventory_items_category on public.inventory_items using btree (category) TABLESPACE pg_default;

create index IF not exists idx_inventory_items_generic_name on public.inventory_items using btree (generic_name) TABLESPACE pg_default;

create index IF not exists idx_inventory_items_brand_name on public.inventory_items using btree (brand_name) TABLESPACE pg_default;

create index IF not exists idx_inventory_items_status on public.inventory_items using btree (status) TABLESPACE pg_default;
create table public.user_activity (
  id serial not null,
  user_id integer null,
  action character varying(50) not null,
  category character varying(100) null,
  description text null,
  timestamp timestamp with time zone null default now(),
  severity character varying(20) null default 'info'::character varying,
  constraint user_activity_pkey primary key (id),
  constraint user_activity_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint user_activity_severity_check check (
    (
      (severity)::text = any (
        (
          array[
            'info'::character varying,
            'warning'::character varying,
            'error'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_user_activity_user_id on public.user_activity using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_user_activity_timestamp on public.user_activity using btree ("timestamp") TABLESPACE pg_default;

create index IF not exists idx_user_activity_action on public.user_activity using btree (action) TABLESPACE pg_default;

create table public.users (
  id serial not null,
  username character varying(50) not null,
  password character varying(255) not null,
  role character varying(20) null default 'admin'::character varying,
  first_name character varying(100) null,
  last_name character varying(100) null,
  phone character varying(20) null,
  department character varying(100) null,
  position character varying(100) null,
  employee_id character varying(50) null,
  license_number character varying(100) null,
  specialization text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  avatar_url text null,
  bio text null,
  gender character varying(20) null,
  emergency_contact_name character varying(255) null,
  emergency_contact_phone character varying(50) null,
  emergency_contact_relationship character varying(100) null,
  last_login timestamp with time zone null,
  login_count integer null default 0,
  password_hash text null,
  constraint users_pkey primary key (id),
  constraint users_employee_id_key unique (employee_id),
  constraint users_username_key unique (username),
  constraint users_role_check check (
    (
      (role)::text = any (
        (
          array[
            'admin'::character varying,
            'superadmin'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create trigger create_user_defaults_trigger
after INSERT on users for EACH row
execute FUNCTION create_user_defaults ();

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column ();